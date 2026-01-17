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
      minFilter: THREE.NearestFilter, // Use Nearest for depth precision
      magFilter: THREE.NearestFilter,
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

    // 4. Manual Render to Screen (since we took over the loop with priority 1)
    state.gl.render(state.scene, state.camera);
  }, 1); // Priority 1: Run after animations, take over render loop to ensure sync

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
  // Remove unused _radiusScale to fix lint warning
  // We keep it in signature for API compatibility if needed, or just ignore it.
  // Using void to suppress unused warning for now as it might be used later.
  void _radiusScale;

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
    uRadius: 1.0,
    cameraNear: 0.1,
    cameraFar: 1000.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec4 vScreenPos;
    varying vec3 vViewPosition;
    
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec4 viewPos = viewMatrix * worldPosition;
      vViewPosition = viewPos.xyz;
      gl_Position = projectionMatrix * viewPos;
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
    uniform float uRadius;
    uniform float cameraNear;
    uniform float cameraFar;

    varying vec2 vUv;
    varying vec4 vScreenPos;
    varying vec3 vViewPosition;

    float calcDepth( const in float viewZ, const in float near, const in float far ) {
      return (( far + near ) / ( far - near ) * viewZ + 2.0 * far * near / ( far - near )) / viewZ * - 0.5 + 0.5;
    }

    void main() {
        // Screen UV (0 to 1)
        vec2 screenUV = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
        
        // Local UV centered (from 0..1 to -0.5..0.5)
        vec2 localDiff = vUv - 0.5;
        float dist = length(localDiff);
        
        // Circular mask
        if(dist > 0.5) discard;

        // Calculate sphere height (normalized 0..0.5)
        // z = sqrt(0.25 - x*x - y*y)
        float zHeight = sqrt(0.25 - dist * dist);
        
        // Calculate normal
        vec3 normal = normalize(vec3(localDiff.x, localDiff.y, zHeight));
        
        // Calculate corrected depth for sphere surface
        // zHeight is 0.5 at center, 0 at edge.
        // In view space, the sphere protrudes towards the camera by Radius.
        // UV space 1.0 = 2 * Radius. So zHeight=0.5 corresponds to Radius.
        // Physical offset = zHeight * 2.0 * uRadius
        float viewSpaceOffset = zHeight * 2.0 * uRadius;
        
        // Adjust view Z (closer to camera = larger Z value in negative view space? No, viewZ is negative.)
        // Closer to camera means z is LESS negative (closer to 0).
        // So we ADD the positive offset.
        float adjustedViewZ = vViewPosition.z + viewSpaceOffset;
        
        // Calculate depth for the sphere surface
        float currentDepthVal = calcDepth(adjustedViewZ, cameraNear, cameraFar);
        
        // Refraction vector (simple offset based on XY normal)
        vec2 n = normal.xy;
        
        // Strength
        vec2 offset = n * uRefractionStrength * uOpacity;
        
        // Apply refraction
        vec2 refractedUV = screenUV + offset;
        
        // Depth Check: Only refract things BEHIND the bubble
        // Read raw depth values (0.0 = Near, 1.0 = Far)
        float sceneDepthVal = texture2D(tDepth, refractedUV).x;
        // float currentDepthVal = gl_FragCoord.z; // Replaced by calculated sphere depth
        
        // If scene depth is LARGER (further) than current depth, it is behind.
        // We add a small tolerance to prevent self-intersection artifacts if depths are close
        float alpha = uOpacity;
        
        // Depth test with larger bias to aggressively cull foreground artifacts
        // 0.0001 might be too small for depth buffer precision at distance
        if (sceneDepthVal < currentDepthVal + 0.001) {
             // Scene is CLOSER (smaller value) -> Foreground object captured in FBO.
             // Try to sample "unrefracted" background?
             // If we use screenUV, we sample the object itself (bad).
             // Ideally we want to see what's BEHIND the foreground object.
             // But we only have one layer.
             // So transparency is the correct physical approximation (we see the foreground object via main pass).
             refractedUV = screenUV; 
             alpha = 0.0;
        }

        // Blur (4-tap)
        vec3 col = vec3(0.0);
        float scale = 0.001 * uBlurScale;
        
        // Only sample if alpha > 0 to save performance and avoid artifacts
        if (alpha > 0.01) {
            col += texture2D(tDiffuse, refractedUV + vec2( 1.0,  0.0) * scale).rgb;
            col += texture2D(tDiffuse, refractedUV + vec2(-1.0,  0.0) * scale).rgb;
            col += texture2D(tDiffuse, refractedUV + vec2( 0.0,  1.0) * scale).rgb;
            col += texture2D(tDiffuse, refractedUV + vec2( 0.0, -1.0) * scale).rgb;
            col *= 0.25;
        }

        // Add Fresnel/Rim effect to make it visible against flat backgrounds
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);
        col = mix(col, vec3(1.0), fresnel * 0.3); // Add white rim
        
        // If alpha was killed by depth check, we can still show the rim?
        // NO: If we culled the body because it's "foreground artifact", showing the rim
        // creates a "weird gapped border" ghost. We should cull the rim too.
        float finalAlpha = max(alpha, fresnel * uOpacity);
        
        if (alpha < 0.01) {
            finalAlpha = 0.0;
        }
        
        gl_FragColor = vec4(col, finalAlpha);
    }
  `
);

extend({ RefractionShaderMaterialImpl });

interface RefractiveBubbleMaterialProps {
  uOpacity?: number;
  uRefractionStrength?: number;
  uBlurScale?: number;
  uRadius?: number;
  uColor?: string;
  [key: string]: unknown;
}

export const RefractiveBubbleMaterial = (
  props: RefractiveBubbleMaterialProps
) => {
  const context = useContext(RefractionContext);
  const { camera } = useThree();

  if (!context || !context.isEnabled || !context.texture)
    return (
      <meshBasicMaterial
        transparent
        opacity={1.0}
        color={props.uColor || 'white'}
      />
    );

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
