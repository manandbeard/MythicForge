import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

// A single die in the physics world
const Die = ({ type, position, targetValue, rollMode }: { type: number, position: [number, number, number], targetValue: number, rollMode: 'normal'|'advantage'|'disadvantage' }) => {
  const rigidBodyRef = useRef<any>(null);
  
  // To make it look like a die, we'll map the standard platonic solids based on the type
  let geometry;
  if (type === 4) geometry = <tetrahedronGeometry args={[1.2, 0]} />;
  else if (type === 6) geometry = <boxGeometry args={[1.3, 1.3, 1.3]} />;
  else if (type === 8) geometry = <octahedronGeometry args={[1.2, 0]} />;
  else if (type === 10) geometry = <dodecahedronGeometry args={[1.1, 0]} />; // Closest basic solid for visual shape
  else if (type === 12) geometry = <dodecahedronGeometry args={[1.3, 0]} />;
  else if (type === 20) geometry = <icosahedronGeometry args={[1.4, 0]} />;
  else geometry = <icosahedronGeometry args={[1.2, 0]} />; // Fallback

  useEffect(() => {
    const timer = setTimeout(() => {
      if (rigidBodyRef.current) {
        // Fetch the true physical mass calculated by Rapier based on the solid's volume
        // We multiply forces by mass so they all launch at exactly the same speed!
        const mass = rigidBodyRef.current.mass() || 1;

        const spinX = (Math.random() - 0.5) * 50 * mass;
        const spinY = (Math.random() - 0.5) * 50 * mass;
        const spinZ = (Math.random() - 0.5) * 50 * mass;
        
        const forceX = (Math.random() - 0.5) * 10 * mass;
        const forceY = -(5 + (Math.random() * 10)) * mass; // Throw DOWN lightly
        const forceZ = -(15 + (Math.random() * 15)) * mass; // Throw FORWARD hard (negative Z goes into the screen)
        
        rigidBodyRef.current.applyImpulse({ x: forceX, y: forceY, z: forceZ }, true);
        rigidBodyRef.current.applyTorqueImpulse({ x: spinX, y: spinY, z: spinZ }, true);
      }
    }, 100); // 100ms delay to ensure gravity and physics have initialized

    return () => clearTimeout(timer);
  }, [type]);

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={position} 
      colliders="hull" 
      restitution={0.6} // bump restitution slightly for better bounces
      friction={0.6} 
      angularDamping={0.4} 
      linearDamping={0.1}
    >
      <mesh castShadow receiveShadow>
        {geometry}
        <meshStandardMaterial 
          color={rollMode === 'advantage' ? "#10b981" : rollMode === 'disadvantage' ? "#6b21a8" : "#8b0000"} 
          roughness={0.2} 
          metalness={0.5} 
          envMapIntensity={2} 
        />
        {/* We just show the target value floating inside or on it roughly, keeping it simple without full UV mapping */}
      </mesh>
    </RigidBody>
  );
};

export default function Dice3DManager({ 
  dice, 
  onSettled 
}: { 
  dice: { type: number, targetValue: number, mode: 'normal'|'advantage'|'disadvantage' }[], 
  onSettled: () => void 
}) {
  // Spawn dice near the camera top edge, moving downwards
  const initialPositions = dice.map((_, i) => [(i * 3) - ((dice.length - 1) * 1.5), 6, 4 + (i % 2 === 0 ? 0.5 : 0)] as [number, number, number]);

  useEffect(() => {
    // Notify completion after 3 seconds as a fallback, but rely mostly on the user visually seeing it stop
    const timer = setTimeout(() => {
      onSettled();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onSettled]);

  return (
    <div className="absolute inset-0 z-10 w-full h-full pointer-events-none">
      <Canvas shadows camera={{ position: [0, 8, 5], fov: 45 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={2} castShadow />
        <Environment preset="city" />
        
        <Physics gravity={[0, -30, 0]}>
          {/* Invisible bounded box to keep dice in view */}
          <RigidBody type="fixed" position={[0, -2, 0]} restitution={0.4} friction={0.5}>
            <CuboidCollider args={[10, 0.5, 10]} />
          </RigidBody>
          <RigidBody type="fixed" position={[-5, 5, 0]} restitution={0.4} friction={0.5}>
            <CuboidCollider args={[0.5, 10, 10]} />
          </RigidBody>
          <RigidBody type="fixed" position={[5, 5, 0]} restitution={0.4} friction={0.5}>
            <CuboidCollider args={[0.5, 10, 10]} />
          </RigidBody>
          <RigidBody type="fixed" position={[0, 5, -5]} restitution={0.4} friction={0.5}>
            <CuboidCollider args={[10, 10, 0.5]} />
          </RigidBody>
          <RigidBody type="fixed" position={[0, 5, 5]} restitution={0.4} friction={0.5}>
            <CuboidCollider args={[10, 10, 0.5]} />
          </RigidBody>
          <RigidBody type="fixed" position={[0, 15, 0]} restitution={0.2} friction={0.5}>
            <CuboidCollider args={[10, 0.5, 10]} />
          </RigidBody>

          {dice.map((d, i) => (
             <Die 
               key={i} 
               type={d.type} 
               targetValue={d.targetValue} 
               position={initialPositions[i]} 
               rollMode={d.mode}
             />
          ))}
        </Physics>
      </Canvas>
    </div>
  );
}
