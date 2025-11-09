'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Avatar } from './Avatar';

export default function Avatar3D({ container = false }) {
  const containerClasses = container 
    ? "w-full h-full pointer-events-none"
    : "fixed bottom-0 right-0 w-64 h-screen md:w-[15%] z-20 pointer-events-none";
  
  return (
    <div className={containerClasses}>
      <div className="w-full h-full pointer-events-auto">
        <Canvas
          camera={{ position: [0, 0.6, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={0.5} />
          <pointLight position={[-5, -5, -5]} intensity={0.1} />
          <Avatar position={[0, -12.4, 0]} scale={[7.8, 7.8, 7.8]} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            // autoRotate
            // autoRotateSpeed={1}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
          />
          <Environment preset="warehouse" />
        </Canvas>
      </div>
    </div>
  );
}

