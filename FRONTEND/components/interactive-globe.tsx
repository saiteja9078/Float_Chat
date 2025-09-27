"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { OrbitControls, Sphere, Html, Environment } from "@react-three/drei"
import { TextureLoader } from "three"
import type * as THREE from "three"

// Globe component with Earth texture and interactive features
const Globe = () => {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Load Earth texture (using a placeholder that generates an Earth-like texture)
  const earthTexture = useLoader(TextureLoader, "/placeholder-115m1.png")

  // Auto-rotate the globe slowly
  useFrame((state, delta) => {
    if (meshRef.current && !hovered) {
      meshRef.current.rotation.y += delta * 0.1
    }
  })

  return (
    <Sphere
      ref={meshRef}
      args={[2, 64, 64]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <meshStandardMaterial map={earthTexture} roughness={0.8} metalness={0.1} />
    </Sphere>
  )
}

// Floating markers for points of interest
const FloatingMarker = ({
  position,
  label,
  color = "#3b82f6",
}: {
  position: [number, number, number]
  label: string
  color?: string
}) => {
  const markerRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (markerRef.current) {
      markerRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  return (
    <group>
      <mesh ref={markerRef} position={position}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <Html position={[position[0], position[1] + 0.3, position[2]]}>
        <div className="bg-blue-900/90 text-white px-2 py-1 rounded text-xs whitespace-nowrap backdrop-blur-sm border border-blue-600">
          {label}
        </div>
      </Html>
    </group>
  )
}

// Main Interactive Globe Component
const InteractiveGlobe = () => {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading time for textures
    const timer = setTimeout(() => setIsLoading(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  // Sample data points (latitude/longitude converted to 3D coordinates)
  const markers = [
    { position: [1.5, 0.8, 1.2] as [number, number, number], label: "New York", color: "#10b981" },
    { position: [-1.2, 0.5, 1.8] as [number, number, number], label: "London", color: "#f59e0b" },
    { position: [0.8, -1.2, 1.6] as [number, number, number], label: "Sydney", color: "#ef4444" },
    { position: [-0.5, 1.1, -1.7] as [number, number, number], label: "Tokyo", color: "#8b5cf6" },
  ]

  if (isLoading) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-blue-100 text-lg">Loading Globe...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      id="mapContainer"
      className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 relative overflow-hidden"
    >
      {/* Controls overlay */}
      <div className="absolute top-4 left-4 z-10 bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-600">
        <h3 className="text-blue-100 font-semibold mb-2">Globe Controls</h3>
        <div className="text-blue-200 text-sm space-y-1">
          <div>• Drag to rotate</div>
          <div>• Scroll to zoom</div>
          <div>• Auto-rotation when idle</div>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="absolute top-4 right-4 z-10 bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-600">
        <div className="text-blue-100 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Active Locations: 4</span>
          </div>
          <div className="text-blue-300 text-xs">Real-time data visualization</div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-blue-900/80 backdrop-blur-sm rounded-lg p-3 border border-blue-600">
        <h4 className="text-blue-100 font-medium mb-2 text-sm">Legend</h4>
        <div className="space-y-1 text-xs">
          {markers.map((marker, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: marker.color }}></div>
              <span className="text-blue-200">{marker.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 0, 5], fov: 60 }} style={{ background: "transparent" }}>
        {/* Lighting setup */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-5, -5, -5]} intensity={0.3} color="#3b82f6" />

        {/* Environment for reflections */}
        <Environment preset="night" />

        {/* Main Globe */}
        <Globe />

        {/* Floating markers */}
        {markers.map((marker, index) => (
          <FloatingMarker key={index} position={marker.position} label={marker.label} color={marker.color} />
        ))}

        {/* Orbit controls for interaction */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minDistance={3}
          maxDistance={10}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button className="w-10 h-10 bg-blue-800 hover:bg-blue-700 text-blue-100 rounded-lg shadow-md flex items-center justify-center transition-colors border border-blue-600">
          <span className="text-lg font-semibold">+</span>
        </button>
        <button className="w-10 h-10 bg-blue-800 hover:bg-blue-700 text-blue-100 rounded-lg shadow-md flex items-center justify-center transition-colors border border-blue-600">
          <span className="text-lg font-semibold">−</span>
        </button>
      </div>
    </div>
  )
}

export default InteractiveGlobe
