'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Canvas,
  useThree,
  useFrame,
  ThreeEvent,
} from '@react-three/fiber';
import {
  OrbitControls,
  useTexture,
  Text,
  Environment,
  Float,
} from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Project } from '@/types/project';
import { useCursor } from '@/context/CursorContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  BubbleRefractionProvider,
  useBubbleRefraction,
  RefractiveBubbleMaterial,
} from './BubbleRefraction';

const createRNG = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    return (s = (s * 16807) % 2147483647) / 2147483647;
  };
};

const getSeedFromId = (id: number | string) => {
  if (typeof id === 'number') return id;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

interface Shader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uniforms: { [uniform: string]: { value: any } };
  vertexShader: string;
  fragmentShader: string;
}

export const BUBBLE_COLORS = {
  PLAY: '#001EFF',
  WORK: '#0F2341',
  GREY: '#0F2341', // The color here DOES NOT AFFECT when (enableRefraction = true) is enabled
};

interface BubbleData {
  id: number;
  position: [number, number, number];
  scale: number;
  imageUrl?: string;
  imageHoverUrl?: string; // Add hover image URL support
  color?: string;
  type: 'image' | 'solid' | 'glass';
  link?: string;
  label?: string;
  project?: Project;
  textOffset?: [number, number, number];
  isGradient?: boolean;
  isRefractive?: boolean;
}

const useSoftCircleTexture = (
  type: 'solid' | 'glass' | 'image' | 'play_gradient' = 'glass'
) => {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);

      if (type === 'play_gradient') {
        // Linear gradient from 100% opacity (White) at core to 20% opacity (Dark Grey) at edge
        // We use grayscale colors because alphaMap reads the green channel/luminance
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(1, 'rgba(51, 51, 51, 1)'); // ~20% luminance
      } else {
        // Standard soft edge for other glass bubbles - use transparency which results in black on clear canvas
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Revert to White Transparent to preserve luminance
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, [type]);
};

