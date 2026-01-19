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
      minFilter: THREE.LinearMipmapLinearFilter, // Use Mipmaps for smoother blur sampling
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType, // Use HalfFloat for better precision with dark colors/linear blending
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(width, height),
      stencilBuffer: false,
      generateMipmaps: true, // Auto-generate mipmaps every frame
    });
    // Ensure depth texture uses NearestFilter to avoid WebGL errors (Linear depth is often not supported)
    if (target.depthTexture) {
      target.depthTexture.type = THREE.UnsignedIntType; 
      target.depthTexture.minFilter = THREE.NearestFilter; 
      target.depthTexture.magFilter = THREE.NearestFilter; 
    }

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
    () => new THREE.Vector2(size.width * gl.getPixelRatio(), size.height * gl.getPixelRatio()),
    [size, gl]
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
    uBlurScale: 2.0,
    uOpacity: 1.0,
    uRadius: 1.0,
    uColor: new THREE.Color('white'),
    cameraNear: 0.1,
    cameraFar: 1000.0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec4 vScreenPos;
    varying vec3 vViewPosition;
    varying vec4 vProjZ;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec4 viewPos = viewMatrix * worldPosition;
      vViewPosition = viewPos.xyz;
      gl_Position = projectionMatrix * viewPos;
      vScreenPos = gl_Position;
      
      // Store Projection Matrix elements for correct depth calculation in Fragment Shader
      // Row 2 (Clip Z) and Row 3 (Clip W) coefficients for View Z and W(1.0)
      // m[col][row]
      vProjZ = vec4(projectionMatrix[2][2], projectionMatrix[3][2], projectionMatrix[2][3], projectionMatrix[3][3]);
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
    uniform vec3 uColor;
    uniform float cameraNear;
    uniform float cameraFar;

    varying vec2 vUv;
    varying vec4 vScreenPos;
    varying vec3 vViewPosition;
    varying vec4 vProjZ;

    // Manual implementation since we might not have the include
    float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
      return ( near * far ) / ( ( far - near ) * invClipZ - far );
    }

    // Manual Bilinear Filtering for Depth to smooth out intersection aliasing
    float getSmoothDepth(sampler2D depthSampler, vec2 uv, vec2 resolution) {
        vec2 texelSize = 1.0 / resolution;
        vec2 pixel = uv * resolution - 0.5;
        vec2 f = fract(pixel);
        
        // Snap to center of nearest texel
        vec2 uv00 = (floor(pixel) + 0.5) * texelSize;
        
        float d00 = texture2D(depthSampler, uv00).x;
        float d10 = texture2D(depthSampler, uv00 + vec2(texelSize.x, 0.0)).x;
        float d01 = texture2D(depthSampler, uv00 + vec2(0.0, texelSize.y)).x;
        float d11 = texture2D(depthSampler, uv00 + texelSize).x;
        
        // Bilinear mix of raw depth values
        float d0 = mix(d00, d10, f.x);
        float d1 = mix(d01, d11, f.x);
        
        return mix(d0, d1, f.y);
    }
    
    void main() {
        // Screen UV (0 to 1)
        vec2 screenUV = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
        
        // Local UV centered
        vec2 localDiff = vUv - 0.5;
        float dist = length(localDiff);
        
        // Circular mask
        if(dist > 0.5) discard;

        // Calculate sphere height for normal/refraction
        float zHeight = sqrt(0.25 - dist * dist);
        vec3 normal = normalize(vec3(localDiff.x, localDiff.y, zHeight));
        vec2 n = normal.xy;
        
        // Calculate depths
        float currentDepthRaw = gl_FragCoord.z;
        float currentLinearDist = -perspectiveDepthToViewZ(currentDepthRaw, cameraNear, cameraFar);

        // --- SOFT PARTICLE FADE ---
        // Get scene depth at current fragment position
        float closestSceneDepthRaw = getSmoothDepth(tDepth, screenUV, uResolution);
        float closestSceneLinearDist = -perspectiveDepthToViewZ(closestSceneDepthRaw, cameraNear, cameraFar);
        
        // Compare depths
        // If scene is behind bubble (closestSceneLinearDist > currentLinearDist), depthDiff > 0.
        // If scene is closer (intersecting), depthDiff approaches 0.
        float depthDiff = closestSceneLinearDist - currentLinearDist;
        
        // Soft fade factor: 0.0 at intersection, 1.0 when bubble is > 1.0 unit in front of background
        float alphaFade = smoothstep(0.0, 1.0, depthDiff);

        // --- REFRACTION ---
        // Strength dampened by alphaFade to avoid edge glitch
        vec2 offset = n * uRefractionStrength * uOpacity * alphaFade;
        vec2 refractedUV = screenUV + offset;
        
        // --- BLUR LOGIC ---
        // Initialize with direct sample
        vec3 col = texture2D(tDiffuse, refractedUV).rgb;
        float blurStrength = 0.002 * uBlurScale; 
        
        if (uOpacity > 0.01) {
            col = vec3(0.0);
            float totalWeight = 0.0;
            vec3 centerCol = texture2D(tDiffuse, refractedUV, 1.5).rgb;
            
            for(int i = 0; i < 16; i++) { // 16 samples for performance
                float theta = 2.39996 * float(i);
                float r = sqrt(float(i) / 16.0);
                float weight = exp(-0.5 * r * r);
                vec2 sampleOffset = vec2(cos(theta), sin(theta)) * r;
                vec2 sampleUV = refractedUV + sampleOffset * blurStrength;
                
                // Simple check to avoid bleeding foreground objects into blur
                // (Optional, but keeps edges cleaner)
                float sampleDepthRaw = texture2D(tDepth, sampleUV).x;
                float sampleLinearDist = -perspectiveDepthToViewZ(sampleDepthRaw, cameraNear, cameraFar);
                
                // If sample is significantly in front of bubble, ignore it (use center)
                if (sampleLinearDist < currentLinearDist - 0.5) {
                     col += centerCol * weight;
                } else {
                     col += texture2D(tDiffuse, sampleUV, 1.5).rgb * weight;
                }
                totalWeight += weight;
            }
            col /= totalWeight;
        }
        
        // Apply Fog / Tint
        float centerOpacity = 1.0;
        float edgeOpacity = 0.1;
        float overallOpacity = 0.3;
        
        float normalizedDist = dist * 2.0;
        float radialFactor = mix(centerOpacity, edgeOpacity, normalizedDist);
        float fogFactor = radialFactor * overallOpacity;
        
        vec3 tintColor = vec3(15.0/255.0, 35.0/255.0, 65.0/255.0); // #0F2341
        
        col = mix(col, tintColor, fogFactor);

        // Add Fresnel/Rim effect
        vec3 viewDir = vec3(0.0, 0.0, 1.0);
        float fresnel = pow(1.0 - dot(normal, viewDir), 3.0);
        
        // Apply occlusion fade to rim too
        float rim = fresnel * 0.3 * alphaFade;
        
        col = mix(col, vec3(1.0), rim);
        
        // Final Alpha
        float finalAlpha = max(uOpacity * alphaFade, rim * uOpacity);
        
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

export const RefractiveBubbleMaterial = ({
  uColor,
  ...props
}: RefractiveBubbleMaterialProps) => {
  const context = useContext(RefractionContext);
  const { camera } = useThree();

  const colorUniform = useMemo(() => {
    return new THREE.Color(uColor || 'white');
  }, [uColor]);

  if (!context || !context.isEnabled || !context.texture)
    return (
      <meshBasicMaterial transparent opacity={1.0} color={uColor || 'white'} />
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
      depthWrite={false} // Ensure transparent object doesn't write to depth
      depthTest={true}   // Ensure transparent object tests against depth
      uColor={colorUniform}
      {...props}
    />
  );
};
