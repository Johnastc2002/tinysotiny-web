import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Extend Three.js with PostProcessing classes
extend({ EffectComposer, RenderPass, ShaderPass });

const MAX_BUBBLES = 20;

const BubbleRefractionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uCenters: { value: new Array(MAX_BUBBLES * 2).fill(0) }, // vec2 array flattened
    uRadii: { value: new Array(MAX_BUBBLES).fill(0) },
    uCount: { value: 0 },
    uRefractionStrength: { value: 0.02 },
    uBlurScale: { value: 4.0 },
    uEdgeSoftness: { value: 0.0 }, // Hard edge to confirm exact alignment
    uOpacity: { value: 1.0 },
    uResolution: { value: new THREE.Vector2(1, 1) }, // Screen aspect ratio correction
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uCenters[${MAX_BUBBLES * 2}]; // Flattened vec2 array
    uniform float uRadii[${MAX_BUBBLES}];
    uniform int uCount;
    uniform float uRefractionStrength;
    uniform float uBlurScale;
    uniform float uEdgeSoftness;
    uniform float uOpacity;
    uniform vec2 uResolution; // Screen resolution or aspect fix

    varying vec2 vUv;

    void main() {
      // Revert Y flip - the flipping issue was due to object orientation
      vec4 base = texture2D(tDiffuse, vUv);
      
      vec2 totalOffset = vec2(0.0);
      float totalMask = 0.0;
      
      for(int i = 0; i < ${MAX_BUBBLES}; i++) {
        if(i >= uCount) break;
        
        vec2 center = vec2(uCenters[i * 2], uCenters[i * 2 + 1]);
        float radius = uRadii[i];
        
        vec2 uvDiff = vUv - center;
        uvDiff.x *= uResolution.x / uResolution.y; // Assume landscape
        float dist = length(uvDiff);

        // Soft edge to align with bubble geometry feathering
        // float m = smoothstep(radius, radius - uEdgeSoftness * radius, dist);
        // Hard edge for now to match geometry
        float m = 1.0 - step(radius, dist);
        
        if (m > 0.0) {
          // Radial normal
          vec2 n = normalize(vUv - center);
          
          // Refraction
          totalOffset += n * uRefractionStrength * m;
          totalMask = max(totalMask, m);
        }
      }

      if (totalMask <= 0.001) {
        gl_FragColor = base;
        return;
      }

      vec2 refractedUv = vUv + totalOffset;
      
      // Simple 4-tap blur
      vec3 acc = vec3(0.0);
      float scale = 0.001 * uBlurScale;
      
      acc += texture2D(tDiffuse, refractedUv + vec2( 1.0,  0.0) * scale).rgb;
      acc += texture2D(tDiffuse, refractedUv + vec2(-1.0,  0.0) * scale).rgb;
      acc += texture2D(tDiffuse, refractedUv + vec2( 0.0,  1.0) * scale).rgb;
      acc += texture2D(tDiffuse, refractedUv + vec2( 0.0, -1.0) * scale).rgb;
      acc *= 0.25;

      gl_FragColor = vec4(mix(base.rgb, acc, totalMask), uOpacity);
    }
  `,
};

// Context to manage bubbles
interface RefractionContextType {
  registerBubble: (
    id: string,
    ref: React.RefObject<THREE.Object3D | null>,
    radiusScale?: number
  ) => void;
  unregisterBubble: (id: string) => void;
  isEnabled: boolean;
}

const RefractionContext = createContext<RefractionContextType | null>(null);

export const BubbleRefractionProvider = ({
  children,
  enabled = false,
}: {
  children: React.ReactNode;
  enabled?: boolean;
}) => {
  const bubblesRef = useRef<
    Map<
      string,
      { ref: React.RefObject<THREE.Object3D | null>; radiusScale: number }
    >
  >(new Map());

  const registerBubble = (
    id: string,
    ref: React.RefObject<THREE.Object3D | null>,
    radiusScale: number = 1.0
  ) => {
    bubblesRef.current.set(id, { ref, radiusScale });
  };

  const unregisterBubble = (id: string) => {
    bubblesRef.current.delete(id);
  };

  return (
    <RefractionContext.Provider
      value={{ registerBubble, unregisterBubble, isEnabled: enabled }}
    >
      {children}
      {enabled && <RefractionEffect bubblesRef={bubblesRef} />}
    </RefractionContext.Provider>
  );
};

export const useBubbleRefraction = (
  id: string,
  ref: React.RefObject<THREE.Object3D | null>,
  condition: boolean = true,
  radiusScale: number = 1.0
) => {
  const context = useContext(RefractionContext);

  useEffect(() => {
    if (context && context.isEnabled && condition && ref.current) {
      context.registerBubble(id, ref, radiusScale);
      return () => context.unregisterBubble(id);
    }
  }, [context, id, ref, condition, radiusScale]);

  return (context?.isEnabled && condition) || false;
};

const RefractionEffect = ({
  bubblesRef,
}: {
  bubblesRef: React.MutableRefObject<
    Map<
      string,
      { ref: React.RefObject<THREE.Object3D | null>; radiusScale: number }
    >
  >;
}) => {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer>(null);
  const shaderPass = useRef<ShaderPass>(null);
  const camDir = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const effectComposer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    effectComposer.addPass(renderPass);

    const pass = new ShaderPass(BubbleRefractionShader);
    pass.uniforms.uResolution.value.set(size.width, size.height);
    effectComposer.addPass(pass);
    shaderPass.current = pass;
    composer.current = effectComposer;

    return () => {
      // Cleanup?
    };
  }, [gl, scene, camera, size]);

  useFrame(() => {
    if (!composer.current || !shaderPass.current) return;

    // Update uniforms
    const bubbles = Array.from(bubblesRef.current.values());
    const count = Math.min(bubbles.length, MAX_BUBBLES);

    // Arrays for uniforms
    const centers: number[] = [];
    const radii: number[] = [];

    let activeCount = 0;

    camera.getWorldDirection(camDir);

    for (let i = 0; i < count; i++) {
      const { ref, radiusScale } = bubbles[i];
      const obj = ref.current;
      if (!obj) continue;

      // Get world and screen position
      const worldPos = new THREE.Vector3().setFromMatrixPosition(
        obj.matrixWorld
      );
      const pos = worldPos.clone().project(camera); // NDC -1 to 1

      // Convert to 0-1 UV space
      const uvX = pos.x * 0.5 + 0.5;
      const uvY = pos.y * 0.5 + 0.5;

      // Check if visible roughly (with some margin)
      // if (uvX < -0.2 || uvX > 1.2 || uvY < -0.2 || uvY > 1.2) continue;

      centers.push(uvX, uvY);

      // Get Screen Space Radius by projecting the top edge of the bubble
      // This automatically handles FOV, distance, and perspective scaling (Z-depth)

      // 1. Get World Radius
      let geometryRadius = 1;
      if (obj instanceof THREE.Mesh && obj.geometry) {
        if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
        if (obj.geometry.boundingSphere) {
          geometryRadius = obj.geometry.boundingSphere.radius;
        }
      }
      const worldScale = obj.getWorldScale(new THREE.Vector3()).x;
      const worldRadius = geometryRadius * worldScale * radiusScale;

      // 2. Calculate top edge position in world space
      // Use camera's local Y axis (perpendicular to view direction) to ensure we measure radius in the view plane.
      // Using camera.up (world up) causes depth mismatch when looking down/up, as the point moves in Z.
      const camUp = new THREE.Vector3().setFromMatrixColumn(
        camera.matrixWorld,
        1
      );
      const topWorldPos = worldPos
        .clone()
        .add(camUp.multiplyScalar(worldRadius));

      // 3. Project top edge to NDC
      const topScreenPos = topWorldPos.project(camera);

      // 4. Calculate radius in UV space
      // NDC Y range is [-1, 1] (size 2), UV Y range is [0, 1] (size 1)
      // Radius in NDC = abs(top - center)
      // Radius in UV = RadiusNDC / 2
      const radiusNDC = Math.abs(topScreenPos.y - pos.y);
      const rUV = radiusNDC * 0.5;

      radii.push(rUV);

      activeCount++;
    }

    // Fill rest with 0
    for (let i = activeCount; i < MAX_BUBBLES; i++) {
      centers.push(0, 0);
      radii.push(0);
    }

    shaderPass.current.uniforms.uCount.value = activeCount;
    shaderPass.current.uniforms.uCenters.value = centers;
    shaderPass.current.uniforms.uRadii.value = radii;

    // Render
    composer.current.render();
  }, 1); // Render priority 1 to override default? Or just run.

  // We need to disable default render loop of R3F?
  // R3F renders automatically.
  // To takeover, we can use `useFrame((state) => { ... }, 1)` and `gl.autoClear = false` inside?
  // Actually, standard pattern for effects in R3F is to disable default render loop or use `renderPriority`.
  // If we return null from useFrame it doesn't stop default render.

  // `useFrame` with priority > 0 runs after default render?
  // No, R3F render loop:
  // 1. Run all useFrame callbacks sorted by priority.
  // 2. If no one called `state.gl.render`, R3F does it?
  // Actually R3F documentation says: "If you have a loop that renders, you need to take control."
  // Usually by `state.gl.autoClear = false` and rendering yourself?
  // Or `useFrame(({ gl, scene, camera }) => { gl.render(scene, camera) }, 1)`

  // A cleaner way is:
  useEffect(() => {
    // Disable R3F auto render
    // set({ frameloop: 'never' })? No, we need loop.
    // R3F 8+: we can just render in useFrame and it overrides?
    // Let's try useFrame with priority 1.
  }, []);

  return null;
};
