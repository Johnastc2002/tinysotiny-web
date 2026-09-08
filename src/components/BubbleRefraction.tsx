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
  registerBubble: (obj: THREE.Object3D) => void;
  unregisterBubble: (obj: THREE.Object3D) => void;
  isEnabled: boolean;
}

const RefractionContext = createContext<RefractionContextType | null>(null);

// Refraction is intentionally rendered below the main canvas resolution. The
// result is blurred before display, so native-DPR rendering adds substantial
// fill-rate and mipmap cost without a visible quality benefit.
const REFRACTION_RESOLUTION_SCALE = 0.75;
const BLUR_RESOLUTION_SCALE = 0.5;
const MAX_REFRACTION_DPR = 1;

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
  const clearColorRef = useRef(new THREE.Color());

  const dimensions = useMemo(() => {
    const pixelRatio = Math.min(gl.getPixelRatio(), MAX_REFRACTION_DPR);
    return {
      sceneWidth: Math.max(
        1,
        Math.floor(size.width * pixelRatio * REFRACTION_RESOLUTION_SCALE),
      ),
      sceneHeight: Math.max(
        1,
        Math.floor(size.height * pixelRatio * REFRACTION_RESOLUTION_SCALE),
      ),
      blurWidth: Math.max(
        1,
        Math.floor(size.width * pixelRatio * BLUR_RESOLUTION_SCALE),
      ),
      blurHeight: Math.max(
        1,
        Math.floor(size.height * pixelRatio * BLUR_RESOLUTION_SCALE),
      ),
    };
  }, [size, gl]);

  const targets = useMemo(() => {
    const sceneTarget = new THREE.WebGLRenderTarget(
      dimensions.sceneWidth,
      dimensions.sceneHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
        stencilBuffer: false,
        generateMipmaps: false,
      },
    );
    const blurTargetA = new THREE.WebGLRenderTarget(
      dimensions.blurWidth,
      dimensions.blurHeight,
      {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        stencilBuffer: false,
        generateMipmaps: false,
      },
    );
    const blurTargetB = blurTargetA.clone();

    return { sceneTarget, blurTargetA, blurTargetB };
  }, [dimensions]);

  const blurPipeline = useMemo(() => {
    const blurScene = new THREE.Scene();
    const blurCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uTexelSize: {
          value: new THREE.Vector2(
            1 / dimensions.blurWidth,
            1 / dimensions.blurHeight,
          ),
        },
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uDirection;
        uniform vec2 uTexelSize;
        varying vec2 vUv;

        void main() {
          vec2 axis = uDirection * uTexelSize;
          vec4 color = texture2D(tDiffuse, vUv) * 0.0690451510;

          color += texture2D(tDiffuse, vUv + axis * 1.4895848401) * 0.1334067336;
          color += texture2D(tDiffuse, vUv - axis * 1.4895848401) * 0.1334067336;
          color += texture2D(tDiffuse, vUv + axis * 3.4757135714) * 0.1162191668;
          color += texture2D(tDiffuse, vUv - axis * 3.4757135714) * 0.1162191668;
          color += texture2D(tDiffuse, vUv + axis * 5.4618796741) * 0.0906686380;
          color += texture2D(tDiffuse, vUv - axis * 5.4618796741) * 0.0906686380;
          color += texture2D(tDiffuse, vUv + axis * 7.4481042327) * 0.0633453293;
          color += texture2D(tDiffuse, vUv - axis * 7.4481042327) * 0.0633453293;
          color += texture2D(tDiffuse, vUv + axis * 9.4344079746) * 0.0396322395;
          color += texture2D(tDiffuse, vUv - axis * 9.4344079746) * 0.0396322395;
          color += texture2D(tDiffuse, vUv + axis * 11.4208111470) * 0.0222053174;
          color += texture2D(tDiffuse, vUv - axis * 11.4208111470) * 0.0222053174;
          gl_FragColor = color;
        }
      `,
    });
    const quad = new THREE.Mesh(geometry, material);
    quad.frustumCulled = false;
    blurScene.add(quad);

    return { blurScene, blurCamera, geometry, material };
  }, [dimensions]);
  const blurMaterialRef = useRef(blurPipeline.material);

  useEffect(() => {
    blurMaterialRef.current = blurPipeline.material;
  }, [blurPipeline]);

  useEffect(
    () => () => {
      targets.sceneTarget.dispose();
      targets.blurTargetA.dispose();
      targets.blurTargetB.dispose();
      blurPipeline.geometry.dispose();
      blurPipeline.material.dispose();
    },
    [targets, blurPipeline],
  );

  const registerBubble = (obj: THREE.Object3D) => {
    bubblesRef.current.add(obj);
  };

  const unregisterBubble = (obj: THREE.Object3D) => {
    bubblesRef.current.delete(obj);
  };

  useFrame((state) => {
    if (!enabled) return;

    const hiddenBubbles: THREE.Object3D[] = [];
    bubblesRef.current.forEach((b) => {
      if (b.visible) {
        b.visible = false;
        hiddenBubbles.push(b);
      }
    });

    const currentRenderTarget = state.gl.getRenderTarget();
    const oldClearColor = clearColorRef.current;
    state.gl.getClearColor(oldClearColor);
    const oldClearAlpha = state.gl.getClearAlpha();

    // Capture the scene without refractive bubbles.
    state.gl.setClearColor('#F0F2F5', 1);
    state.gl.setRenderTarget(targets.sceneTarget);
    state.gl.clear();
    state.gl.render(state.scene, state.camera);

    // Blur once horizontally and once vertically. The bubble shader can now
    // use a single smooth texture sample instead of a large per-bubble kernel.
    const blurMaterial = blurMaterialRef.current;
    blurMaterial.uniforms.tDiffuse.value = targets.sceneTarget.texture;
    blurMaterial.uniforms.uDirection.value.set(1, 0);
    state.gl.setRenderTarget(targets.blurTargetA);
    state.gl.clear();
    state.gl.render(blurPipeline.blurScene, blurPipeline.blurCamera);

    blurMaterial.uniforms.tDiffuse.value = targets.blurTargetA.texture;
    blurMaterial.uniforms.uDirection.value.set(0, 1);
    state.gl.setRenderTarget(targets.blurTargetB);
    state.gl.clear();
    state.gl.render(blurPipeline.blurScene, blurPipeline.blurCamera);

    state.gl.setClearColor(oldClearColor, oldClearAlpha);
    state.gl.setRenderTarget(currentRenderTarget);

    hiddenBubbles.forEach((b) => {
      b.visible = true;
    });

    state.gl.render(state.scene, state.camera);
  }, 1);

  return (
    <RefractionContext.Provider
      value={{
        texture: targets.blurTargetB.texture,
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
  enabled: boolean = true,
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
    uRefractionStrength: 0.02,
    uBlurScale: 2.0,
    uOpacity: 1.0,
    uRadius: 1.0,
    uColor: new THREE.Color('white'),
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec4 vScreenPos;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vec4 viewPos = viewMatrix * worldPosition;
      gl_Position = projectionMatrix * viewPos;
      vScreenPos = gl_Position;
    }
  `,
  // Fragment Shader
  `
    uniform sampler2D tDiffuse;
    uniform float uRefractionStrength;
    uniform float uOpacity;
    uniform vec3 uColor;

    varying vec2 vUv;
    varying vec4 vScreenPos;
    
    void main() {
        // Screen UV (0 to 1)
        vec2 screenUV = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;
        
    // Local UV centered
    vec2 localDiff = vUv - 0.5;
    float dist = length(localDiff);
    
    // Soft edge to prevent aliasing (zig-zag lines)
    float edgeSmoothness = 0.01;
    float alphaEdge = 1.0 - smoothstep(0.5 - edgeSmoothness, 0.5, dist);

    // Calculate sphere height for normal/refraction
    // Clamp dist to avoid NaN in sqrt
    float safeDist = min(dist, 0.5);
    float zHeight = sqrt(0.25 - safeDist * safeDist);
    vec3 normal = normalize(vec3(localDiff.x, localDiff.y, zHeight));
        vec2 n = normal.xy;

        // --- REFRACTION ---
        vec2 offset = n * uRefractionStrength * uOpacity;
        vec2 refractedUV = screenUV + offset;
        
        // The shared texture is already smoothly blurred in two passes.
        vec3 col = texture2D(tDiffuse, refractedUV).rgb;

        // --- BALANCED BRIGHTNESS CORRECTION ---
        // Calculate luminance to determine how bright the pixel is
        float lum = dot(col, vec3(0.299, 0.587, 0.114));

        // Adaptive Gamma:
        // Use strong gamma (0.25) for dark areas to lift them.
        // Use normal gamma (1.0) for bright areas to avoid washout.
        // We interpolate based on luminance.
        float adaptiveGamma = mix(0.5, 1.0, lum);
        
        col = pow(col, vec3(adaptiveGamma));
        col *= 1.1; // Increase overall brightness

        // --- TINTING ---
        // Radial gradient: 100% at center, 20% at edge
        // Overall strength: 30%
        float normDist = dist * 2.0; // 0.0 to 1.0
        // Lighter gradient core (0.45 instead of 0.6)
        float gradientMask = mix(0.4, 0.2, normDist); // 1.0 to 0.2
        float tintStrength = 0.3; 
        
        // Apply tint using MULTIPLY blend to ensure it darkens the bubble (glass filter effect)
        // We mix between pure white (no filter) and the tint color based on strength
        // For grey bubbles (uColor around 0.84), this will darken slightly.
        // For navy bubbles (uColor around 0.06), this will darken significantly.
        vec3 tintFactor = mix(vec3(1.0), uColor, gradientMask * tintStrength);
        col *= tintFactor;
        
    // Final Alpha - sharp edge
    float finalAlpha = uOpacity * alphaEdge;
    
    gl_FragColor = vec4(col, finalAlpha);
    }
  `,
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
      transparent
      depthWrite={false} // Ensure transparent object doesn't write to depth
      depthTest={true} // Ensure transparent object tests against depth
      uColor={colorUniform}
      {...props}
    />
  );
};