const checkCollision = (
  position: [number, number, number],
  radius: number,
  existingBubbles: BubbleData[],
  padding: number = 0.5
): boolean => {
  for (const bubble of existingBubbles) {
    const dx = position[0] - bubble.position[0];
    const dy = position[1] - bubble.position[1];
    const dz = position[2] - bubble.position[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;
    const minDistance = radius + bubble.scale + padding;

    if (distanceSq < minDistance * minDistance) {
      return true;
    }
  }
  return false;
};

const generateBubbles = (
  count: number,
  mode: 'home' | 'gallery',
  projects: Project[] = []
) => {
  const temp: BubbleData[] = [];
  // Use seeded RNG for deterministic layout
  const rng = createRNG(12345);

  if (mode === 'home') {
    // 1. Play Bubble (Blue, Gradient, Left side, Behind Work)
    temp.push({
      id: 0,
      position: [-2.8, 2.8, 0.5], // Moved slightly closer to center to overlap more
      scale: 3,
      color: BUBBLE_COLORS.PLAY,
      type: 'glass',
      link: '/play',
      label: 'play',
      textOffset: [-1.8, 0, 0], // Shift text left
      isGradient: true,
    });

    // 2. Work Bubble (Dark, Solid, Right side, In Front)
    temp.push({
      id: 1,
      position: [2.8, -2.8, 0], // Moved slightly closer to center
      scale: 3.5,
      color: BUBBLE_COLORS.WORK, // Restored to user-defined Navy color
      type: 'solid',
      link: '/work',
      label: 'work',
      textOffset: [-1.8, 0, 0], // Shift text right
    });

    // 3. Grey Bubbles (Transparent, Glass/Blur)
    let attempts = 0;
    let i = 2;
    // Fix: count is used for total bubbles. If count is smaller than current 'i' (2), loop won't run.
    const targetCount = Math.max(count, 3);
    const spatialSpread = 25;
    const scaleSpread = 5.5;

    console.log('targetCount', targetCount);
    while (i < targetCount && attempts < 500) {
      const x = (rng() - 0.5) * spatialSpread; // Increased range
      const y = (rng() - 0.5) * spatialSpread;
      const z = (rng() - 0.5) * spatialSpread;
      const scale = 0.5 + rng() * scaleSpread; // Wider range of sizes

      const position: [number, number, number] = [x, y, z];

      if (!checkCollision(position, scale, temp, 0.2)) {
        temp.push({
          id: i,
          position,
          scale,
          color: BUBBLE_COLORS.GREY, // Set to GREY color
          type: 'glass',
          isGradient: true,
          isRefractive: true,
        });
        i++;
      }
      attempts++;
    }
  } else {
    // Gallery Mode
    let attempts = 0;
    let i = 0;
    const totalBubbles = Math.max(count, projects.length); // Ensure at least enough bubbles for projects

    // If totalBubbles is 0, we should not loop. But generateBubbles logic is fine.
    // However, collision check with empty 'temp' always passes.

    while (i < totalBubbles && attempts < 1000) {
      const x = (rng() - 0.5) * 20;
      const y = (rng() - 0.5) * 20;
      const z = (rng() - 0.5) * 20;
      const scale = 0.8 + rng() * 2.0; // Wider random range

      const position: [number, number, number] = [x, y, z];

      if (!checkCollision(position, scale, temp, 0.2)) {
        if (i < projects.length) {
          // Create bubble for project
          const project = projects[i];
          temp.push({
            id: i,
            position,
            scale: Math.max(scale, 1.0), // Allow slightly smaller but ensure visibility
            imageUrl: project.bubble_thumbnail,
            imageHoverUrl: project.bubble_thumbnail_hover,
            type: 'image',
            project: project,
          });
        } else {
          // Create filler bubble
          temp.push({
            id: i,
            position,
            scale,
            color: BUBBLE_COLORS.GREY, // Set to GREY color
            type: 'glass',
            isGradient: true,
            isRefractive: true,
          });
        }
        i++;
      }
      attempts++;
    }
  }
  return temp;
};

const Bubble = ({
  id,
  position,
  scale,
  imageUrl,
  imageHoverUrl,
  color,
  type,
  link,
  onOpenCard,
  project,
  label,
  textOffset,
  isGradient,
  enableExplosion,
  explosionDelay = 0,
  enableBlur,
  isHovered,
  setHoveredId,
  isMobile,
  isRefractive,
}: {
  id: number;
  position: [number, number, number];
  scale: number;
  imageUrl?: string;
  imageHoverUrl?: string;
  color?: string;
  type: 'image' | 'solid' | 'glass';
  link?: string;
  onOpenCard?: (project: Project) => void;
  project?: Project;
  label?: string;
  textOffset?: [number, number, number];
  isGradient?: boolean;
  enableExplosion?: boolean;
  explosionDelay?: number;
  enableBlur?: boolean;
  isHovered: boolean;
  setHoveredId: (id: number | null) => void;
  isMobile: boolean;
  isRefractive?: boolean;
}) => {
  const router = useRouter();
  const groupRef = useRef<THREE.Group>(null);
  const { setCursor } = useCursor();

  // Animation state
  // Start near center (atom-like) if explosion enabled, otherwise at final position
  const [currentPosition] = useState(() => {
    if (enableExplosion) {
      // Small random jitter around center
      return new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
      );
    }
    return new THREE.Vector3(...position);
  });

  const targetPosition = useMemo(
    () => new THREE.Vector3(...position),
    [position]
  );
  const [startExplosion, setStartExplosion] = useState(!enableExplosion);

  useEffect(() => {
    if (enableExplosion) {
      const timer = setTimeout(() => {
        setStartExplosion(true);
      }, explosionDelay);
      return () => clearTimeout(timer);
    }
  }, [enableExplosion, explosionDelay]);

  useFrame((state, delta) => {
    if (enableExplosion && groupRef.current && startExplosion) {
      // Lerp towards target
      // Adjust speed for "explosion" feel - start fast, slow down
      const speed = 3;
      currentPosition.lerp(targetPosition, delta * speed);
      groupRef.current.position.copy(currentPosition);
    }
  });

  const handleClick = (e: ThreeEvent<PointerEvent>) => {
    // Check if the event has 'delta' (distance moved) and it's small enough to be a click, not a drag
    if (e.delta > 5) return;

    if (link) {
      e.stopPropagation();
      router.push(link);
    } else if (type === 'image' && onOpenCard && project) {
      e.stopPropagation();
      onOpenCard(project);
    }
  };

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    if (isMobile) return;
    e.stopPropagation(); // Stop propagation to bubbles behind
    setHoveredId(id);
    if (label === 'work') {
      setCursor('label', "let's roll!");
    } else if (label === 'play') {
      setCursor('label', 'game on!');
    } else if (link) {
      setCursor('label');
    } else if (onOpenCard && project) {
      setCursor('label');
    }
  };

  const handlePointerOut = () => {
    // Only clear if we are the one currently hovered
    if (isHovered) {
      setHoveredId(null);
      setCursor('default');
    }
  };

  const softTexture = useSoftCircleTexture(
    isGradient ? 'play_gradient' : type === 'glass' ? 'glass' : 'solid'
  );

  // Conditionally call useTexture only if type is 'image' and imageUrl is present
  // ... (comments retained)

  const adjustedScale = useMemo(() => {
    return enableBlur ? scale : scale * 1.1;
  }, [scale, enableBlur]);

  // Actually, standard practice for conditional hooks: split components.
  if (type === 'image' && imageUrl) {
    return (
      <group ref={groupRef} position={enableExplosion ? undefined : position}>
        <ImageBubble
          id={id}
          position={[0, 0, 0]} // Relative to group
          scale={adjustedScale}
          imageUrl={imageUrl}
          imageHoverUrl={imageHoverUrl}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          enableBlur={enableBlur}
          isHovered={isHovered}
        />
      </group>
    );
  }

  // Ensure type is 'solid' or 'glass' for ColorBubble
  const colorType = type === 'image' ? 'solid' : type;

  return (
    <group ref={groupRef} position={enableExplosion ? undefined : position}>
      <ColorBubble
        id={id}
        position={[0, 0, 0]} // Relative to group
        scale={adjustedScale}
        color={color}
        type={colorType}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        alphaMap={softTexture}
        label={label}
        textOffset={textOffset}
        isGradient={isGradient}
        enableBlur={enableBlur}
        isHovered={isHovered}
        isRefractive={isRefractive}
      />
    </group>
  );
};

