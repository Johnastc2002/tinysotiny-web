import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useLayoutEffect,
} from 'react';
import { useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';

interface RefractionContextType {
  texture: THREE.Texture | null;
  depthTexture: THREE.DepthTexture | null;
  resolution: THREE.Vector2;
  registerBubble: (obj: THREE.Object3D) => void;
  unregisterBubble: (obj: THREE.Object3D) => void;
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
  const { size, gl } = useThree();

  // Use a ref for the bubbles set to avoid re-renders on mutation
  const bubblesRef = useRef<Set<THREE.Object3D>>(new Set());

  // Create FBO with depth texture
  const fbo = useMemo(() => {
    const pixelRatio = gl.getPixelRatio();
    const width = Math.floor(size.width * pixelRatio);
    const height = Math.floor(size.height * pixelRatio);

    const target = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(width, height),
      stencilBuffer: false,
    });
    return target;
  }, [size, gl]);

  // Handle resize
  useEffect(() => {
    const pixelRatio = gl.getPixelRatio();
    fbo.setSize(
      Math.floor(size.width * pixelRatio),
      Math.floor(size.height * pixelRatio)
    );
  }, [size, gl, fbo]);

  const registerBubble = (obj: THREE.Object3D) => {
    bubblesRef.current.add(obj);
  };

  const unregisterBubble = (obj: THREE.Object3D) => {
    bubblesRef.current.delete(obj);
  };

  useFrame((state) => {
    if (!enabled) return;

    // 1. Hide refractive bubbles
    const hiddenBubbles: THREE.Object3D[] = [];
    bubblesRef.current.forEach((b) => {
      if (b.visible) {
        b.visible = false;
        hiddenBubbles.push(b);
      }
    });

    // 2. Render scene to FBO
    const currentRenderTarget = state.gl.getRenderTarget();

    // Save clear settings
    const oldClearColor = new THREE.Color();
    state.gl.getClearColor(oldClearColor);

    state.gl.setRenderTarget(fbo);
    state.gl.clear();
    state.gl.render(state.scene, state.camera);

    // 3. Restore
    state.gl.setRenderTarget(currentRenderTarget);

    hiddenBubbles.forEach((b) => {
      b.visible = true;
    });
  });

  const resolution = useMemo(
    () => new THREE.Vector2(size.width, size.height),
    [size]
  );

  return (
    <RefractionContext.Provider
      value={{
        texture: fbo.texture,
        depthTexture: fbo.depthTexture,
        resolution,
        registerBubble,
        unregisterBubble,
        isEnabled: enabled,
      }}
    >
      {children}
    </RefractionContext.Provider>
  );
};

// Hook to register bubble (for hiding during FBO render)
export const useBubbleRefraction = (
  id: string,
  ref: React.RefObject<THREE.Object3D | null>,
  _radiusScale: number = 1.0,
  isRefractive: boolean = false,
  enabled: boolean = true
) => {
  const context = useContext(RefractionContext);

  useLayoutEffect(() => {
    // In React 18 / R3F, ref.current should be populated by the time this effect runs
    const currentRef = ref.current;

    if (context && context.isEnabled && enabled && isRefractive && currentRef) {
      context.registerBubble(currentRef);
      return () => context.unregisterBubble(currentRef);
    }
  }, [context, enabled, isRefractive, ref]);

  return context?.isEnabled && enabled;
};

