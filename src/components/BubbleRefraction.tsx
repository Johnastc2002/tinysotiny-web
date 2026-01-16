import React, { createContext, useContext, useEffect, useRef } from 'react';
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
    uEdgeSoftness: { value: 0.2 },
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
      vec4 base = texture2D(tDiffuse, vUv);
      
      vec2 totalOffset = vec2(0.0);
      float totalMask = 0.0;
      
      for(int i = 0; i < ${MAX_BUBBLES}; i++) {
        if(i >= uCount) break;
        
        vec2 center = vec2(uCenters[i * 2], uCenters[i * 2 + 1]);
        float radius = uRadii[i];
        
        // Correct distance for aspect ratio if needed, but assuming UV space implies stretched circles if aspect not handled.
        // To keep circles circular, we should adjust UVs by aspect.
        // But for screen space effect, maybe just using simple distance is enough if we correct input radius?
        // Let's assume uRadii are in UV space (normalized).
        
        // Distance in UV space
        // Aspect ratio correction:
        vec2 uvDiff = vUv - center;
        uvDiff.x *= uResolution.x / uResolution.y; // Assume landscape
        float dist = length(uvDiff);

        // Adjust radius for aspect too? 
        // If we adjust distance, we compare against "circular" radius in adjusted space.
        
        // Let's keep it simple: assume radius is proportional to vertical size (UV.y)
        
        float m = smoothstep(radius, radius - uEdgeSoftness * radius, dist);
        
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
    ref: React.RefObject<THREE.Object3D | null>
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
    Map<string, React.RefObject<THREE.Object3D | null>>
  >(new Map());

  const registerBubble = (
    id: string,
    ref: React.RefObject<THREE.Object3D | null>
  ) => {
    bubblesRef.current.set(id, ref);
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
  condition: boolean = true
) => {
  const context = useContext(RefractionContext);

  useEffect(() => {
    if (context && context.isEnabled && condition && ref.current) {
      context.registerBubble(id, ref);
      return () => context.unregisterBubble(id);
    }
  }, [context, id, ref, condition]);

  return (context?.isEnabled && condition) || false;
};

const RefractionEffect = ({
  bubblesRef,
}: {
  bubblesRef: React.MutableRefObject<
    Map<string, React.RefObject<THREE.Object3D | null>>
  >;
}) => {
  const { gl, scene, camera, size } = useThree();
  const composer = useRef<EffectComposer>(null);
  const shaderPass = useRef<ShaderPass>(null);

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

    for (let i = 0; i < count; i++) {
      const obj = bubbles[i].current;
      if (!obj) continue;

      // Get screen position
      const pos = new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld);
      pos.project(camera); // -1 to 1

      // Convert to 0-1 UV space
      const uvX = pos.x * 0.5 + 0.5;
      const uvY = pos.y * 0.5 + 0.5;

      // Check if visible roughly (with some margin)
      // if (uvX < -0.2 || uvX > 1.2 || uvY < -0.2 || uvY > 1.2) continue;

      centers.push(uvX, uvY);

      // Get Screen Space Radius
      // A simple approximation: project a point on the edge of the sphere
      // Or using scale and distance
      // Perspective scaling: scale / distance

      // Let's take the object's scale. Assuming uniform scale for sphere.
      // The scale of the object in world units:
      // const worldScale = obj.getWorldScale(new THREE.Vector3()).x; // Assume uniform

      // Project a point `worldScale` units up from center in view space
      // Alternative: Approximate radius in clip space = radius / -viewZ * projectionMatrix[0][0] or something.

      // Simpler:
      const dist = camera.position.distanceTo(
        new THREE.Vector3().setFromMatrixPosition(obj.matrixWorld)
      );
      // Tan(FOV/2) helps relate world size to screen size

      // Need to account for FOV
      // visible height at distance d = 2 * d * tan(fov/2)
      // radiusFraction = worldRadius / visibleHeight
      // radiusUV = radiusFraction (since UV is 0-1)

      // Assuming PerspectiveCamera
      if ((camera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        const pCam = camera as THREE.PerspectiveCamera;
        const fovRad = THREE.MathUtils.degToRad(pCam.fov);
        const visibleHeight = 2 * dist * Math.tan(fovRad / 2);
        // UV space radius (vertical fraction)
        // bubble radius is worldScale (if geometry is radius 1, but geometry is usually diam 1? check BubbleScene)
        // CircleGeometry args[0] is radius.
        // In BubbleScene: <circleGeometry args={[scale, 32]} /> -> So scale IS radius.
        // Wait, `scale` passed to geometry is the radius.
        // And `scale` prop passed to mesh is 1.0 usually?
        // No, `Bubble` component receives `scale`.
        // `ColorBubble` receives `scale`.
        // It renders `<circleGeometry args={[scale, 32]} />`.
        // So the world radius is `scale * obj.scale`.
        // In `ColorBubble`, mesh is `<mesh ... scale={1} ...><circleGeometry args={[scale]} ...>`
        // But the `group` above `ColorBubble` has no scale prop?
        // Ah, `Bubble` renders `<group ...><ColorBubble ... scale={adjustedScale} ...>`
        // So the geometry radius is `adjustedScale`.
        // The mesh itself has scale 1.
        // So world radius is `adjustedScale` (if parent groups don't scale).

        // BUT `useBubbleRefraction` is passed a ref to the mesh.
        // We need to know the logical radius.
        // The mesh bounding sphere?

        // Let's assume the ref is to the mesh with geometry.
        // We can get bounding sphere.
        if (obj instanceof THREE.Mesh && obj.geometry) {
          if (!obj.geometry.boundingSphere)
            obj.geometry.computeBoundingSphere();
          const sphere = obj.geometry.boundingSphere;
          const worldRadius = sphere
            ? sphere.radius * obj.getWorldScale(new THREE.Vector3()).x
            : 1;

          const rUV = worldRadius / visibleHeight;
          radii.push(rUV);
        } else {
          radii.push(0.05); // Fallback
        }
      } else {
        radii.push(0.05); // Orthographic fallback
      }

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
