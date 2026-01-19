"use client";

import { Environment, useGLTF } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";

// Preload the model to avoid pop-in
useGLTF.preload("/models/panda_head_meme.glb");

function Model({
  url,
  mouse
}: {
  url: string;
  mouse: React.MutableRefObject<{ x: number; y: number }>;
}) {
  const { scene } = useGLTF(url);
  const meshRef = useRef<THREE.Group>(null);

  const { viewport } = useThree();
  const isMobile = viewport.width < 5; // Approximate threshold for mobile in Three.js units (usually ~ 3-4 on phone)

  useFrame((state) => {
    if (!meshRef.current) return;

    // Smooth rotation based on mouse/gyro values
    const targetX = mouse.current.y * 0.1;
    const targetY = mouse.current.x * 0.1;

    // Responsive Configuration
    let targetRotationX = 0.1;
    let targetRotationY = -0.8;
    let targetPosX = 3.5;
    let targetPosY = -0.5;

    if (isMobile) {
      // Mobile: Center, Bottom, Looking slightly up
      targetRotationX = -0.2; // Look up
      targetRotationY = 0; // Face forward
      targetPosX = 0; // Centered
      targetPosY = -2.0; // Bottom of screen
    }

    // Lerp current rotation to target
    meshRef.current.rotation.x = THREE.MathUtils.lerp(
      meshRef.current.rotation.x,
      targetRotationX + targetX,
      0.05
    );
    meshRef.current.rotation.y = THREE.MathUtils.lerp(
      meshRef.current.rotation.y,
      targetRotationY + targetY,
      0.05
    );

    // Lerp position for smooth responsive transition (optional but nice)
    meshRef.current.position.x = THREE.MathUtils.lerp(meshRef.current.position.x, targetPosX, 0.1);
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      targetPosY + Math.sin(state.clock.elapsedTime * 0.3) * 0.1,
      0.1
    );
  });

  return (
    <primitive
      ref={meshRef}
      object={scene}
      scale={isMobile ? 2.8 : 4.0} // Smaller on mobile
      rotation={[0, 0, 0]} // Controlled in useFrame
    />
  );
}

export const ThreeBackground = () => {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma !== null && event.beta !== null) {
        mouse.current.x = Math.min(Math.max(event.gamma / 45, -1), 1);
        mouse.current.y = Math.min(Math.max(event.beta / 45, -1), 1);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    if (window.DeviceOrientationEvent) {
      window.addEventListener("deviceorientation", handleOrientation as any);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("deviceorientation", handleOrientation as any);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-20 grayscale-[0.2]">
      {/* Camera adjusted to looking slightly from left (-1) but mostly centered on content logic */}
      <Canvas camera={{ position: [-1, -1, 7], fov: 40 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <spotLight
            position={[2, 5, 5]}
            angle={0.5}
            penumbra={1}
            intensity={2}
            castShadow
            color="#ffffff"
          />
          <spotLight position={[-5, 0, 2]} angle={0.6} intensity={3} color="#3b82f6" />
          <pointLight position={[0, -5, 2]} intensity={0.5} color="#ffffff" />

          <Environment preset="city" />
          <Model url="/models/panda_head_meme.glb" mouse={mouse} />
        </Suspense>
      </Canvas>
      <div className="from-background/30 via-background/60 to-background/90 absolute inset-0 bg-linear-to-b" />
    </div>
  );
};
