"use client"

import { useEffect, useRef, useState } from "react"
import Globe from "react-globe.gl"

interface CountryData {
  type: string
  features: Array<{
    type: string
    properties: {
      NAME: string
      [key: string]: any
    }
    geometry: any
  }>
}

export default function ReactGlobeComponent() {
  const globeEl = useRef<any>()
  const [countries, setCountries] = useState<CountryData | null>(null)

  useEffect(() => {
    // Load world countries GeoJSON data
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((res) => res.json())
      .then((data) => {
        setCountries(data)
      })
      .catch((error) => {
        console.error("Error loading GeoJSON data:", error)
      })
  }, [])

  useEffect(() => {
    if (globeEl.current) {
      // Auto-rotate the globe
      globeEl.current.controls().autoRotate = true
      globeEl.current.controls().autoRotateSpeed = 0.5
    }
  }, [])

  return (
    <div className="w-full h-screen bg-blue-900 relative">
      <div className="absolute inset-0" id="mapContainer">
        <Globe
          ref={globeEl}
          globeImageUrl={null}
          // Country polygons
          polygonsData={countries?.features || []}
          polygonAltitude={0.01}
          polygonCapColor={() => "rgba(229, 231, 235, 0.8)"}
          polygonSideColor={() => "rgba(229, 231, 235, 0.6)"}
          polygonStrokeColor={() => "#ffffff"}
          polygonLabel={({ properties }: any) => `
            <div style="
              background: rgba(30, 58, 138, 0.9);
              padding: 8px 12px;
              border-radius: 6px;
              color: white;
              font-family: system-ui, sans-serif;
              font-size: 14px;
              border: 1px solid rgba(255, 255, 255, 0.3);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            ">
              <strong>${properties.NAME}</strong>
            </div>
          `}
          atmosphereColor="#1e40af"
          atmosphereAltitude={0.15}
          // Controls
          enablePointerInteraction={true}
          // Sizing
          width={typeof window !== "undefined" ? window.innerWidth : 800}
          height={typeof window !== "undefined" ? window.innerHeight : 600}
          backgroundColor="rgba(30, 58, 138, 1)"
        />
      </div>

      {/* Loading indicator */}
      {!countries && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-900">
          <div className="text-white text-lg">Loading globe...</div>
        </div>
      )}

      {/* Controls info */}
      <div className="absolute bottom-4 left-4 bg-blue-800/80 backdrop-blur-sm text-white p-4 rounded-lg text-sm border border-blue-600/50">
        <div className="font-semibold mb-2 text-blue-300">Globe Controls:</div>
        <div className="space-y-1">
          <div>• Drag to rotate globe</div>
          <div>• Scroll to zoom in/out</div>
          <div>• Hover countries for names</div>
        </div>
      </div>
    </div>
  )
}
