'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Billboard,
  useTexture,
  Text,
  Environment,
  Float,
} from '@react-three/drei';
import * as THREE from 'three';
import { Project } from '@/types/project';

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
      position: [-1.8, 1.2, 0], // Moved slightly closer to center to overlap more
      scale: 3.5,
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
      position: [1.8, -0.8, 0.1], // Moved slightly closer to center
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
      const scale = 1 + Math.random() * 2; // Varying sizes

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
      const scale = 0.5 + Math.random() * 1.5;

      const position: [number, number, number] = [x, y, z];

      if (!checkCollision(position, scale, temp, 0.2)) {
        if (i < projects.length) {
          // Create bubble for project
          const project = projects[i];
          temp.push({
            id: i,
            position,
            scale: Math.max(scale, 1.5), // Make project bubbles slightly larger
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
}: {
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
}) => {
  const router = useRouter();
  const groupRef = useRef<THREE.Group>(null);

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (e: any) => {
    // Check if the event has 'delta' (distance moved) and it's small enough to be a click, not a drag
    if (e.delta !== undefined && e.delta > 5) return;

    if (link) {
      e.stopPropagation();
      router.push(link);
    } else if (type === 'image' && onOpenCard && project) {
      e.stopPropagation();
      onOpenCard(project);
    }
  };

  const handlePointerOver = () => {
    if (link) {
      document.body.style.cursor = 'pointer';
    }
  };

  const handlePointerOut = () => {
    if (link) {
      document.body.style.cursor = 'auto';
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
}: {
  position: [number, number, number];
  scale: number;
  imageUrl: string;
  imageHoverUrl?: string;
  onClick: (e: THREE.Event) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) => {
  const textures = useTexture([imageUrl, imageHoverUrl || imageUrl]);
  const defaultTexture = textures[0];
  const hoverTexture = textures[1];

  const [hovered, setHovered] = useState(false);
  // Removed unused materialRef
  // const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  // Configure textures to fill the circle without stretching
  // We need to calculate aspect ratio and adjust repeat/offset
  // This mimics object-fit: cover
  useMemo(() => {
    [defaultTexture, hoverTexture].forEach((tex) => {
      if (!tex || !tex.image) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imageAspect = (tex.image as any).width / (tex.image as any).height;
      // Since our geometry is a circle (aspect 1:1), we just need to compare imageAspect to 1
      if (imageAspect > 1) {
        // Image is wider than it is tall
        tex.repeat.set(1 / imageAspect, 1);
        tex.offset.set((1 - 1 / imageAspect) / 2, 0);
      } else {
        // Image is taller than it is wide
        tex.repeat.set(1, imageAspect);
        tex.offset.set(0, (1 - imageAspect) / 2);
      }
      // Improve texture quality
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 16;
      tex.generateMipmaps = true;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
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
          materialRef.current.transparent = false;
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
        <mesh
          onClick={onClick}
          onPointerOver={() => {
            setHovered(true);
            onPointerOver();
          }}
          onPointerOut={() => {
            setHovered(false);
            onPointerOut();
          }}
        >
          <circleGeometry args={[scale, 128]} />
          <meshBasicMaterial
            ref={materialRef}
            map={hovered && imageHoverUrl ? hoverTexture : defaultTexture}
            side={THREE.DoubleSide}
            transparent={true}
            opacity={0}
            color="white"
          />
        </mesh>
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
}: {
  position: [number, number, number];
  scale: number;
  color?: string;
  type: 'solid' | 'glass';
  onClick: (e: THREE.Event) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  alphaMap?: THREE.Texture | null;
  label?: string;
  textOffset?: [number, number, number];
  isGradient?: boolean;
}) => {
  const [floatSpeed] = useState(() => 1.5 + Math.random());
  const [floatIntensity] = useState(() => 1 + Math.random());

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
        <mesh
          onClick={onClick}
          onPointerOver={onPointerOver}
          onPointerOut={onPointerOut}
        >
          <circleGeometry args={[scale, 128]} />
          {type === 'solid' ? (
            <meshBasicMaterial color={color} side={THREE.DoubleSide} />
          ) : isGradient ? (
            // Special case for Play bubble & Grey bubbles: Basic material with alpha map for 100% -> 20% gradient
            <meshBasicMaterial
              color={color}
              side={THREE.DoubleSide}
              transparent
              alphaMap={alphaMap || undefined}
              depthWrite={false} // Ensure it doesn't occlude things behind it weirdly
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
            fontWeight="bold"
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
}: {
  mode: 'home' | 'gallery';
  projects?: Project[];
  onOpenCard?: (project: Project) => void;
  enableExplosion?: boolean;
  explosionDelay?: number;
}) => {
  // Pass projects to generateBubbles
  const [bubbles] = useState(() => {
    let count = 20;
    if (mode === 'gallery' && projects) {
      count = projects.length;
    }
    return generateBubbles(count, mode, projects || []);
  });

  return (
    <>
      {bubbles.map((bubble) => (
        <Bubble
          key={bubble.id}
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
  const { camera, size } = useThree();
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    if (userInteractionRef.current) return;

    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const aspect = size.width / size.height;
    // Scene bounds: range +/- 7.5 plus bubble radius ~1.0 => ~8.5.
    // Diameter ~17. Add padding => 22.
    const targetSize = 22;
    const fovRad = (camera.fov * Math.PI) / 180;

    // Distance to fit height
    const distV = targetSize / 2 / Math.tan(fovRad / 2);

    // Distance to fit width (visible width = visible height * aspect)
    const distH = distV / aspect;

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
}: {
  mode?: 'home' | 'gallery';
  projects?: Project[];
  enableExplosion?: boolean;
  explosionDelay?: number;
  transparent?: boolean;
  onOpenCard?: (project: Project) => void;
}) {
  console.log('BubbleScene render. Mode:', mode, 'Projects:', projects?.length);

  const bgClass = transparent ? 'bg-transparent' : 'bg-[#F0F2F5]';
  const userInteractionRef = useRef(false);

  return (
    <div className={`w-full h-screen ${bgClass}`}>
      <Canvas
        camera={{ position: [0, 0, 20], fov: 50 }}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
          alpha: transparent,
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
