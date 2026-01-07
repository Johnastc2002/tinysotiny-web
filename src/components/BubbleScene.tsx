'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import ProjectCard from './ProjectCard';

interface BubbleData {
  id: number;
  position: [number, number, number];
  scale: number;
  imageUrl?: string;
  color?: string;
  type: 'image' | 'solid' | 'glass';
  link?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

const useSoftCircleTexture = () => {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Create a radial gradient that creates a soft, blurry edge
      const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); // Solid center
      gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)'); // Keep it solid longer (50% radius)
      gradient.addColorStop(0.85, 'rgba(255, 255, 255, 0.4)'); // Quick fade near the end
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent edge

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 512, 512);
    }
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);
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

const generateBubbles = (count: number, mode: 'home' | 'gallery') => {
  const temp: BubbleData[] = [];

  if (mode === 'home') {
    // 1. Red Bubble (Large, Solid)
    temp.push({
      id: 0,
      position: [4, 0, 4], // Moved further out to avoid collision
      scale: 5,
      color: '#ff0000',
      type: 'solid',
      link: '/play',
    });

    // 2. Blue Bubble (Large, Solid)
    temp.push({
      id: 1,
      position: [-4, 0, -4], // Moved further out to avoid collision
      scale: 5,
      color: '#0000ff',
      type: 'solid',
      link: '/work',
    });

    // 3. Grey Bubbles (Transparent, Glass/Blur)
    let attempts = 0;
    let i = 2;
    while (i < count && attempts < 500) {
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
          color: '#ffffff', // White
          type: 'glass',
        });
        i++;
      }
      attempts++;
    }
  } else {
    // Gallery Mode
    let attempts = 0;
    let i = 0;
    while (i < count && attempts < 500) {
      const x = (Math.random() - 0.5) * 20; // Increased range
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 20;
      const scale = 0.5 + Math.random() * 1.5;

      const position: [number, number, number] = [x, y, z];

      if (!checkCollision(position, scale, temp, 0.2)) {
        temp.push({
          id: i,
          position,
          scale,
          imageUrl: `https://picsum.photos/seed/${i + 123}/400`,
          type: 'image',
          title: `Project ${i}`,
          description:
            'This is a sample project description. It highlights the key aspects of the work done for the client, including the creative direction and execution details.',
          tags: ['PHOTOGRAPHY', 'ART DIRECTION', 'BRANDING'],
        });
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
  color,
  type,
  link,
  onOpenCard,
}: {
  position: [number, number, number];
  scale: number;
  imageUrl?: string;
  color?: string;
  type: 'image' | 'solid' | 'glass';
  link?: string;
  onOpenCard?: (data: BubbleData) => void;
}) => {
  const router = useRouter();

  const handleClick = (e: any) => {
    // Check if the event has 'delta' (distance moved) and it's small enough to be a click, not a drag
    if (e.delta !== undefined && e.delta > 5) return;

    if (link) {
      e.stopPropagation();
      router.push(link);
    } else if (type === 'image' && onOpenCard) {
      e.stopPropagation();
      // Pass self data
      onOpenCard({
        id: -1, // Placeholder
        position,
        scale,
        imageUrl,
        color,
        type,
        link,
        title: 'Project Title', // Default for now, in real app would come from props
        description: 'Project Description',
        tags: ['TAG1', 'TAG2'],
      } as BubbleData);
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

  const softTexture = useSoftCircleTexture();

  // Conditionally call useTexture only if type is 'image' and imageUrl is present
  // ... (comments retained)

  // Actually, standard practice for conditional hooks: split components.
  if (type === 'image' && imageUrl) {
    return (
      <ImageBubble
        position={position}
        scale={scale}
        imageUrl={imageUrl}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
    );
  }

  // Ensure type is 'solid' or 'glass' for ColorBubble
  const colorType = type === 'image' ? 'solid' : type;

  return (
    <ColorBubble
      position={position}
      scale={scale}
      color={color}
      type={colorType}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      alphaMap={softTexture}
    />
  );
};

const ImageBubble = ({
  position,
  scale,
  imageUrl,
  onClick,
  onPointerOver,
  onPointerOut,
}: {
  position: [number, number, number];
  scale: number;
  imageUrl: string;
  onClick: (e: THREE.Event) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
}) => {
  const texture = useTexture(imageUrl);
  return (
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
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
      </mesh>
    </Billboard>
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
}: {
  position: [number, number, number];
  scale: number;
  color?: string;
  type: 'solid' | 'glass';
  onClick: (e: THREE.Event) => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  alphaMap?: THREE.Texture | null;
}) => {
  return (
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
          <meshBasicMaterial
            color={color}
            side={THREE.DoubleSide}
            // Removed transparent/alphaMap/depthWrite to fix transmission issue
          />
        ) : (
          // For glass effect ...
          // ...
          <meshPhysicalMaterial
            color={color}
            side={THREE.DoubleSide}
            transparent
            opacity={1}
            roughness={0.4} // Back to 0.4 for distinct blur
            transmission={0.95} // High transmission to see the blur clearly
            thickness={3} // High thickness for strong blur volume
            ior={1.4} // Higher IOR to ensure refraction happens
            clearcoat={1}
            clearcoatRoughness={0.1}
            alphaMap={alphaMap || undefined}
            depthWrite={false} // Disable depth write to avoid hard z-buffer edges on the transparency
          />
        )}
      </mesh>
    </Billboard>
  );
};

const Bubbles = ({
  mode,
  onOpenCard,
}: {
  mode: 'home' | 'gallery';
  onOpenCard?: (data: BubbleData) => void;
}) => {
  const [bubbles] = useState(() => generateBubbles(20, mode));

  return (
    <>
      {bubbles.map((bubble) => (
        <Bubble
          key={bubble.id}
          position={bubble.position}
          scale={bubble.scale}
          imageUrl={bubble.imageUrl}
          color={bubble.color}
          type={bubble.type}
          link={bubble.link}
          onOpenCard={onOpenCard}
        />
      ))}
    </>
  );
};

const CameraAdjuster = () => {
  const { camera, size } = useThree();
  const controls = useThree((state) => state.controls);

  useEffect(() => {
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
  }, [size, camera, controls]);

  return null;
};

export default function BubbleScene({
  mode = 'gallery',
}: {
  mode?: 'home' | 'gallery';
}) {
  const bgClass = 'bg-[#F0F2F5]';
  const [selectedProject, setSelectedProject] = useState<BubbleData | null>(
    null
  );

  const handleOpenCard = (data: BubbleData) => {
    setSelectedProject(data);
  };

  const handleCloseCard = () => {
    setSelectedProject(null);
  };

  return (
    <div className={`w-full h-screen ${bgClass}`}>
      <ProjectCard
        isOpen={!!selectedProject}
        onClose={handleCloseCard}
        data={selectedProject}
      />
      <Canvas
        camera={{ position: [0, 0, 20], fov: 50 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={2} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <CameraAdjuster />
        <React.Suspense fallback={null}>
          <Bubbles mode={mode} onOpenCard={handleOpenCard} />
        </React.Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom={true}
          minDistance={5}
          maxDistance={60}
          autoRotate={true}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