const ScreenAlignedGroup = ({
  children,
  position,
  ...props
}: {
  children: React.ReactNode;
  position?: [number, number, number] | THREE.Vector3;
} & React.ComponentProps<'group'>) => {
  const ref = useRef<THREE.Group>(null);
  const qMap = useRef(new THREE.Quaternion());
  const qParent = useRef(new THREE.Quaternion());

  useFrame(({ camera }) => {
    if (!ref.current) return;

    // 1. Get Camera World Quaternion
    camera.getWorldQuaternion(qMap.current);

    // 2. Compensate for parent rotation
    if (ref.current.parent) {
      ref.current.parent.getWorldQuaternion(qParent.current);
      // q_local = q_parent_inv * q_world
      qParent.current.invert();
      qMap.current.premultiply(qParent.current);
    }

    ref.current.quaternion.copy(qMap.current);
  });

  return (
    <group ref={ref} position={position} {...props}>
      {children}
    </group>
  );
};

const ImageBubble = ({
  id,
  position,
  scale,
  imageUrl,
  imageHoverUrl,
  onClick,
  onPointerOver,
  onPointerOut,
  enableBlur,
  isHovered,
}: {
  id: number | string;
  position: [number, number, number];
  scale: number;
  imageUrl: string;
  imageHoverUrl?: string;
  onClick: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  enableBlur?: boolean;
  isHovered: boolean;
}) => {
  const textures = useTexture([imageUrl, imageHoverUrl || imageUrl]);
  const defaultTexture = textures[0];
  const hoverTexture = textures[1];

  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  // Use 1.0/PADDING_SCALE (0.5) to ensure the occlusion mask matches the visual bubble size,
  // not the larger padded geometry used for feathering.
  useBubbleRefraction(id.toString(), meshRef, 0.5, false);
  const shaderRef = useRef<Shader>(null);
  const overlayShaderRef = useRef<Shader>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);

  // Padding for feathering (70% extra space to allow full feathering range without clipping)
  const PADDING_SCALE = 2.0;

  useFrame(() => {
    if (enableBlur && meshRef.current) {
      meshRef.current.getWorldPosition(worldPos);
      worldPos.normalize();

      camDir.copy(camera.position).normalize();

      const dot = camDir.dot(worldPos);
      const blurFactor = THREE.MathUtils.clamp(-dot, 0, 1);

      // Update feather and blur uniforms
      if (shaderRef.current) {
        // Feather width scaled by bubble size (larger bubbles get softer edges)
        shaderRef.current.uniforms.uFeather.value = blurFactor * 0.1;
        // Mipmap Bias for Blur (0 to 5)
        shaderRef.current.uniforms.uBlur.value = blurFactor * 4.0;

        // Zoom Effect:
        // When blurFactor is high (side/back view), zoom in slightly (scale < 1.0)
        // blurFactor ranges from 0 (front) to 1 (back/side strongest)
        // Let's say max zoom is 1.2x -> scale = 1/1.2 = 0.83
        const maxZoom = 1.2;
        const targetScale = 1.0 - blurFactor * (1.0 - 1.0 / maxZoom);
        shaderRef.current.uniforms.uZoom.value = targetScale;
      }
    }
  });

  const [hovered, setHovered] = useState(false);

  // Sync local hover state with parent-controlled isHovered
  useEffect(() => {
    setHovered(isHovered);
  }, [isHovered]);

  // Removed unused materialRef
  // const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useMemo(() => {
    // Configure textures to fill the circle without stretching
    [defaultTexture, hoverTexture].forEach((tex) => {
      if (!tex || !tex.image) return;
      const imageAspect =
        (tex.image as HTMLImageElement).width /
        (tex.image as HTMLImageElement).height;

      // Reset first to avoid compounding transforms if useMemo re-runs
      tex.center.set(0.5, 0.5);
      tex.rotation = 0;

      if (imageAspect > 1) {
        // Landscape: cover width
        tex.repeat.set(1 / imageAspect, 1);
        tex.offset.set(0, 0);
      } else {
        // Portrait: cover height
        tex.repeat.set(1, imageAspect);
        tex.offset.set(0, 0);
      }

      // Improve texture quality
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.needsUpdate = true;
    });
  }, [defaultTexture, hoverTexture]);

  const [floatSpeed] = useState(() => (1.5 + Math.random()) * 0.25);
  const [floatIntensity] = useState(() => 0.5 + Math.random() * 0.5);

  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    if (materialRef.current) {
      if (materialRef.current.opacity < 1) {
        materialRef.current.opacity = THREE.MathUtils.lerp(
          materialRef.current.opacity,
          1,
          delta * 2
        );
        if (materialRef.current.opacity > 0.99) {
          materialRef.current.opacity = 1;
          materialRef.current.needsUpdate = true;
        }
      }
    }
  });

  return (
    <Float
      speed={floatSpeed}
      rotationIntensity={0}
      floatIntensity={floatIntensity}
      floatingRange={[-0.1, 0.1]}
    >
      <ScreenAlignedGroup position={position}>
        {/* Interaction Mesh - exact size */}
        <mesh
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <circleGeometry args={[scale, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh ref={meshRef} raycast={() => null}>
          {/* Scale geometry to allow for outside feathering */}
          <circleGeometry args={[scale * PADDING_SCALE, 128]} />
          <meshBasicMaterial
            ref={materialRef}
            map={hovered && imageHoverUrl ? hoverTexture : defaultTexture}
            side={THREE.DoubleSide}
            transparent={true}
            opacity={0}
            color="white"
            onBeforeCompile={(shader) => {
              shader.uniforms.uFeather = { value: 0.0 };
              shader.uniforms.uScaleFactor = { value: PADDING_SCALE };
              shader.uniforms.uBlur = { value: 0.0 };
              shader.uniforms.uZoom = { value: 1.0 }; // Initialize zoom uniform

              // Inject varying for geometry UVs
              shader.vertexShader =
                `
                varying vec2 vPosUv;
              ` + shader.vertexShader;

              shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_vertex>',
                `
                #include <uv_vertex>
                vPosUv = uv;
                `
              );

              shader.fragmentShader =
                `uniform float uFeather;
                 uniform float uScaleFactor;
                 uniform float uBlur;
                 uniform float uZoom;
                 varying vec2 vPosUv;
                ` + shader.fragmentShader;

              shader.fragmentShader = shader.fragmentShader.replace(
                '#include <map_fragment>',
                `
                // Scale UVs from center to keep image original size
                vec2 centeredUv = vMapUv - 0.5;
                // Apply Zoom (uZoom < 1.0 means zoom in / enlarge image)
                vec2 scaledUv = centeredUv * uScaleFactor * uZoom + 0.5;
                
                #ifdef USE_MAP
                  vec4 sampledDiffuseColor = vec4(0.0);
                  // Use multi-tap sampling for smoother blur (Poisson-disc-like pattern)
                  if (uBlur > 0.1) {
                      float r = uBlur * 0.004; // Radius scale
                      float b = uBlur * 0.5; // Reduced mipmap bias for higher res details
                      
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(-0.32, -0.40)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(-0.84, -0.07)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(-0.69, 0.45)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(-0.20, 0.62)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(0.96, -0.19)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(0.47, -0.48)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(0.51, 0.76)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(0.18, -0.89)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(0.50, 0.06)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(0.89, 0.41)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(-0.32, -0.93)*r, b);
                      sampledDiffuseColor += texture2D(map, scaledUv + vec2(-0.79, -0.59)*r, b);
                      sampledDiffuseColor /= 12.0;
                  } else {
                      sampledDiffuseColor = texture2D(map, scaledUv);
                  }
                  
                  diffuseColor *= sampledDiffuseColor;
                #endif
                
                // Calculate distance from center using GEOMETRY UVs (vPosUv)
                float dist = length(vPosUv - 0.5);
                
                // The original radius (0.5) is now at 0.5 / uScaleFactor in UV space
                float originalRadius = 0.5 / uScaleFactor;
                
                float alpha = 1.0;
                
                // Feather OUTSIDE the original radius
                if (dist > originalRadius) {
                   // Map dist from [originalRadius, originalRadius + uFeather] to [1, 0]
                   float featherWidth = max(uFeather, 0.0001);
                   alpha = 1.0 - smoothstep(originalRadius, originalRadius + featherWidth, dist);
                }
                
                // Hard clip at geometry edge
                if (dist > 0.495) alpha = 0.0;
                
                diffuseColor.a *= alpha;
                `
              );
              shaderRef.current = shader;
            }}
          />
        </mesh>
        {enableBlur && (
          <mesh position={[0, 0, 0.05]} raycast={() => null}>
            <circleGeometry args={[scale * PADDING_SCALE, 64]} />
            <meshBasicMaterial
              transparent={true}
              opacity={0}
              color="white"
              side={THREE.FrontSide}
              depthWrite={false}
              onBeforeCompile={(shader) => {
                shader.uniforms.uOpacity = { value: 0.0 };
                shader.uniforms.uFeather = { value: 0.0 };
                shader.uniforms.uScaleFactor = { value: PADDING_SCALE };

                // Inject varying for geometry UVs
                shader.vertexShader =
                  `
                   varying vec2 vPosUv;
                 ` + shader.vertexShader;

                shader.vertexShader = shader.vertexShader.replace(
                  '#include <uv_vertex>',
                  `
                   #include <uv_vertex>
                   vPosUv = uv;
                   `
                );

                shader.fragmentShader =
                  `
                   uniform float uOpacity;
                   uniform float uFeather;
                   uniform float uScaleFactor;
                   varying vec2 vPosUv;
                 ` + shader.fragmentShader;

                shader.fragmentShader = shader.fragmentShader.replace(
                  '#include <dithering_fragment>',
                  `
                   #include <dithering_fragment>
                   
                   // Calculate distance from center using GEOMETRY UVs
                   float dist = length(vPosUv - 0.5);
                   float originalRadius = 0.5 / uScaleFactor;
                   
                   float alpha = uOpacity;
                   
                   // Feather logic for overlay
                   if (dist > originalRadius) {
                      float featherWidth = max(uFeather, 0.0001);
                      float featherFactor = 1.0 - smoothstep(originalRadius, originalRadius + featherWidth, dist);
                      alpha *= featherFactor;
                   }
                   if (dist > 0.495) alpha = 0.0;
                   
                   gl_FragColor.a = alpha;
                   `
                );
                overlayShaderRef.current = shader;
              }}
            />
          </mesh>
        )}
      </ScreenAlignedGroup>
    </Float>
  );
};

