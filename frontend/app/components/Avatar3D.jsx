'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Avatar } from './Avatar';

export default function Avatar3D() {
  return (
    <div className="fixed bottom-0 right-0 w-64 h-screen md:w-[30%] z-20 pointer-events-none">
      <div className="w-full h-full pointer-events-auto">
        <Canvas
          camera={{ position: [0, -1, 5], fov: 50 }}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <pointLight position={[-5, -5, -5]} intensity={0.5} />
          <Avatar position={[0, -7.1, 0]} scale={[3.5, 3.5, 3.5]} />
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            // autoRotate
            // autoRotateSpeed={1}
            minPolarAngle={Math.PI / 3}
            maxPolarAngle={Math.PI / 1.5}
          />
          <Environment preset="sunset" />
        </Canvas>
      </div>
    </div>
  );
}

