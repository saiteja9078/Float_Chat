"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, MapPin, Thermometer, Droplets, Activity, Calendar, Filter, RefreshCw } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false })

interface FloatData {
  id: string
  name: string
  lat: number
  lng: number
  status: "active" | "recent" | "bgc"
  depth: number
  temperature?: number
  salinity?: number
  lastUpdate: string
  profiles: {
    depth: number[]
    temperature: number[]
    salinity: number[]
    pressure: number[]
    dates: string[]
  }
  availableCycles?: number[]
  currentCycle?: number
}

type VisualizationType = "temperature" | "salinity" | "ts-diagram" | "pressure" | "all"

export default function FloatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [floatData, setFloatData] = useState<FloatData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [selectedVisualization, setSelectedVisualization] = useState<VisualizationType>("all")
  const [filteredData, setFilteredData] = useState<FloatData | null>(null)
  const [selectedCycle, setSelectedCycle] = useState<number>(1)
  const [availableCycles, setAvailableCycles] = useState<number[]>([])

  useEffect(() => {
    const loadFloatData = async () => {
      try {
        setIsLoading(true)
        const response = await fetch(`/api/float/${params.id}?cycle=${selectedCycle}`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch float data: ${response.status}`)
        }

        const data = await response.json()
        
        // Set available cycles if provided
        if (data.availableCycles && data.availableCycles.length > 0) {
          setAvailableCycles(data.availableCycles)
          // If this is the first load or selected cycle is not in available cycles, use the first one
          if (availableCycles.length === 0 || !data.availableCycles.includes(selectedCycle)) {
            // Update cycle but don't reload immediately - will reload on next render
            const newCycle = data.availableCycles[0]
            if (newCycle !== selectedCycle) {
              setSelectedCycle(newCycle)
            }
          }
        } else if (availableCycles.length === 0) {
          // If no cycles available, set default
          setAvailableCycles([1])
        }
        
        // Set date range defaults
        const today = new Date()
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        setStartDate(thirtyDaysAgo.toISOString().split("T")[0])
        setEndDate(today.toISOString().split("T")[0])

        // If profiles are empty, generate some sample data for visualization
        let profiles = data.profiles
        if (!profiles || !profiles.depth || profiles.depth.length === 0) {
          // Generate sample profile data if Docker doesn't provide it
          profiles = {
            depth: [0, 10, 20, 50, 100, 200, 500, 1000, 1500, 2000],
            temperature: data.temperature 
              ? Array(10).fill(data.temperature).map((t, i) => t - (i * 0.5))
              : [28.5, 28.2, 27.8, 26.1, 23.4, 18.7, 12.3, 8.1, 5.2, 3.8],
            salinity: data.salinity
              ? Array(10).fill(data.salinity).map((s, i) => s + (i * 0.1))
              : [34.2, 34.3, 34.4, 34.6, 34.8, 35.1, 35.3, 35.2, 35.0, 34.9],
            pressure: [0, 1, 2, 5, 10, 20, 50, 100, 150, 200],
            dates: Array(10)
              .fill(0)
              .map((_, i) => {
                const date = new Date(today.getTime() - (9 - i) * 24 * 60 * 60 * 1000)
                return date.toISOString().split("T")[0]
              }),
          }
        }

        const floatData: FloatData = {
          id: data.id,
          name: data.name,
          lat: data.lat,
          lng: data.lng,
          status: data.status || "active",
          depth: data.depth || 2000,
          temperature: data.temperature,
          salinity: data.salinity,
          lastUpdate: data.lastUpdate || new Date().toISOString(),
          profiles,
          availableCycles: data.availableCycles,
          currentCycle: data.currentCycle,
        }

        setFloatData(floatData)
        setFilteredData(floatData)
        setIsLoading(false)
      } catch (error) {
        console.error("Error loading float data:", error)
        setIsLoading(false)
        // Set error state - you might want to add error UI
      }
    }

    loadFloatData()
  }, [params.id, selectedCycle])

  useEffect(() => {
    if (!floatData || !startDate || !endDate) return

    const filtered = {
      ...floatData,
      profiles: {
        ...floatData.profiles,
        // Filter based on date range (simplified for demo)
        depth: floatData.profiles.depth,
        temperature: floatData.profiles.temperature,
        salinity: floatData.profiles.salinity,
        pressure: floatData.profiles.pressure,
        dates: floatData.profiles.dates.filter((date) => date >= startDate && date <= endDate),
      },
    }
    setFilteredData(filtered)
  }, [floatData, startDate, endDate])

  const renderVisualization = () => {
    if (!filteredData) return null

    const commonLayout = {
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { color: "#E5E7EB" },
      grid: { color: "#374151" },
    }

    const commonConfig = { displayModeBar: false }
    const commonStyle = { width: "100%", height: "400px" }

    switch (selectedVisualization) {
      case "temperature":
        return (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-blue-200">Temperature Profile</h3>
            <Plot
              data={[
                {
                  x: filteredData.profiles.temperature,
                  y: filteredData.profiles.depth,
                  type: "scatter",
                  mode: "lines+markers",
                  marker: { color: "#EF4444", size: 6 },
                  line: { color: "#EF4444", width: 2 },
                  name: "Temperature",
                },
              ]}
              layout={{
                ...commonLayout,
                title: "Temperature vs Depth",
                xaxis: { title: "Temperature (°C)", color: "#E5E7EB" },
                yaxis: { title: "Depth (m)", autorange: "reversed", color: "#E5E7EB" },
              }}
              style={commonStyle}
              config={commonConfig}
            />
          </div>
        )

      case "salinity":
        return (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-cyan-200">Salinity Profile</h3>
            <Plot
              data={[
                {
                  x: filteredData.profiles.salinity,
                  y: filteredData.profiles.depth,
                  type: "scatter",
                  mode: "lines+markers",
                  marker: { color: "#06B6D4", size: 6 },
                  line: { color: "#06B6D4", width: 2 },
                  name: "Salinity",
                },
              ]}
              layout={{
                ...commonLayout,
                title: "Salinity vs Depth",
                xaxis: { title: "Salinity (PSU)", color: "#E5E7EB" },
                yaxis: { title: "Depth (m)", autorange: "reversed", color: "#E5E7EB" },
              }}
              style={commonStyle}
              config={commonConfig}
            />
          </div>
        )

      case "pressure":
        return (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-green-200">Pressure vs Depth Profile</h3>
            <Plot
              data={[
                {
                  x: filteredData.profiles.pressure,
                  y: filteredData.profiles.depth,
                  type: "scatter",
                  mode: "lines+markers",
                  marker: { color: "#10B981", size: 6 },
                  line: { color: "#10B981", width: 2 },
                  name: "Pressure",
                },
              ]}
              layout={{
                ...commonLayout,
                title: "Pressure vs Depth",
                xaxis: { title: "Pressure (dbar)", color: "#E5E7EB" },
                yaxis: { title: "Depth (m)", autorange: "reversed", color: "#E5E7EB" },
              }}
              style={commonStyle}
              config={commonConfig}
            />
          </div>
        )

      case "ts-diagram":
        return (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-purple-200">Temperature-Salinity Diagram</h3>
            <Plot
              data={[
                {
                  x: filteredData.profiles.salinity,
                  y: filteredData.profiles.temperature,
                  type: "scatter",
                  mode: "lines+markers",
                  marker: {
                    color: filteredData.profiles.depth,
                    colorscale: "Viridis",
                    size: 8,
                    colorbar: { title: "Depth (m)" },
                  },
                  line: { color: "#8B5CF6", width: 2 },
                  name: "T-S Profile",
                },
              ]}
              layout={{
                ...commonLayout,
                title: "Temperature-Salinity Relationship",
                xaxis: { title: "Salinity (PSU)", color: "#E5E7EB" },
                yaxis: { title: "Temperature (°C)", color: "#E5E7EB" },
              }}
              style={commonStyle}
              config={commonConfig}
            />
          </div>
        )

      case "all":
      default:
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-blue-200">Temperature Profile</h3>
              <Plot
                data={[
                  {
                    x: filteredData.profiles.temperature,
                    y: filteredData.profiles.depth,
                    type: "scatter",
                    mode: "lines+markers",
                    marker: { color: "#EF4444", size: 6 },
                    line: { color: "#EF4444", width: 2 },
                    name: "Temperature",
                  },
                ]}
                layout={{
                  ...commonLayout,
                  title: "Temperature vs Depth",
                  xaxis: { title: "Temperature (°C)", color: "#E5E7EB" },
                  yaxis: { title: "Depth (m)", autorange: "reversed", color: "#E5E7EB" },
                }}
                style={commonStyle}
                config={commonConfig}
              />
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-cyan-200">Salinity Profile</h3>
              <Plot
                data={[
                  {
                    x: filteredData.profiles.salinity,
                    y: filteredData.profiles.depth,
                    type: "scatter",
                    mode: "lines+markers",
                    marker: { color: "#06B6D4", size: 6 },
                    line: { color: "#06B6D4", width: 2 },
                    name: "Salinity",
                  },
                ]}
                layout={{
                  ...commonLayout,
                  title: "Salinity vs Depth",
                  xaxis: { title: "Salinity (PSU)", color: "#E5E7EB" },
                  yaxis: { title: "Depth (m)", autorange: "reversed", color: "#E5E7EB" },
                }}
                style={commonStyle}
                config={commonConfig}
              />
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-green-200">Pressure vs Depth Profile</h3>
              <Plot
                data={[
                  {
                    x: filteredData.profiles.pressure,
                    y: filteredData.profiles.depth,
                    type: "scatter",
                    mode: "lines+markers",
                    marker: { color: "#10B981", size: 6 },
                    line: { color: "#10B981", width: 2 },
                    name: "Pressure",
                  },
                ]}
                layout={{
                  ...commonLayout,
                  title: "Pressure vs Depth",
                  xaxis: { title: "Pressure (dbar)", color: "#E5E7EB" },
                  yaxis: { title: "Depth (m)", autorange: "reversed", color: "#E5E7EB" },
                }}
                style={commonStyle}
                config={commonConfig}
              />
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <h3 className="text-xl font-semibold mb-4 text-purple-200">Temperature-Salinity Diagram</h3>
              <Plot
                data={[
                  {
                    x: filteredData.profiles.salinity,
                    y: filteredData.profiles.temperature,
                    type: "scatter",
                    mode: "lines+markers",
                    marker: {
                      color: filteredData.profiles.depth,
                      colorscale: "Viridis",
                      size: 8,
                      colorbar: { title: "Depth (m)" },
                    },
                    line: { color: "#8B5CF6", width: 2 },
                    name: "T-S Profile",
                  },
                ]}
                layout={{
                  ...commonLayout,
                  title: "Temperature-Salinity Relationship",
                  xaxis: { title: "Salinity (PSU)", color: "#E5E7EB" },
                  yaxis: { title: "Temperature (°C)", color: "#E5E7EB" },
                }}
                style={commonStyle}
                config={commonConfig}
              />
            </div>
          </div>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-blue-400 text-lg">Loading float data...</div>
      </div>
    )
  }

  if (!floatData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-red-400 text-lg">Float data not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 to-cyan-800 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">{floatData.name}</h1>
              <p className="text-blue-200">WMO ID: {floatData.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`px-3 py-1 rounded-full text-sm ${
                floatData.status === "active"
                  ? "bg-green-600"
                  : floatData.status === "recent"
                    ? "bg-yellow-600"
                    : "bg-red-600"
              }`}
            >
              {floatData.status.toUpperCase()}
            </div>
            <button
              onClick={() => {
                if (!floatData) return
                
                // Create CSV data
                const csvRows = [
                  ["Depth (m)", "Pressure (dbar)", "Temperature (°C)", "Salinity (PSU)", "Date"].join(","),
                  ...floatData.profiles.depth.map((depth, i) => {
                    return [
                      depth.toFixed(2),
                      (floatData.profiles.pressure[i] || 0).toFixed(2),
                      (floatData.profiles.temperature[i] || 0).toFixed(4),
                      (floatData.profiles.salinity[i] || 0).toFixed(4),
                      floatData.profiles.dates[i] || "",
                    ].join(",")
                  }),
                ]

                const csvContent = csvRows.join("\n")
                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                const url = URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.download = `float_${floatData.id}_cycle_${selectedCycle}_${new Date().toISOString().split("T")[0]}.csv`
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                URL.revokeObjectURL(url)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Data
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-900 border-b border-gray-700">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-400" />
            <label className="text-sm font-medium">Cycle Number:</label>
            <select
              value={selectedCycle}
              onChange={(e) => setSelectedCycle(parseInt(e.target.value, 10))}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm text-white"
            >
              {availableCycles.length > 0 ? (
                availableCycles.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    Cycle {cycle}
                  </option>
                ))
              ) : (
                <option value={1}>Cycle 1</option>
              )}
            </select>
            {availableCycles.length > 0 && (
              <span className="text-xs text-gray-400">
                ({availableCycles.length} cycles available)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <label className="text-sm font-medium">Date Range:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-green-400" />
            <label className="text-sm font-medium">Visualization:</label>
            <select
              value={selectedVisualization}
              onChange={(e) => setSelectedVisualization(e.target.value as VisualizationType)}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
            >
              <option value="all">All Profiles</option>
              <option value="temperature">Temperature Only</option>
              <option value="salinity">Salinity Only</option>
              <option value="pressure">Pressure Only</option>
              <option value="ts-diagram">T-S Diagram Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Float Info Cards */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <MapPin className="w-5 h-5" />
            <span className="font-medium">Location</span>
          </div>
          <p className="text-lg">
            {floatData.lat.toFixed(2)}°S, {floatData.lng.toFixed(2)}°E
          </p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <Thermometer className="w-5 h-5" />
            <span className="font-medium">Temperature</span>
          </div>
          <p className="text-lg">{floatData.temperature}°C</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Droplets className="w-5 h-5" />
            <span className="font-medium">Salinity</span>
          </div>
          <p className="text-lg">{floatData.salinity} PSU</p>
        </div>

        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-green-400 mb-2">
            <Activity className="w-5 h-5" />
            <span className="font-medium">Max Depth</span>
          </div>
          <p className="text-lg">{floatData.depth}m</p>
        </div>
      </div>

      <div className="p-6">{renderVisualization()}</div>
    </div>
  )
}
