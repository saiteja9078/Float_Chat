"use client"

import { useState, useEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Maximize2, Minimize2, Download } from "lucide-react"

// Dynamically import react-globe.gl to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

interface ArgoFloat {
  id: string
  lat: number
  lng: number
  name: string
  status: "active" | "recent" | "bgc"
  depth: number
  temperature?: number
  salinity?: number
  lastUpdate: string
  trajectory?: { lat: number; lng: number }[]
}

interface GeographicLabel {
  lat: number
  lng: number
  name: string
  type: "ocean" | "sea" | "country"
  size: number
}

interface ArgoGlobe3DProps {
  isFullscreen?: boolean
  onToggleFullscreen?: () => void
}

const ArgoGlobe3D = ({ isFullscreen = false, onToggleFullscreen }: ArgoGlobe3DProps) => {
  const router = useRouter()
  const globeRef = useRef<any>()
  const containerRef = useRef<HTMLDivElement>(null)
  const [countries, setCountries] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })

  const argoFloats: ArgoFloat[] = [
    {
      id: "WMO_5906468",
      lat: -10.5,
      lng: 65.2,
      name: "Float Alpha",
      status: "active",
      depth: 2000,
      temperature: 24.5,
      salinity: 35.2,
      lastUpdate: "2024-01-15",
      trajectory: [
        { lat: -10.2, lng: 64.8 },
        { lat: -10.3, lng: 65.0 },
        { lat: -10.5, lng: 65.2 },
      ],
    },
    {
      id: "WMO_2903741",
      lat: -15.8,
      lng: 72.4,
      name: "Float Beta",
      status: "recent",
      depth: 1800,
      temperature: 22.1,
      salinity: 35.8,
      lastUpdate: "2024-01-14",
      trajectory: [
        { lat: -15.5, lng: 72.1 },
        { lat: -15.7, lng: 72.3 },
        { lat: -15.8, lng: 72.4 },
      ],
    },
    {
      id: "WMO_5906469",
      lat: -8.2,
      lng: 58.7,
      name: "Float Gamma",
      status: "bgc",
      depth: 2200,
      temperature: 25.8,
      salinity: 34.9,
      lastUpdate: "2024-01-15",
      trajectory: [
        { lat: -8.0, lng: 58.5 },
        { lat: -8.1, lng: 58.6 },
        { lat: -8.2, lng: 58.7 },
      ],
    },
    {
      id: "WMO_2903742",
      lat: -20.1,
      lng: 67.9,
      name: "Float Delta",
      status: "active",
      depth: 1950,
      temperature: 21.3,
      salinity: 35.5,
      lastUpdate: "2024-01-15",
      trajectory: [
        { lat: -19.8, lng: 67.6 },
        { lat: -19.9, lng: 67.8 },
        { lat: -20.1, lng: 67.9 },
      ],
    },
    {
      id: "WMO_5906470",
      lat: -12.7,
      lng: 75.3,
      name: "Float Epsilon",
      status: "recent",
      depth: 2100,
      temperature: 23.7,
      salinity: 35.1,
      lastUpdate: "2024-01-13",
      trajectory: [
        { lat: -12.4, lng: 75.0 },
        { lat: -12.6, lng: 75.2 },
        { lat: -12.7, lng: 75.3 },
      ],
    },
    {
      id: "WMO_2903743",
      lat: -5.4,
      lng: 62.8,
      name: "Float Zeta",
      status: "bgc",
      depth: 1750,
      temperature: 26.2,
      salinity: 34.7,
      lastUpdate: "2024-01-15",
      trajectory: [
        { lat: -5.2, lng: 62.5 },
        { lat: -5.3, lng: 62.7 },
        { lat: -5.4, lng: 62.8 },
      ],
    },
    {
      id: "WMO_3901234",
      lat: -18.3,
      lng: 55.1,
      name: "Float Eta",
      status: "active",
      depth: 1900,
      temperature: 20.8,
      salinity: 35.3,
      lastUpdate: "2024-01-15",
      trajectory: [
        { lat: -18.1, lng: 54.9 },
        { lat: -18.2, lng: 55.0 },
        { lat: -18.3, lng: 55.1 },
      ],
    },
    {
      id: "WMO_4902567",
      lat: -7.9,
      lng: 80.2,
      name: "Float Theta",
      status: "bgc",
      depth: 2300,
      temperature: 25.1,
      salinity: 34.8,
      lastUpdate: "2024-01-14",
      trajectory: [
        { lat: -7.7, lng: 79.9 },
        { lat: -7.8, lng: 80.1 },
        { lat: -7.9, lng: 80.2 },
      ],
    },
    {
      id: "WMO_5903890",
      lat: -25.6,
      lng: 70.4,
      name: "Float Iota",
      status: "recent",
      depth: 2050,
      temperature: 19.5,
      salinity: 35.7,
      lastUpdate: "2024-01-12",
      trajectory: [
        { lat: -25.4, lng: 70.1 },
        { lat: -25.5, lng: 70.3 },
        { lat: -25.6, lng: 70.4 },
      ],
    },
  ]

  const geographicLabels: GeographicLabel[] = [
    // Oceans
    { lat: -15, lng: 70, name: "Indian Ocean", type: "ocean", size: 2.5 },
    { lat: 0, lng: -30, name: "Atlantic Ocean", type: "ocean", size: 2 },
    { lat: 0, lng: 160, name: "Pacific Ocean", type: "ocean", size: 2 },

    // Seas and water bodies in Indian Ocean
    { lat: -25, lng: 35, name: "Mozambique Channel", type: "sea", size: 1.5 },
    { lat: 20, lng: 60, name: "Arabian Sea", type: "sea", size: 1.8 },
    { lat: 10, lng: 85, name: "Bay of Bengal", type: "sea", size: 1.8 },
    { lat: 25, lng: 55, name: "Persian Gulf", type: "sea", size: 1.2 },
    { lat: 15, lng: 45, name: "Red Sea", type: "sea", size: 1.2 },
    { lat: -35, lng: 20, name: "Agulhas Current", type: "sea", size: 1.0 },
    { lat: -10, lng: 55, name: "Mascarene Basin", type: "sea", size: 1.3 },
    { lat: -20, lng: 90, name: "Central Indian Basin", type: "sea", size: 1.4 },

    // Countries (Indian Ocean region)
    { lat: 20, lng: 77, name: "India", type: "country", size: 1.2 },
    { lat: 7, lng: 81, name: "Sri Lanka", type: "country", size: 0.8 },
    { lat: -20, lng: 47, name: "Madagascar", type: "country", size: 1 },
    { lat: -26, lng: 28, name: "South Africa", type: "country", size: 1.1 },
    { lat: -25, lng: 135, name: "Australia", type: "country", size: 1.3 },
    { lat: 25, lng: 55, name: "UAE", type: "country", size: 0.8 },
    { lat: 26, lng: 50, name: "Bahrain", type: "country", size: 0.6 },
    { lat: -21, lng: 55, name: "Mauritius", type: "country", size: 0.6 },
    { lat: -4, lng: 55, name: "Seychelles", type: "country", size: 0.6 },
    { lat: 0, lng: 43, name: "Somalia", type: "country", size: 0.9 },
    { lat: -12, lng: 45, name: "Comoros", type: "country", size: 0.5 },
    { lat: 23, lng: 58, name: "Oman", type: "country", size: 0.9 },
    { lat: -15, lng: 167, name: "Vanuatu", type: "country", size: 0.6 },
  ]

  useEffect(() => {
    fetch("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
      .then((res) => res.json())
      .then((data) => {
        setCountries(data.features)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error)
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current
        setDimensions({ width: clientWidth, height: clientHeight })
      }
    }

    updateDimensions()

    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: -15, lng: 70, altitude: 2.5 })
    }

    window.addEventListener("resize", updateDimensions)
    return () => window.removeEventListener("resize", updateDimensions)
  }, [isLoading, isFullscreen])

  const getFloatColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10B981" // Green
      case "recent":
        return "#F59E0B" // Yellow
      case "bgc":
        return "#EF4444" // Red
      default:
        return "#6B7280" // Gray
    }
  }

  const getLabelColor = (type: string) => {
    switch (type) {
      case "ocean":
        return "#3B82F6" // Blue
      case "sea":
        return "#06B6D4" // Cyan
      case "country":
        return "#F3F4F6" // Light gray
      default:
        return "#9CA3AF" // Gray
    }
  }

  const handleFloatClick = (floatData: ArgoFloat) => {
    console.log("[v0] Float clicked:", floatData.id)
    router.push(`/float/${floatData.id}`)
  }

  const downloadFloatPlot = () => {
    // Create a simple CSV data for the floats
    const csvData = [
      "Float_ID,Name,Latitude,Longitude,Status,Depth_m,Temperature_C,Salinity_PSU,Last_Update",
      ...argoFloats.map(
        (float) =>
          `${float.id},${float.name},${float.lat},${float.lng},${float.status},${float.depth},${float.temperature || "N/A"},${float.salinity || "N/A"},${float.lastUpdate}`,
      ),
    ].join("\n")

    // Create and download the file
    const blob = new Blob([csvData], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `argo_floats_data_${new Date().toISOString().split("T")[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)

    // Also create a simple plot data JSON for visualization tools
    const plotData = {
      title: "ARGO Floats Distribution - Indian Ocean",
      data: argoFloats.map((float) => ({
        id: float.id,
        name: float.name,
        coordinates: [float.lng, float.lat],
        status: float.status,
        depth: float.depth,
        temperature: float.temperature,
        salinity: float.salinity,
        lastUpdate: float.lastUpdate,
      })),
      metadata: {
        total_floats: argoFloats.length,
        active_floats: argoFloats.filter((f) => f.status === "active").length,
        recent_floats: argoFloats.filter((f) => f.status === "recent").length,
        bgc_floats: argoFloats.filter((f) => f.status === "bgc").length,
        region: "Indian Ocean",
        export_date: new Date().toISOString(),
      },
    }

    const jsonBlob = new Blob([JSON.stringify(plotData, null, 2)], { type: "application/json" })
    const jsonUrl = window.URL.createObjectURL(jsonBlob)
    const jsonA = document.createElement("a")
    jsonA.href = jsonUrl
    jsonA.download = `argo_floats_plot_data_${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(jsonA)
    jsonA.click()
    document.body.removeChild(jsonA)
    window.URL.revokeObjectURL(jsonUrl)
  }

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="text-blue-400 text-lg">Loading 3D Globe...</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-black relative">
      <div ref={containerRef} className="w-full h-full flex items-center justify-center">
        <Globe
          ref={globeRef}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          backgroundColor="rgba(0, 0, 0, 1)"
          polygonsData={countries}
          polygonAltitude={0.01}
          polygonCapColor={() => "rgba(59, 130, 246, 0.1)"}
          polygonSideColor={() => "rgba(59, 130, 246, 0.05)"}
          polygonStrokeColor={() => "#F3F4F6"}
          polygonLabel={({ properties }: any) => `
            <div style="background: rgba(0,0,0,0.8); padding: 8px; border-radius: 4px; color: white; font-size: 12px;">
              <strong>${properties.NAME}</strong>
            </div>
          `}
          pointsData={argoFloats}
          pointAltitude={0.02}
          pointRadius={0.8}
          pointColor={(d: any) => getFloatColor(d.status)}
          onPointClick={handleFloatClick}
          pointLabel={(d: any) => `
            <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 6px; color: white; font-size: 12px; max-width: 250px;">
              <strong>${d.name} (${d.id})</strong><br/>
              <strong>Status:</strong> ${d.status.toUpperCase()}<br/>
              <strong>Coordinates:</strong> ${d.lat.toFixed(2)}°S, ${d.lng.toFixed(2)}°E<br/>
              <strong>Max Depth:</strong> ${d.depth}m<br/>
              ${d.temperature ? `<strong>Sea Surface Temp:</strong> ${d.temperature}°C<br/>` : ""}
              ${d.salinity ? `<strong>Salinity:</strong> ${d.salinity} PSU<br/>` : ""}
              <strong>Last Profile:</strong> ${d.lastUpdate}<br/>
              <em>Click to view detailed analysis</em>
            </div>
          `}
          labelsData={geographicLabels}
          labelLat={(d: any) => d.lat}
          labelLng={(d: any) => d.lng}
          labelText={(d: any) => d.name}
          labelSize={(d: any) => d.size}
          labelColor={(d: any) => getLabelColor(d.type)}
          labelResolution={2}
          labelAltitude={0.05}
          enablePointerInteraction={true}
          atmosphereColor="#1E40AF"
          atmosphereAltitude={0.25}
          width={dimensions.width}
          height={dimensions.height}
        />
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={downloadFloatPlot}
          className="bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-green-600 hover:bg-green-900/50 transition-colors"
          title="Download Float Data & Plot"
        >
          <Download className="w-5 h-5 text-green-200" />
        </button>
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            className="bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-blue-600 hover:bg-blue-900/50 transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-blue-200" />
            ) : (
              <Maximize2 className="w-5 h-5 text-blue-200" />
            )}
          </button>
        )}
      </div>

      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-600">
        <div className="text-blue-200 text-sm font-medium">3D Globe View</div>
        <div className="text-blue-100 text-xs">Indian Ocean ARGO Network</div>
        <div className="text-blue-300 text-xs mt-1">9 Active Floats Tracked</div>
      </div>

      <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg border border-blue-600">
        <div className="text-blue-100 text-sm font-medium mb-2">ARGO Float Status</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-green-400">Active Floats</span>
            </div>
            <span className="text-green-400 font-mono">3</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-yellow-400">Recent Data</span>
            </div>
            <span className="text-yellow-400 font-mono">3</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-red-400">BGC Sensors</span>
            </div>
            <span className="text-red-400 font-mono">3</span>
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-blue-600">
        <div className="text-blue-100 text-xs space-y-1">
          <div>🖱️ Drag to rotate globe</div>
          <div>🔍 Scroll to zoom in/out</div>
          <div>📍 Hover for float details</div>
          <div>🌍 Click countries for info</div>
          <div>💾 Click download to export data</div>
        </div>
      </div>
    </div>
  )
}

export default ArgoGlobe3D
