'use client';

import React, { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Billboard, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface BubbleData {
  id: number;
  position: [number, number, number];
  scale: number;
  imageUrl: string;
}

const generateBubbles = (count: number) => {
  const temp: BubbleData[] = [];
  for (let i = 0; i < count; i++) {
    // Random position within a range
    const x = (Math.random() - 0.5) * 15;
    const y = (Math.random() - 0.5) * 15;
    const z = (Math.random() - 0.5) * 15;
    // Random scale
    const scale = 0.5 + Math.random() * 1.5;

    temp.push({
      id: i,
      position: [x, y, z],
      scale,
      imageUrl: `https://picsum.photos/seed/${i + 123}/400`, // 400x400 square image
    });
  }
  return temp;
};

const Bubble = ({
  position,
  scale,
  imageUrl,
}: {
  position: [number, number, number];
  scale: number;
  imageUrl: string;
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
      <mesh>
        <circleGeometry args={[scale, 32]} />
        <meshBasicMaterial map={texture} side={THREE.DoubleSide} transparent />
      </mesh>
    </Billboard>
  );
};

const Bubbles = () => {
  const [bubbles] = useState(() => generateBubbles(20));

  return (
    <>
      {bubbles.map((bubble) => (
        <Bubble
          key={bubble.id}
          position={bubble.position}
          scale={bubble.scale}
          imageUrl={bubble.imageUrl}
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

export default function BubbleScene() {
  return (
    <div className="w-full h-screen bg-black">
      <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
        <CameraAdjuster />
        <React.Suspense fallback={null}>
          <Bubbles />
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