// Shader implementation
const RefractionShaderMaterialImpl = shaderMaterial(
  {
    tDiffuse: null,
    tDepth: null,
    uResolution: new THREE.Vector2(),
    uRefractionStrength: 0.02,
    uBlurScale: 4.0,
    uOpacity: 1.0,
    cameraNear: 0.1,
    cameraFar: 1000.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec4 vScreenPos;
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
      vScreenPos = gl_Position;
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform vec2 uResolution;
    uniform float uRefractionStrength;
    uniform float uBlurScale;
    uniform float uOpacity;
    uniform float cameraNear;
    uniform float cameraFar;

    varying vec2 vUv;
    varying vec4 vScreenPos;

    #include <packing>

    void main() {
        // Screen UV (0 to 1)
        vec2 screenUV = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
        
        // Local UV centered (from 0..1 to -0.5..0.5)
        vec2 localDiff = vUv - 0.5;
        float dist = length(localDiff);
        
        // Circular mask
        if(dist > 0.5) discard;

        // Force visible color for debugging shader execution
        // gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); // Magenta
        // return;

        // Calculate simple normal for sphere
        // z = sqrt(0.25 - x*x - y*y) / 0.5 (normalized)
        float z = sqrt(0.25 - dist * dist);
        vec3 normal = normalize(vec3(localDiff.x, localDiff.y, z));
        
        // Refraction vector (simple offset based on XY normal)
        vec2 n = normal.xy;
        
        // Strength
        vec2 offset = n * uRefractionStrength * uOpacity;
        
        // Apply refraction
        vec2 refractedUV = screenUV + offset;
        
        // Depth Check: Only refract things BEHIND the bubble
        // 1. Get depth at refracted UV from the depth texture (which contains scene depth excluding this bubble)
        float sceneDepthVal = texture2D(tDepth, refractedUV).x;
        float sceneDepth = perspectiveDepthToViewZ(sceneDepthVal, cameraNear, cameraFar); // View space Z (negative)
        
        // 2. Get this fragment's depth (linearized)
        // gl_FragCoord.z is in [0, 1] (non-linear).
        float currentDepthVal = gl_FragCoord.z;
        float currentDepth = perspectiveDepthToViewZ(currentDepthVal, cameraNear, cameraFar); // View space Z (negative)
        
        // Note: ViewZ is negative. Closer objects have larger (less negative) Z.
        // If sceneDepth > currentDepth, scene object is CLOSER to camera than bubble front face.
        // We should NOT refract it (it's in front).
        
        // However, we hid this bubble during FBO capture, so tDepth contains everything ELSE.
        // If there's an object in front, it will be in tDepth.
        
        bool isBehind = sceneDepth < currentDepth; // scene is further away (more negative)
        
        // If the object at refracted UV is in front of the bubble, use original UV (no refraction)
        // or effectively "don't refract foreground".
        // Actually, if it's in front, we shouldn't see the refraction of it? 
        // Correct. The bubble is behind it. 
        // BUT wait, standard depth test handles occlusion if the object is opaque.
        // If the object is transparent, we might see it.
        
        // The issue is "refracting the thing behind it".
        // Our FBO captures everything visible.
        // If an object is BEHIND the bubble, we want to refract it.
        // If an object is IN FRONT, standard Z-buffer occlusion (handled by WebGL) prevents us from drawing over it,
        // UNLESS we are transparent and disable depth write?
        
        // If we are transparent/refractive, we usually draw LAST.
        // If there is an opaque object in front, the depth test fails and we don't draw. Good.
        // If there is an opaque object BEHIND, we draw over it.
        
        // The problem: "refraction only refracts the thing behind it".
        // This is what it DOES now (by definition of drawing over background).
        // Maybe the user means: "It is currently refracting things in front, and I want it to ONLY refract behind"?
        // Or "I want to ensure it DOES refract behind".
        
        // If the user means "I see foreground objects being refracted", that's because our FBO captured them.
        // Yes! The FBO captures the WHOLE scene (except this bubble).
        // If there is a bubble in front of this one, it was captured in the FBO.
        // And now we are refracting its image, which looks wrong because it's physically in front.
        
        if (!isBehind) {
             // The object at this pixel is physically closer than the bubble surface.
             // We are sampling a foreground object.
             // We should not refract it. 
             // We should sample the background behind IT? We can't, single layer FBO.
             // Fallback: Don't offset UV.
             refractedUV = screenUV; 
        }

        // Blur (4-tap)
        vec3 col = vec3(0.0);
        float scale = 0.001 * uBlurScale;
        
        col += texture2D(tDiffuse, refractedUV + vec2( 1.0,  0.0) * scale).rgb;
        col += texture2D(tDiffuse, refractedUV + vec2(-1.0,  0.0) * scale).rgb;
        col += texture2D(tDiffuse, refractedUV + vec2( 0.0,  1.0) * scale).rgb;
        col += texture2D(tDiffuse, refractedUV + vec2( 0.0, -1.0) * scale).rgb;
        col *= 0.25;

        // Add Fresnel/Rim effect to make it visible against flat backgrounds
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);
        col = mix(col, vec3(1.0), fresnel * 0.3); // Add white rim
        
        gl_FragColor = vec4(col, 1.0); // Force Alpha 1.0
    }
  `
);

extend({ RefractionShaderMaterialImpl });

interface RefractiveBubbleMaterialProps {
  uOpacity?: number;
  uRefractionStrength?: number;
  uBlurScale?: number;
  [key: string]: unknown;
}

export const RefractiveBubbleMaterial = (
  props: RefractiveBubbleMaterialProps
) => {
  const context = useContext(RefractionContext);
  const { camera } = useThree();

  if (!context || !context.isEnabled || !context.texture)
    return <meshBasicMaterial transparent opacity={0.5} />;

  return (
    // @ts-expect-error - Custom shader material extended in R3F
    <refractionShaderMaterialImpl
      key={RefractionShaderMaterialImpl.key}
      tDiffuse={context.texture}
      tDepth={context.depthTexture}
      uResolution={context.resolution}
      cameraNear={camera.near}
      cameraFar={camera.far}
      transparent
      {...props}
    />
  );
};