const ColorBubble = ({
  id,
  position,
  scale,
  color,
  type,
  onClick,
  onPointerOver,
  onPointerOut,
  alphaMap,
  label,
  textOffset,
  isGradient,
  enableBlur,
  isRefractive,
}: {
  id?: number | string;
  position: [number, number, number];
  scale: number;
  color?: string;
  type: 'solid' | 'glass';
  onClick: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
  alphaMap?: THREE.Texture | null;
  label?: string;
  textOffset?: [number, number, number];
  isGradient?: boolean;
  enableBlur?: boolean;
  isHovered?: boolean;
  isRefractive?: boolean;
}) => {
  const [floatSpeed] = useState(() => (1.5 + Math.random()) * 0.25);
  const [floatIntensity] = useState(() => 0.5 + Math.random() * 0.5);

  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  useBubbleRefraction(
    id?.toString() || 'unknown',
    meshRef,
    1.0,
    !!isRefractive
  );

  const shaderRef = useRef<Shader>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);

  // Grey bubble random fade logic
  const isGrey = color === BUBBLE_COLORS.GREY;
  const [randomState] = useState(() => {
    const rng = createRNG(getSeedFromId(id || 'unknown'));
    const visible = rng() > 0.5;
    return {
      visible,
      duration: 2 + rng() * 8,
      opacity: visible ? 1 : 0,
    };
  });

  const fadeState = useRef({
    visible: randomState.visible,
    timer: 0,
    duration: randomState.duration,
    currentOpacity: randomState.opacity,
  });

  useFrame((state, delta) => {
    if (isGrey && meshRef.current) {
      const fs = fadeState.current;
      fs.timer += delta;

      if (fs.timer >= fs.duration) {
        fs.visible = !fs.visible;
        fs.timer = 0;
        fs.duration = 2 + Math.random() * 8; // Random duration 2-10s
      }

      const target = fs.visible ? 1 : 0;
      fs.currentOpacity = THREE.MathUtils.lerp(
        fs.currentOpacity,
        target,
        delta * 2.0
      );

      const mat = meshRef.current.material as THREE.Material;
      if (mat) {
        mat.opacity = fs.currentOpacity;
        mat.needsUpdate = true;
      }
    }
  });

  // Padding for feathering (2.0x extra space) - UNUSED now, but keeping var if needed later or remove.
  // const PADDING_SCALE = 2.0;

  useFrame(() => {
    if (enableBlur && meshRef.current) {
      meshRef.current.getWorldPosition(worldPos);
      worldPos.normalize();

      camDir.copy(camera.position).normalize();

      const dot = camDir.dot(worldPos);
      const blurFactor = THREE.MathUtils.clamp(-dot, 0, 1);

      // Update feather uniform
      if (shaderRef.current) {
        // Feather width scaled by bubble size
        shaderRef.current.uniforms.uFeather.value = blurFactor * 0.1;
      }
    }
  });

  const onBeforeCompile = (shader: Shader) => {
    shader.uniforms.uFeather = { value: 0.0 };
    // Pass PADDING_SCALE to shader if we were padding geometry, but now we are not padding geometry
    // or we need to ensure shader knows real scale relative to geometry.
    // Actually, if we remove geometry padding (scale * 1.0), we must ensure PADDING_SCALE is 1.0 in shader or logic adapts.
    // If we want to keep feather logic working, we need padding.
    // The user claims "bug that when enableBlur, the bubble wrongly scale the logic to 0.5".
    // This implies geometry was scaled up (2.0), so we had to scale down logic (0.5).
    // User wants "bubble size always align".
    // If we revert geometry to [scale], we can't feather outside?
    // Wait, if we use scale * 1.0, and feather, we eat into the bubble.
    // If the user accepts that, or if we use a different technique.
    // BUT the user said "compensate the bug... enlarged the bubble back".
    // So likely the geometry padding was the "enlarged back" part.
    // Let's set geometry to [scale].
    // And remove scale compensation in shader.
    shader.uniforms.uScaleFactor = { value: 1.0 };

    shader.vertexShader =
      `
      varying vec2 vPosUv;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <uv_vertex>',
      `
      #include <uv_vertex>
      vPosUv = uv;
      `
    );

    shader.fragmentShader =
      `uniform float uFeather;
       uniform float uScaleFactor;
       varying vec2 vPosUv;
      ` + shader.fragmentShader;

    // Different injection point depending on whether map is used (isGradient)
    const replaceString = isGradient
      ? '#include <alphamap_fragment>'
      : '#include <color_fragment>';

    // Logic: calculate distance, feather alpha
    const featherLogic = `
      // Calculate distance from center using GEOMETRY UVs (vPosUv)
      float dist = length(vPosUv - 0.5);
      
      // Radius is 0.5 in UV space
      float originalRadius = 0.5;
      
      float alphaFeather = 1.0;
      
      // Feather INSIDE the radius (since we don't have padding anymore?)
      // Or we accept feather is clipped if we don't pad.
      // But user said "wrongly scale logic to 0.5". 
      // If we remove scaling, originalRadius is 0.5.
      
      // Feather logic
      // We want to feather the edge.
      float featherWidth = max(uFeather, 0.0001);
      // smoothstep from (radius - feather) to radius?
      // If we want soft edge within the circle:
      alphaFeather = 1.0 - smoothstep(originalRadius - featherWidth, originalRadius, dist);
      
      // Hard clip at geometry edge
      if (dist > 0.495) alphaFeather *= 0.0; // Just to be safe at very edge
      
      diffuseColor.a *= alphaFeather;
    `;

    shader.fragmentShader = shader.fragmentShader.replace(
      replaceString,
      `
      ${replaceString}
      ${featherLogic}
      `
    );

    shaderRef.current = shader;
  };

  return (
    <Float
      speed={floatSpeed}
      rotationIntensity={0}
      floatIntensity={floatIntensity}
      floatingRange={[-0.2, 0.2]}
    >
      <ScreenAlignedGroup position={position}>
        {/* Interaction Mesh */}
        <mesh
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <circleGeometry args={[scale, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh ref={meshRef} raycast={() => null} visible={true}>
          {/* Always use exact scale, handle padding inside shader if needed, but for now geometry matches visual size */}
          <circleGeometry args={[scale, 128]} />
          {/* Debug: Print type info */}
          {/* console.log('Bubble Render:', { id, type, isRefractive }) */}

          {type === 'solid' ? (
            <meshBasicMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent={!!enableBlur}
              depthWrite={true} // Enable depth write for correct refraction masking
              onBeforeCompile={enableBlur ? onBeforeCompile : undefined}
            />
          ) : isRefractive ? (
            <RefractiveBubbleMaterial
              uOpacity={1.0}
              uRefractionStrength={0.005}
              // [CONFIG] TWEAK HERE: Overall blur amount. Higher = wider blur.
              // Try values between 4.0 and 12.0.
              uBlurScale={2.0}
              uRadius={scale}
              uColor={color}
            />
          ) : isGradient ? (
            // Special case for Play bubble & Grey bubbles: Basic material with alpha map for 100% -> 20% gradient
            <meshBasicMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent
              alphaMap={alphaMap || undefined}
              depthWrite={true} // Enable depth write to ensure correct refraction masking
              onBeforeCompile={enableBlur ? onBeforeCompile : undefined}
            />
          ) : (
            // Revert to MeshStandardMaterial for better stability when refraction is disabled
            <meshStandardMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent={true}
              opacity={0.6}
              roughness={0.2}
              metalness={0.1}
              alphaMap={alphaMap || undefined}
              depthWrite={true}
            />
          )}
        </mesh>
        {label && (
          <Text
            position={[
              textOffset?.[0] || 0,
              textOffset?.[1] || 0,
              0.2 + (textOffset?.[2] || 0),
            ]} // Apply offset
            fontSize={scale * 0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            font={
              label === 'play'
                ? '/fonts/value-serif-bold.otf'
                : '/fonts/Value-Bold.ttf'
            }
            fontWeight="normal"
            raycast={() => null} // Disable raycasting so it doesn't block hover on bubble
          >
            {label}
          </Text>
        )}
      </ScreenAlignedGroup>
    </Float>
  );
};

const RotatingGroup = ({
  children,
  speed = 0.025,
  isDraggingRef,
}: {
  children: React.ReactNode;
  speed?: number;
  isDraggingRef?: React.MutableRefObject<boolean>;
}) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      if (isDraggingRef?.current) return;
      ref.current.rotation.y += delta * speed;
    }
  });
  return <group ref={ref}>{children}</group>;
};

const Loader = () => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.z -= delta * 5;
    }
  });
  return (
    <mesh ref={ref}>
      <torusGeometry args={[1, 0.05, 16, 64]} />
      <meshBasicMaterial color={BUBBLE_COLORS.GREY} />
    </mesh>
  );
};

const Bubbles = ({
  bubbles,
  onOpenCard,
  enableExplosion,
  explosionDelay,
  enableBlur,
  isMobile,
  enableRefraction,
}: {
  bubbles: BubbleData[];
  onOpenCard?: (project: Project) => void;
  enableExplosion?: boolean;
  explosionDelay?: number;
  enableBlur?: boolean;
  isMobile: boolean;
  enableRefraction?: boolean;
}) => {
  // Track the single hovered bubble ID
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const { camera, raycaster, pointer, scene } = useThree();

  // Raycaster logic to find the closest bubble
  useFrame(() => {
    // Only run if we have bubbles
    if (bubbles.length === 0) return;

    // Update raycaster with current pointer position
    raycaster.setFromCamera(pointer, camera);

    // Get all intersections with our bubble meshes
    // We need to filter for the interaction meshes (the first mesh in each bubble group)
    // Actually, we can just intersect with everything and filter by distance
    const intersects = raycaster.intersectObjects(scene.children, true);

    // Filter intersects to find bubble interaction meshes
    // We rely on the fact that our interaction mesh is the one with onClick handler attached in React
    // But in Three.js raycaster, we get objects.
    // The closest intersection is intersects[0].

    if (intersects.length > 0) {
      // Find the first object that is part of a Bubble
      // We can identify them by checking if they belong to a Bubble group or have userData
      // Simpler approach: We know our structure.
      // Let's iterate and find the first one that corresponds to a bubble ID we know.
      // But passing ref back is hard.
      // Alternative: Just use the distance from camera to center of bubble?
      // No, raycasting is better for overlap.
      // Logic:
      // 1. Find all intersections.
      // 2. Sort by distance (done by default).
      // 3. The first valid bubble hit is the "closest" one visually under the cursor.
      // 4. Set that as hovered.
      // We need to map mesh -> bubble ID.
      // We can use userData on the interaction mesh.
    }
  });

  const content = bubbles.map((bubble) => (
    <Bubble
      key={bubble.id}
      id={bubble.id}
      position={bubble.position}
      scale={bubble.scale}
      imageUrl={bubble.imageUrl}
      imageHoverUrl={bubble.imageHoverUrl}
      color={bubble.color}
      type={bubble.type}
      link={bubble.link}
      onOpenCard={onOpenCard}
      project={bubble.project}
      label={bubble.label}
      textOffset={bubble.textOffset}
      isGradient={bubble.isGradient}
      enableExplosion={enableExplosion}
      explosionDelay={explosionDelay}
      enableBlur={enableBlur}
      isHovered={hoveredId === bubble.id}
      setHoveredId={setHoveredId}
      isMobile={isMobile}
      isRefractive={bubble.isRefractive && enableRefraction}
    />
  ));

  return enableRefraction ? (
    <BubbleRefractionProvider enabled={true}>
      {content}
    </BubbleRefractionProvider>
  ) : (
    <>{content}</>
  );
};

const CameraAdjuster = ({
  userInteractionRef,
}: {
  userInteractionRef: React.MutableRefObject<boolean>;
}) => {
  const { camera, size, gl } = useThree();
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    // Force a resize/render when pausing might happen
    const handleResize = () => {
      camera.updateProjectionMatrix();
      gl.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [camera, gl]);

  useEffect(() => {
    if (userInteractionRef.current) return;
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    // ... existing logic ...
    const aspect = size.width / size.height;
    // ...

    // Scene bounds: range +/- 7.5 plus bubble radius ~1.0 => ~8.5.
    // Diameter ~17. Add padding => 22.
    const targetSize = 22;
    // Fix: Ensure FOV is handled correctly for aspect ratio.
    // Vertical FOV is constant in Three.js PerspectiveCamera.
    // If aspect < 1 (portrait), we need to distance camera further to fit width.
    const fovRad = (camera.fov * Math.PI) / 180;

    // Distance needed to fit targetSize vertically
    const distV = targetSize / 2 / Math.tan(fovRad / 2);

    // Distance needed to fit targetSize horizontally
    // visible_width = visible_height * aspect
    // visible_height_needed = targetSize / aspect
    // distH = (targetSize / aspect) / 2 / Math.tan(fovRad / 2) = distV / aspect
    const distH = distV / aspect;

    // Use the larger distance to ensure object fits both dimensions
    const finalDist = Math.max(distV, distH);

    // Adjust camera distance while preserving orientation
    // Assuming target is (0,0,0) - default for OrbitControls
    const target =
      controls && 'target' in controls
        ? (controls as { target: THREE.Vector3 }).target
        : new THREE.Vector3(0, 0, 0);

    const direction = new THREE.Vector3()
      .copy(camera.position)
      .sub(target)
      .normalize();
    // If direction is zero length (camera at target), default to z-axis
    if (direction.lengthSq() < 0.0001) {
      direction.set(0, 0, 1);
    }

    const newPos = direction.multiplyScalar(finalDist).add(target);

    camera.position.copy(newPos);
    camera.updateProjectionMatrix();
  }, [size, camera, controls, userInteractionRef]);

  return null;
};

const ControlsSpeedAdjuster = () => {
  const controls = useThree((state) => state.controls);
  const camera = useThree((state) => state.camera);

  useFrame(() => {
    if (!controls || !('target' in controls)) return;
    
    // Cast controls to any or proper type to access target and speeds
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orbitControls = controls as any;

    const dist = camera.position.distanceTo(orbitControls.target);
    
    // Linear scaling: speed = dist * factor
    // Base: dist 20 -> speed 0.5 => factor = 0.025
    // Adjusted: dist 20 -> speed 0.3 => factor = 0.015 for more precision
    let targetSpeed = dist * 0.015;
    
    // Clamp
    targetSpeed = Math.max(0.1, Math.min(targetSpeed, 2.0));

    // Debug: Log values to compare across pages
    // console.log('Dist:', dist.toFixed(2), 'Speed:', targetSpeed.toFixed(3));

    // eslint-disable-next-line
    orbitControls.rotateSpeed = targetSpeed;
    // eslint-disable-next-line
    orbitControls.autoRotateSpeed = targetSpeed;
  });

  return null;
};

const MagneticCamera = ({
  bubbles,
  userInteractionRef,
  baseZoomSpeed,
}: {
  bubbles: BubbleData[];
  userInteractionRef: React.MutableRefObject<boolean>;
  baseZoomSpeed: number;
}) => {
  const { camera, controls } = useThree();
  const vec = useMemo(() => new THREE.Vector3(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    if (userInteractionRef.current || !controls || !('target' in controls)) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orbitControls = controls as any;
    const target = orbitControls.target as THREE.Vector3;

    // Reset zoom speed to base at start of frame
    // eslint-disable-next-line
    orbitControls.zoomSpeed = baseZoomSpeed;

    // 1. Find the bubble closest to the center of the screen
    let closestBubble: BubbleData | null = null;
    let minDist = Infinity;

    // Center of screen in NDC is (0,0)
    for (const bubble of bubbles) {
      // Get bubble world position
      bubble.position && pos.set(...bubble.position);

      // Project to screen space
      vec.copy(pos).project(camera);

      // Distance to center (0,0) in NDC
      const d = vec.lengthSq();

      // Check if it's in front of camera (z < 1) and reasonably close to center
      if (vec.z < 1 && d < minDist) {
        minDist = d;
        closestBubble = bubble;
      }
    }

    // Threshold for "center": 0.8 NDC radius (approx 40% of screen width)
    if (closestBubble && minDist < 0.8) {
      const bubblePos = new THREE.Vector3(...closestBubble.position);

      // --- Distance Snapping (Friction) ---
      // Ideal distance logic:
      // We want the bubble to be comfortably visible.
      // Heuristic: Distance = Scale * Factor.
      // Factor ~5.0 ensures full visibility.
      const idealDistFromBubble = closestBubble.scale * 5.0;

      // Current setup: Camera -> Origin (Target) <- Bubble
      // Camera radius from origin
      const camRadius = camera.position.distanceTo(target);
      const bubbleRadius = bubblePos.distanceTo(target);

      // If we are looking "past" the bubble at the origin,
      // ideal Camera Radius = Bubble Radius + Ideal Distance
      // const idealCamRadius = bubbleRadius + idealDistFromBubble;

      // Zone where friction applies:
      // From: ideal viewing distance + some buffer (e.g. scale * 6)
      // To: bubble surface (bubbleRadius + scale * 0.5)

      const farLimit = bubbleRadius + closestBubble.scale * 6.0;
      const nearLimit = bubbleRadius + closestBubble.scale * 0.5;

      if (camRadius < farLimit && camRadius > nearLimit) {
        // Calculate progress through the friction zone (0 = far, 1 = near)
        const distToBubble = camRadius - nearLimit;
        const zoneWidth = farLimit - nearLimit;

        // t goes from 0 (at far limit) to 1 (at near limit)
        const t = 1.0 - distToBubble / zoneWidth;

        // Apply friction based on t.
        // Base friction: 1.0 (no friction)
        // Max friction: 0.1 (10% speed)
        // Quadratic curve for smooth onset
        const friction = 1.0 - 0.9 * (t * t);

        // eslint-disable-next-line
        orbitControls.zoomSpeed = baseZoomSpeed * friction;
      }
    }
  });

  return null;
};

export default function BubbleScene({
  mode = 'gallery',
  projects,
  enableExplosion = false,
  explosionDelay = 0,
  transparent = false,
  onOpenCard,
  enableBlur = false,
  paused = false,
  welcomeVideo,
  enableRefraction = false,
  rotationSpeed = 0.01,
  zoomSpeed = 0.5,
  backgroundColor,
}: {
  mode?: 'home' | 'gallery';
  projects?: Project[];
  enableExplosion?: boolean;
  explosionDelay?: number;
  transparent?: boolean;
  onOpenCard?: (project: Project) => void;
  enableBlur?: boolean;
  paused?: boolean;
  welcomeVideo?: string;
  showPlayGrid?: boolean;
  enableRefraction?: boolean;
  rotationSpeed?: number;
  zoomSpeed?: number;
  backgroundColor?: string;
}) {
  const isMobile = useIsMobile();
  const userInteractionRef = useRef(false);
  const isDraggingRef = useRef(false);
  const { setCursor } = useCursor();

  const [showWelcomeVideo, setShowWelcomeVideo] = useState(false);

  // Generate bubbles here to pass to both Bubbles and MagneticCamera
  const bubbles = useMemo(() => {
    let count = 14;
    if (mode === 'gallery' && projects) {
      count = projects.length;
    }
    return generateBubbles(count, mode, projects || []);
  }, [mode, projects]);

  useEffect(() => {
    if (!welcomeVideo) return;

    const lastVisit = localStorage.getItem('last_visit_date');
    const today = new Date().toDateString();

    if (lastVisit !== today) {
      setTimeout(() => setShowWelcomeVideo(true), 0);
      localStorage.setItem('last_visit_date', today);
    }
  }, [welcomeVideo]);

  const handleVideoEnd = () => {
    setShowWelcomeVideo(false);
  };

  const glConfig = useMemo(() => ({
    antialias: true,
    toneMapping: THREE.NoToneMapping,
    alpha: transparent,
    preserveDrawingBuffer: true,
  }), [transparent]);

  // Reset cursor when navigating away or component unmounts
  useEffect(() => {
    return () => {
      setCursor('default');
    };
  }, [setCursor]);

  return (
    <div className={`w-full h-screen cursor-none relative`}>
      <AnimatePresence>
        {showWelcomeVideo && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          >
            <video
              src={welcomeVideo}
              className="w-full h-full object-cover"
              autoPlay
              muted
              playsInline
              onEnded={handleVideoEnd}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        camera={{ position: [0, 0, 20], fov: 50 }}
        gl={glConfig}
      >
        <ambientLight intensity={3} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        {backgroundColor && (
          <color attach="background" args={[backgroundColor]} />
        )}
        {!transparent && !backgroundColor && (
          <color attach="background" args={['#efefef']} />
        )}
        <Environment preset="studio" />
        <CameraAdjuster userInteractionRef={userInteractionRef} />
        <ControlsSpeedAdjuster />
        <MagneticCamera
          bubbles={bubbles}
          userInteractionRef={userInteractionRef}
          baseZoomSpeed={zoomSpeed}
        />
        <React.Suspense fallback={<Loader />}>
          <RotatingGroup speed={rotationSpeed} isDraggingRef={isDraggingRef}>
            <Bubbles
              bubbles={bubbles}
              onOpenCard={onOpenCard}
              enableExplosion={enableExplosion}
              explosionDelay={explosionDelay}
              enableBlur={enableBlur}
              isMobile={isMobile}
              enableRefraction={enableRefraction}
            />
          </RotatingGroup>
        </React.Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={60}
          autoRotate={false}
          autoRotateSpeed={0.5}
          rotateSpeed={0.5}
          zoomSpeed={zoomSpeed}
          onStart={() => {
            userInteractionRef.current = true;
            isDraggingRef.current = true;
          }}
          onEnd={() => {
            isDraggingRef.current = false;
          }}
        />
      </Canvas>
    </div>
  );
}
