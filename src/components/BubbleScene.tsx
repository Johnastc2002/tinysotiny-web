'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Canvas,
  useThree,
  useFrame,
  ThreeEvent,
  invalidate,
} from '@react-three/fiber';
import {
  OrbitControls,
  Billboard,
  useTexture,
  Text,
  Environment,
  Float,
  Html,
} from '@react-three/drei';
import * as THREE from 'three';
import { Project } from '@/types/project';
import { useCursor } from '@/context/CursorContext';
import { InteractionCursor } from './BubbleActions';

interface Shader {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uniforms: { [uniform: string]: { value: any } };
  vertexShader: string;
  fragmentShader: string;
}

export const BUBBLE_COLORS = {
  PLAY: '#001EFF',
  WORK: '#0F2341',
  GREY: '#d6d6d6',
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

  if (mode === 'home') {
    // 1. Play Bubble (Blue, Gradient, Left side, Behind Work)
    temp.push({
      id: 0,
      position: [-1.8, 1.8, 0.5], // Moved slightly closer to center to overlap more
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
      position: [1.8, -1.8, 0], // Moved slightly closer to center
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

    while (i < targetCount && attempts < 500) {
      const x = (Math.random() - 0.5) * 25; // Increased range
      const y = (Math.random() - 0.5) * 25;
      const z = (Math.random() - 0.5) * 25;
      const scale = 0.8 + Math.random() * 3.5; // Wider range of sizes

      const position: [number, number, number] = [x, y, z];

      if (!checkCollision(position, scale, temp, 0.2)) {
        temp.push({
          id: i,
          position,
          scale,
          color: BUBBLE_COLORS.GREY, // Corrected Grey
          type: 'glass',
          isGradient: true,
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
      const x = (Math.random() - 0.5) * 20;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      const scale = 0.8 + Math.random() * 2.0; // Wider random range

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
            color: BUBBLE_COLORS.GREY,
            type: 'glass',
            isGradient: true,
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
    e.stopPropagation(); // Stop propagation to bubbles behind
    setHoveredId(id);
    if (link) {
      setCursor('label');
    } else if (label === 'play') {
      setCursor('label', 'game on!');
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

  // Actually, standard practice for conditional hooks: split components.
  if (type === 'image' && imageUrl) {
    return (
      <group ref={groupRef} position={enableExplosion ? undefined : position}>
        <ImageBubble
          position={[0, 0, 0]} // Relative to group
          scale={scale}
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
        position={[0, 0, 0]} // Relative to group
        scale={scale}
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
      />
    </group>
  );
};

const ImageBubble = ({
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
  const [cursorPos, setCursorPos] = useState<[number, number, number] | null>(
    null
  );

  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
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

  const [floatSpeed] = useState(() => 1.5 + Math.random());
  const [floatIntensity] = useState(() => 1 + Math.random());

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
      floatingRange={[-0.2, 0.2]}
    >
      <Billboard
        position={position}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        {/* Interaction Mesh - exact size */}
        <mesh
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onPointerMove={(e) => {
            const local = e.object.worldToLocal(e.point.clone());
            setCursorPos([local.x, local.y, local.z]);
          }}
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
                  // Sample texture with scaled UVs and Mipmap Bias for Blur
                  vec4 sampledDiffuseColor = texture2D( map, scaledUv, uBlur );
                  
                  // Optional: Mix with white to simulate frosted glass look as it gets blurry
                  // sampledDiffuseColor.rgb = mix(sampledDiffuseColor.rgb, vec3(1.0), min(uBlur * 0.1, 0.5));
                  
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
        {isHovered && (
          <group
            position={
              cursorPos ? [cursorPos[0], cursorPos[1], cursorPos[2]] : [0, 0, 0]
            }
          >
            {/* Removed Html cursor as we use global cursor now */}
          </group>
        )}
      </Billboard>
    </Float>
  );
};

const ColorBubble = ({
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
  isHovered,
}: {
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
}) => {
  const [floatSpeed] = useState(() => 1.5 + Math.random());
  const [floatIntensity] = useState(() => 1 + Math.random());
  const [cursorPos, setCursorPos] = useState<[number, number, number] | null>(
    null
  );

  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const shaderRef = useRef<Shader>(null);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const camDir = useMemo(() => new THREE.Vector3(), []);

  // Padding for feathering (2.0x extra space)
  const PADDING_SCALE = 2.0;

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
    shader.uniforms.uScaleFactor = { value: PADDING_SCALE };

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
      
      // The original radius (0.5) is now at 0.5 / uScaleFactor in UV space
      float originalRadius = 0.5 / uScaleFactor;
      
      float alphaFeather = 1.0;
      
      // Feather OUTSIDE the original radius
      if (dist > originalRadius) {
         // Map dist from [originalRadius, originalRadius + uFeather] to [1, 0]
         float featherWidth = max(uFeather, 0.0001);
         alphaFeather = 1.0 - smoothstep(originalRadius, originalRadius + featherWidth, dist);
      }
      
      // Hard clip at geometry edge
      if (dist > 0.495) alphaFeather = 0.0;
      
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
      <Billboard
        position={position}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        {/* Interaction Mesh */}
        <mesh
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
          onPointerMove={(e) => {
            const local = e.object.worldToLocal(e.point.clone());
            setCursorPos([local.x, local.y, local.z]);
          }}
        >
          <circleGeometry args={[scale, 32]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        <mesh ref={meshRef} raycast={() => null}>
          {/* Use padded geometry if blur is enabled to allow feathering space */}
          <circleGeometry
            args={[scale * (enableBlur ? PADDING_SCALE : 1.0), 128]}
          />
          {type === 'solid' ? (
            <meshBasicMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent={true} // Must be true for feathering
              onBeforeCompile={enableBlur ? onBeforeCompile : undefined}
            />
          ) : isGradient ? (
            // Special case for Play bubble & Grey bubbles: Basic material with alpha map for 100% -> 20% gradient
            <meshBasicMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent
              alphaMap={alphaMap || undefined}
              depthWrite={false} // Ensure it doesn't occlude things behind it weirdly
              onBeforeCompile={enableBlur ? onBeforeCompile : undefined}
            />
          ) : (
            // Revert to MeshPhysicalMaterial for stability and performance.
            // Using transparent={false} to enable the native transmission blur effect in Three.js
            <meshPhysicalMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent={false} // Transmission requires transparent=false to blur background correctly
              opacity={1} // Ignored when transparent=false
              roughness={0.6} // Blur strength
              transmission={0.5} // Controls how "see-through" it is (simulating opacity)
              thickness={3} // Volume for light scattering
              ior={1.2}
              clearcoat={0}
              alphaMap={alphaMap || undefined}
              depthWrite={false} // Should be false for transparency, but true can help sorting issues. Keep false for now.
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
      </Billboard>
    </Float>
  );
};

const RotatingGroup = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.05;
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
  mode,
  projects,
  onOpenCard,
  enableExplosion,
  explosionDelay,
  enableBlur,
}: {
  mode: 'home' | 'gallery';
  projects?: Project[];
  onOpenCard?: (project: Project) => void;
  enableExplosion?: boolean;
  explosionDelay?: number;
  enableBlur?: boolean;
}) => {
  // Pass projects to generateBubbles
  const [bubbles] = useState(() => {
    let count = 20;
    if (mode === 'gallery' && projects) {
      count = projects.length;
    }
    return generateBubbles(count, mode, projects || []);
  });

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

  return (
    <>
      {bubbles.map((bubble) => (
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
        />
      ))}
    </>
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

export default function BubbleScene({
  mode = 'gallery',
  projects,
  enableExplosion = false,
  explosionDelay = 0,
  transparent = false,
  onOpenCard,
  enableBlur = false,
  paused = false,
}: {
  mode?: 'home' | 'gallery';
  projects?: Project[];
  enableExplosion?: boolean;
  explosionDelay?: number;
  transparent?: boolean;
  onOpenCard?: (project: Project) => void;
  enableBlur?: boolean;
  paused?: boolean;
}) {
  console.log('BubbleScene render. Mode:', mode, 'Projects:', projects?.length);

  const bgClass = transparent ? 'bg-transparent' : 'bg-[#F0F2F5]';
  const userInteractionRef = useRef(false);

  useEffect(() => {
    if (!paused) {
      invalidate();
    }
  }, [paused]);

  return (
    <div className={`w-full h-screen ${bgClass} cursor-none`}>
      <Canvas
        frameloop={paused ? 'never' : 'always'}
        camera={{ position: [0, 0, 20], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
          alpha: transparent,
          preserveDrawingBuffer: true,
        }}
      >
        <ambientLight intensity={3} />
        <pointLight position={[10, 10, 10]} intensity={2} />
        {!transparent && <color attach="background" args={['#F0F2F5']} />}
        <Environment preset="studio" />
        <CameraAdjuster userInteractionRef={userInteractionRef} />
        <React.Suspense fallback={<Loader />}>
          <RotatingGroup>
            <Bubbles
              mode={mode}
              projects={projects}
              onOpenCard={onOpenCard}
              enableExplosion={enableExplosion}
              explosionDelay={explosionDelay}
              enableBlur={enableBlur}
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
          onStart={() => {
            userInteractionRef.current = true;
          }}
        />
      </Canvas>
    </div>
  );
}
