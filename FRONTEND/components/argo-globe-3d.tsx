"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter } from 'next/navigation'
import { Maximize2, Minimize2, Download, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useCoordinates } from "@/lib/coordinate-context"

// Dynamically import react-globe.gl to avoid SSR issues
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false })

interface ArgoFloat {
  id: string
  lat: number
  lng: number
  name: string
  status: string
  depth: number
  temperature?: number
  salinity?: number
  lastUpdate?: string
  location?: string
  cycles?: number
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

interface CustomPoint {
  lat: number
  lng: number
  name: string
  status: "custom"
  depth: number
  lastUpdate: string
}

type GlobePoint = ArgoFloat | CustomPoint

const ArgoGlobe3D = ({ isFullscreen = false, onToggleFullscreen }: ArgoGlobe3DProps) => {
  const router = useRouter()
  const globeRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [countries, setCountries] = useState([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [floatsLoading, setFloatsLoading] = useState(true)
  const [floatsError, setFloatsError] = useState<string | null>(null)
  const [argoFloats, setArgoFloats] = useState<ArgoFloat[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isStatusPanelMinimized, setIsStatusPanelMinimized] = useState(false)
  const [isTipsPanelMinimized, setIsTipsPanelMinimized] = useState(false)
  const { selectedCoordinates, removeCoordinate, clearCoordinates } = useCoordinates()
  const isLoading = countriesLoading || floatsLoading

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
        setCountries(data.features || [])
        setCountriesLoading(false)
      })
      .catch((error) => {
        console.error("Error loading GeoJSON:", error)
        setCountriesLoading(false)
      })
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    const loadFloats = async () => {
      try {
        const response = await fetch("/api/floats", { signal: controller.signal })

        if (!response.ok) {
          let errBody: any = null
          try {
            errBody = await response.json()
          } catch (e) {
            // ignore parse errors
          }
          const serverMsg = errBody?.error || `API responded with ${response.status}`
          throw new Error(serverMsg)
        }

        const payload = await response.json()
        setArgoFloats(payload.floats || [])
        setFloatsError(null)
      } catch (error: any) {
        if (error?.name === "AbortError") return
        console.error("[v0] Failed to load floats:", error)
        setFloatsError("Unable to load float metadata. Please try again later.")
      } finally {
        setFloatsLoading(false)
      }
    }

    loadFloats()

    return () => controller.abort()
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
    const normalized = (status || "").toLowerCase()

    switch (normalized) {
      case "active":
        return "#10B981"
      case "inactive":
        return "#F59E0B"
      case "bgc":
      case "biogeochemical":
        return "#EF4444"
      case "recent":
      case "deployed":
        return "#3B82F6"
      default:
        return "#9CA3AF"
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

  const formatCoordinate = (value: number, isLat: boolean) => {
    const suffix = isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W"
    return `${Math.abs(value).toFixed(2)}°${suffix}`
  }

  const isArgoFloat = (point: any): point is ArgoFloat => {
    return point && typeof point === "object" && "id" in point && typeof point.id === "string"
  }

  const handlePointClick = (rawPoint: any) => {
    const point = rawPoint as GlobePoint
    if (!isArgoFloat(point)) {
      return
    }

    console.log("[v0] Float clicked:", point.id)
    router.push(`/float/${point.id}`)
  }

  const customPoints: CustomPoint[] = selectedCoordinates.map((coord, index) => ({
    lat: coord.lat,
    lng: coord.lng,
    name: coord.label || `Selected Point ${index + 1}`,
    status: "custom",
    depth: 0,
    lastUpdate: new Date().toISOString(),
  }))

  const filteredFloats = useMemo(() => {
    if (statusFilter === "all") return argoFloats
    return argoFloats.filter((float) => (float.status || "").toLowerCase() === statusFilter)
  }, [argoFloats, statusFilter])

  const allPointsData: GlobePoint[] = useMemo(() => [...filteredFloats, ...customPoints], [filteredFloats, customPoints])

  const statusSummary = useMemo(() => {
    const counts: Record<string, number> = {}

    filteredFloats.forEach((float) => {
      const key = (float.status || "unknown").toLowerCase()
      counts[key] = (counts[key] || 0) + 1
    })

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [filteredFloats])

  const downloadFloatPlot = () => {
    // Create a simple CSV data for the floats
    const csvData = [
      "Float_ID,Name,Latitude,Longitude,Status,Depth_m,Temperature_C,Salinity_PSU,Last_Update",
      ...filteredFloats.map(
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
      data: filteredFloats.map((float) => ({
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
        total_floats: filteredFloats.length,
        active_floats: filteredFloats.filter((f) => f.status === "active").length,
        recent_floats: filteredFloats.filter((f) => f.status === "recent").length,
        bgc_floats: filteredFloats.filter((f) => f.status === "bgc").length,
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

  const getStatusBadgeStyles = (status: string) => {
    const normalized = status.toLowerCase()
    if (normalized === "active") {
      return { dot: "bg-green-500", text: "text-green-400" }
    }
    if (normalized === "inactive") {
      return { dot: "bg-yellow-500", text: "text-yellow-400" }
    }
    if (normalized === "bgc" || normalized === "biogeochemical") {
      return { dot: "bg-red-500", text: "text-red-400" }
    }
    if (normalized === "recent" || normalized === "deployed") {
      return { dot: "bg-blue-500", text: "text-blue-300" }
    }

    return { dot: "bg-slate-500", text: "text-slate-200" }
  }

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex items-center justify-center">
        <div className="text-blue-400 text-lg">Loading ARGO floats...</div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={containerRef} className="relative flex h-full w-full items-center justify-center">
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
          pointsData={allPointsData}
          pointAltitude={0.02}
          pointRadius={(d: any) => (d.status === "custom" ? 1.2 : 0.5)}
          pointColor={(rawPoint: any) => {
            const point = rawPoint as GlobePoint
            if (point.status === "custom") return "#60A5FA"
            return getFloatColor(point.status)
          }}
          onPointClick={handlePointClick}
          pointLabel={(rawPoint: any) => {
            const point = rawPoint as GlobePoint
            if (!isArgoFloat(point)) {
              return `
                <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 6px; color: white; font-size: 12px; max-width: 250px;">
                  <strong>📌 ${point.name}</strong><br/>
                  <strong>Coordinates:</strong> ${formatCoordinate(point.lat, true)}, ${formatCoordinate(point.lng, false)}<br/>
                  <em style="color: #60A5FA;">Selected from data visualization</em>
                </div>
              `
            }
            return `
              <div style="background: rgba(0,0,0,0.9); padding: 12px; border-radius: 6px; color: white; font-size: 12px; max-width: 250px;">
                <strong>Float ID: ${point.id}</strong><br/>
                <em style="color: #60A5FA;">Click to view detailed data</em>
              </div>
            `
          }}
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

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4">
          {floatsError && (
            <div className="pointer-events-auto w-full max-w-lg self-center rounded-2xl border border-red-200/70 bg-red-50/95 px-4 py-2 text-center text-sm text-red-800 shadow-lg shadow-red-500/10">
              {floatsError}
            </div>
          )}

          <div className="flex w-full flex-wrap items-start justify-between gap-4">
            {selectedCoordinates.length > 0 && (
              <div className="pointer-events-auto flex-1 min-w-[250px] rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-xl shadow-black/20">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Selected Points ({selectedCoordinates.length})</p>
                  <button
                    onClick={clearCoordinates}
                    className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted"
                    title="Clear all selected points"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                  {selectedCoordinates.map((coord, index) => (
                    <div
                      key={`${coord.lat}-${coord.lng}-${index}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/60 px-2 py-1 text-xs text-foreground"
                    >
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {formatCoordinate(coord.lat, true)}, {formatCoordinate(coord.lng, false)}
                      </span>
                      <button
                        onClick={() => removeCoordinate(index)}
                        className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background"
                        title="Remove this point"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pointer-events-auto flex flex-1 min-w-[240px] flex-wrap items-center justify-between gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs backdrop-blur-sm shadow-lg shadow-black/20">
              <div className="flex flex-wrap gap-1.5">
                {(["all", "active", "inactive"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium capitalize transition-colors ${
                      statusFilter === filter
                        ? "border-white/60 bg-white/20 text-white"
                        : "border-white/10 text-blue-100 hover:border-white/30"
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={downloadFloatPlot}
                  className="rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition-colors hover:border-white/40"
                  title="Download Float Data & Plot"
                >
                  <Download className="h-4 w-4 text-emerald-300" />
                </button>
                {onToggleFullscreen && (
                  <button
                    onClick={onToggleFullscreen}
                    className="rounded-full border border-white/15 bg-white/5 p-2 text-white/80 transition-colors hover:border-white/40"
                    title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4 text-sky-200" />
                    ) : (
                      <Maximize2 className="h-4 w-4 text-sky-200" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="pointer-events-auto w-full max-w-md rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
            <div 
              className="flex items-center justify-between px-3 py-3 text-[11px] uppercase tracking-wide text-white/60 cursor-pointer"
              onClick={() => setIsStatusPanelMinimized(!isStatusPanelMinimized)}
            >
              <p>Argo float status</p>
              <div className="flex items-center gap-2">
                <p>overview</p>
                {isStatusPanelMinimized ? (
                  <ChevronDown className="w-4 h-4 text-white/60" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-white/60" />
                )}
              </div>
            </div>
            {!isStatusPanelMinimized && (
              <div className="px-3 pb-3 space-y-1.5 text-xs text-white/80">
                {statusSummary.length === 0 && <div className="text-white/60 text-[11px]">No float data available.</div>}
                {statusSummary.map(([status, count]) => {
                  const styles = getStatusBadgeStyles(status)
                  return (
                    <div key={status} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${styles.dot}`}></div>
                        <span className="text-[11px] text-white/90">
                          {status.charAt(0).toUpperCase() + status.slice(1)} Floats
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-white/70">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pointer-events-auto w-full max-w-xs rounded-xl border border-white/15 bg-white/5 backdrop-blur-sm shadow-lg shadow-black/20">
            <div 
              className="flex items-center justify-between px-3 py-3 cursor-pointer"
              onClick={() => setIsTipsPanelMinimized(!isTipsPanelMinimized)}
            >
              <p className="text-xs font-semibold text-white">Quick tips</p>
              {isTipsPanelMinimized ? (
                <ChevronDown className="w-4 h-4 text-white/60" />
              ) : (
                <ChevronUp className="w-4 h-4 text-white/60" />
              )}
            </div>
            {!isTipsPanelMinimized && (
              <ul className="px-3 pb-3 mt-1.5 space-y-1 text-[11px] text-white/75">
                <li>🖱️ Drag to rotate globe</li>
                <li>🔍 Scroll / pinch to zoom</li>
                <li>📍 Hover for float details</li>
                <li>🌍 Tap countries for context</li>
                <li>💾 Export data any time</li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ArgoGlobe3D
