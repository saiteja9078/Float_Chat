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
        <div className="rounded-full border border-border bg-card/95 px-3 py-1 text-xs text-foreground shadow-lg shadow-black/10 whitespace-nowrap">
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
      <div className="w-full h-full min-h-[400px] rounded-3xl border border-border bg-card flex items-center justify-center p-10">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-primary/50">
            <div className="h-6 w-6 rounded-full bg-primary/10 animate-ping" />
          </div>
          <div>
            <p className="text-base font-medium text-foreground">Preparing the 3D globe</p>
            <p className="text-sm text-muted-foreground">Ocean data overlays load in just a moment.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div id="mapContainer" className="relative h-full w-full">
      <div className="relative h-full w-full overflow-hidden rounded-3xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-muted" aria-hidden />

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
            enableZoom
            enableRotate
            minDistance={3}
            maxDistance={10}
            autoRotate={false}
            autoRotateSpeed={0.5}
          />
        </Canvas>

        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-card/95 p-4 shadow-lg shadow-black/5">
              <h3 className="text-sm font-semibold text-foreground">Globe Controls</h3>
              <p className="text-xs text-muted-foreground mt-1">Matches the Float Chat feel with cleaner spacing.</p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>• Drag to rotate</li>
                <li>• Scroll or pinch to zoom</li>
                <li>• Auto-rotation resumes when idle</li>
              </ul>
            </div>

            <div className="pointer-events-auto w-full max-w-xs rounded-2xl border border-border bg-card/95 p-4 shadow-lg shadow-black/5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Live snapshot</p>
              <div className="mt-3 space-y-2 text-sm text-foreground">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Active locations</span>
                  <span className="font-semibold">4</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Observations/min</span>
                  <span className="font-semibold">58</span>
                </div>
                <div className="text-xs text-muted-foreground">Synthetic sample data for layout parity.</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="pointer-events-auto w-full max-w-xs rounded-2xl border border-border bg-card/95 p-4 shadow-lg shadow-black/5">
              <h4 className="text-sm font-semibold text-foreground">Legend</h4>
              <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                {markers.map((marker, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: marker.color }} />
                    <span>{marker.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-auto flex flex-col gap-2">
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/90 text-foreground shadow-md transition-colors hover:bg-muted">
                <span className="text-lg font-semibold">+</span>
              </button>
              <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/90 text-foreground shadow-md transition-colors hover:bg-muted">
                <span className="text-lg font-semibold">−</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InteractiveGlobe
