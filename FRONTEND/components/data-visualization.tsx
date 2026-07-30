"use client"

import React, { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from "recharts"
import { BarChart3, Download, Maximize2, Minimize2, MapPin, Calendar, TrendingUp, X } from 'lucide-react'
import { useCoordinates } from "@/lib/coordinate-context"

type SummaryStatsObject = {
  mean?: number
  average?: number
  samples?: number
  count?: number
}

type SummaryStats = SummaryStatsObject | number | null | undefined

const isSummaryStatsObject = (value: SummaryStats): value is SummaryStatsObject =>
  typeof value === "object" && value !== null

interface DataVisualizationProps {
  data: any
  isDarkMode?: boolean
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ data, isDarkMode = false }) => {
  const [selectedFloat, setSelectedFloat] = useState<string>("")
  const [selectedCycle, setSelectedCycle] = useState<string>("")
  const [selectedParameters, setSelectedParameters] = useState<string[]>([])
  const [chartType, setChartType] = useState<"line" | "scatter" | "area">("line")
  const [plotType, setPlotType] = useState<"profile" | "timeseries">("profile")
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>("")
  const { addCoordinate, selectedCoordinates } = useCoordinates()

  const theme = {
    bg: "bg-background",
    cardBg: "bg-card",
    border: "border-border",
    text: "text-foreground",
    textSecondary: "text-muted-foreground",
    buttonBg: "bg-secondary",
    buttonHover: "hover:bg-muted",
    selectBg: "bg-secondary border-border",
  }

  const structuredData = useMemo(() => {
    if (!data || typeof data !== "object") return null

    const regions = Object.keys(data)
    const result: Record<string, any> = {}

    regions.forEach((region) => {
      const floats = Object.keys(data[region] || {})
      result[region] = {}

      floats.forEach((floatId) => {
        const floatEntry = data[region][floatId] || {}
        const cyclesSource = floatEntry?.cycles ?? floatEntry
        const summary = floatEntry?.summary ?? null

        const cycleKeys = Object.keys(cyclesSource || {}).filter((key) => key !== "summary" && !key.startsWith("__"))
        const processedCycles = cycleKeys.map((cycle) => {
          const cycleData = cyclesSource?.[cycle] || {}

          const parameters = Object.keys(cycleData).filter(
            (key) => Array.isArray(cycleData[key]) && key !== "juld" && key !== "latitude" && key !== "longitude",
          )

          const profileData: any = {}
          parameters.forEach((param) => {
            profileData[param] =
              cycleData[param]
                ?.map((value: number, index: number) => {
                  const cleanValue = value !== null && !isNaN(value) ? value : null
                  return {
                    depth: index * 10,
                    [param]: cleanValue,
                  }
                })
                .filter((point: any) => point[param] !== null) || []
          })

          return {
            cycle: Number.parseInt(cycle),
            ...cycleData,
            parameters,
            profileData,
          }
        })

        result[region][floatId] = {
          summary,
          cycles: processedCycles,
        }
      })
    })

    return result
  }, [data])

  const availableParameters = useMemo(() => {
    if (!structuredData) return []

    const allParams = new Set<string>()
    Object.values(structuredData).forEach((region: any) => {
      Object.values(region).forEach((floatData: any) => {
        floatData?.cycles?.forEach((cycle: any) => {
          cycle.parameters?.forEach((param: string) => allParams.add(param))
        })
      })
    })

    return Array.from(allParams)
  }, [structuredData])

  const regions = structuredData ? Object.keys(structuredData) : []
  const floats = selectedRegion && structuredData ? Object.keys(structuredData[selectedRegion] || {}) : []
  const cycles =
    selectedFloat && selectedRegion && structuredData
      ? structuredData[selectedRegion]?.[selectedFloat]?.cycles?.map((c: any) => c.cycle.toString()) || []
      : []

  React.useEffect(() => {
    if (regions.length > 0 && !selectedRegion) {
      setSelectedRegion(regions[0])
    }

    if (!structuredData) {
      return
    }

    if (selectedRegion && !selectedFloat) {
      const firstFloat = Object.keys(structuredData[selectedRegion] || {})[0]
      if (firstFloat) {
        setSelectedFloat(firstFloat)
        if (structuredData[selectedRegion][firstFloat]?.cycles?.length > 0) {
          setSelectedCycle(structuredData[selectedRegion][firstFloat].cycles[0].cycle.toString())
        }
      }
    }

    if (availableParameters.length > 0 && selectedParameters.length === 0) {
      setSelectedParameters([availableParameters[0]])
    }
  }, [structuredData, regions, selectedRegion, selectedFloat, availableParameters, selectedParameters.length])

  const chartData = useMemo(() => {
    if (!structuredData || !selectedRegion || !selectedFloat || !selectedParameters.length) return []

    const floatData = structuredData[selectedRegion]?.[selectedFloat]?.cycles

    if (plotType === "timeseries") {
      return (
        floatData
          ?.map((cycleData: any) => {
            const point: any = {
              date: new Date(cycleData.juld).getTime(),
              dateStr: new Date(cycleData.juld).toLocaleDateString(),
              cycle: cycleData.cycle,
              latitude: cycleData.latitude,
              longitude: cycleData.longitude,
            }

            selectedParameters.forEach((param) => {
              const values = cycleData[param]?.filter((v: number) => v !== null && !isNaN(v)) || []
              point[param] =
                values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : null
            })

            return point
          })
          .filter((point: any) => selectedParameters.some((param) => point[param] !== null)) || []
      )
    } else {
      if (!selectedCycle) return []

      const cycleData = floatData?.find((c: any) => c.cycle.toString() === selectedCycle)
      if (!cycleData) return []

      const maxLength = Math.max(...selectedParameters.map((param) => cycleData[param]?.length || 0))

      return Array.from({ length: maxLength }, (_, index) => {
        const point: any = { depth: index * 10 }
        selectedParameters.forEach((param) => {
          const value = cycleData[param]?.[index]
          point[param] = value !== null && !isNaN(value) ? value : null
        })
        return point
      }).filter((point: any) => selectedParameters.some((param) => point[param] !== null))
    }
  }, [structuredData, selectedRegion, selectedFloat, selectedCycle, selectedParameters, plotType])

  const selectedCycleData = useMemo(() => {
    if (!structuredData || !selectedRegion || !selectedFloat || !selectedCycle) return null

    return structuredData[selectedRegion]?.[selectedFloat]?.cycles?.find((c: any) => c.cycle.toString() === selectedCycle)
  }, [structuredData, selectedRegion, selectedFloat, selectedCycle])

  const selectedFloatSummary = useMemo<Record<string, SummaryStats> | null>(() => {
    if (!structuredData || !selectedRegion || !selectedFloat) return null
    return (structuredData[selectedRegion]?.[selectedFloat]?.summary as Record<string, SummaryStats>) || null
  }, [structuredData, selectedRegion, selectedFloat])

  const summaryEntries = useMemo(() => {
    if (!selectedFloatSummary) return []

    const entries = Object.entries(selectedFloatSummary)
    return entries
      .map(([param, stats]) => {
        if (stats === null || stats === undefined) return null
        if (typeof stats === "number") {
          return { param, mean: stats, samples: null }
        }
        if (isSummaryStatsObject(stats)) {
          const mean =
            typeof stats.mean === "number" ? stats.mean : typeof stats.average === "number" ? stats.average : null
          const samples =
            typeof stats.samples === "number" ? stats.samples : typeof stats.count === "number" ? stats.count : null
          if (mean === null || mean === undefined) return null
          return { param, mean, samples }
        }
        return null
      })
      .filter((entry): entry is { param: string; mean: number; samples: number | null } => entry !== null)
      .sort((a, b) => a.param.localeCompare(b.param))
  }, [selectedFloatSummary])

  const handleCoordinateClick = (lat: number, lng: number) => {
    addCoordinate(lat, lng, `Cycle ${selectedCycle || "Time Series"}`)
    console.log("[v0] Coordinate added to globe:", { lat, lng })
  }

  const getParameterColor = (param: string, index: number) => {
    const colors = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#06B6D4",
      "#84CC16",
      "#F97316",
      "#EC4899",
      "#6366F1",
    ]
    return colors[index % colors.length]
  }

  const renderChart = () => {
    const colors = {
      grid: "#37393b",
      text: "#a0a0a0",
    }

    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 },
    }

    const xAxisLabel = plotType === "timeseries" ? "Date" : "Depth (m)"
    const xAxisKey = plotType === "timeseries" ? "date" : "depth"
    const yAxisLabel =
      selectedParameters.length === 1
        ? `${selectedParameters[0].charAt(0).toUpperCase() + selectedParameters[0].slice(1)}`
        : "Value"

    switch (chartType) {
      case "scatter":
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey={xAxisKey}
              stroke={colors.text}
              {...(plotType === "timeseries" && {
                type: "number",
                scale: "time",
                domain: ["dataMin", "dataMax"],
                tickFormatter: (value) => new Date(value).toLocaleDateString(),
              })}
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -10,
                style: { textAnchor: "middle", fill: colors.text },
              }}
            />
            <YAxis
              stroke={colors.text}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: colors.text },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#2a2a2a",
                border: `1px solid #37393b`,
                borderRadius: "8px",
                color: colors.text,
              }}
              {...(plotType === "timeseries" && {
                labelFormatter: (value) => new Date(value).toLocaleDateString(),
              })}
            />
            <Legend />
            {selectedParameters.map((param, index) => (
              <Scatter
                key={param}
                dataKey={param}
                fill={getParameterColor(param, index)}
                name={param.charAt(0).toUpperCase() + param.slice(1)}
              />
            ))}
          </ScatterChart>
        )

      case "area":
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey={xAxisKey}
              stroke={colors.text}
              {...(plotType === "timeseries" && {
                type: "number",
                scale: "time",
                domain: ["dataMin", "dataMax"],
                tickFormatter: (value) => new Date(value).toLocaleDateString(),
              })}
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -10,
                style: { textAnchor: "middle", fill: colors.text },
              }}
            />
            <YAxis
              stroke={colors.text}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: colors.text },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#2a2a2a",
                border: `1px solid #37393b`,
                borderRadius: "8px",
                color: colors.text,
              }}
              {...(plotType === "timeseries" && {
                labelFormatter: (value) => new Date(value).toLocaleDateString(),
              })}
            />
            <Legend />
            {selectedParameters.map((param, index) => (
              <Area
                key={param}
                type="monotone"
                dataKey={param}
                stroke={getParameterColor(param, index)}
                fill={getParameterColor(param, index)}
                fillOpacity={0.3}
                name={param.charAt(0).toUpperCase() + param.slice(1)}
              />
            ))}
          </AreaChart>
        )

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
            <XAxis
              dataKey={xAxisKey}
              stroke={colors.text}
              {...(plotType === "timeseries" && {
                type: "number",
                scale: "time",
                domain: ["dataMin", "dataMax"],
                tickFormatter: (value) => new Date(value).toLocaleDateString(),
              })}
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: -10,
                style: { textAnchor: "middle", fill: colors.text },
              }}
            />
            <YAxis
              stroke={colors.text}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fill: colors.text },
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#2a2a2a",
                border: `1px solid #37393b`,
                borderRadius: "8px",
                color: colors.text,
              }}
              {...(plotType === "timeseries" && {
                labelFormatter: (value) => new Date(value).toLocaleDateString(),
              })}
            />
            <Legend />
            {selectedParameters.map((param, index) => (
              <Line
                key={param}
                type="monotone"
                dataKey={param}
                stroke={getParameterColor(param, index)}
                strokeWidth={2}
                dot={{ fill: getParameterColor(param, index), strokeWidth: 2, r: 3 }}
                name={param.charAt(0).toUpperCase() + param.slice(1)}
              />
            ))}
          </LineChart>
        )
    }
  }

  const handleExportData = () => {
    if (!chartData || chartData.length === 0) return

    const csv = [
      [
        plotType === "timeseries" ? "Date" : "Depth (m)",
        ...selectedParameters.map((p) => p.charAt(0).toUpperCase() + p.slice(1)),
      ],
      ...chartData.map((row: any) => [
        plotType === "timeseries" ? row.dateStr : row.depth,
        ...selectedParameters.map((p) => row[p] ?? ""),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `float-data-${selectedFloat}-cycle-${selectedCycle || "timeseries"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      className={`${isExpanded ? "fixed inset-4 z-50" : "mt-3"} ${theme.cardBg} border ${theme.border} rounded-lg shadow-lg`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${theme.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <h3 className={`font-semibold ${theme.text}`}>Oceanographic Data Visualization</h3>
          </div>
          {selectedCycleData && plotType === "profile" && (
            <div className="flex items-center gap-4 text-sm">
              <button
                onClick={() => handleCoordinateClick(selectedCycleData.latitude, selectedCycleData.longitude)}
                className={`flex items-center gap-1 ${theme.textSecondary} hover:text-blue-400 transition-colors cursor-pointer px-2 py-1 rounded hover:bg-white/10`}
              >
                <MapPin className="w-3 h-3" />
                {selectedCycleData.latitude?.toFixed(2)}°N, {selectedCycleData.longitude?.toFixed(2)}°E
              </button>
              <span className={`flex items-center gap-1 ${theme.textSecondary}`}>
                <Calendar className="w-3 h-3" />
                {new Date(selectedCycleData.juld).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 ${theme.buttonBg} ${theme.buttonHover} rounded-lg transition-colors`}
            title={isExpanded ? "Minimize" : "Expand"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {selectedCoordinates.length > 0 && (
        <div className={`p-3 border-b ${theme.border} flex items-center gap-2 flex-wrap`}>
          <span className={`text-sm font-medium ${theme.textSecondary}`}>
            {selectedCoordinates.length} point(s) on globe:
          </span>
          {selectedCoordinates.map((coord, index) => (
            <div key={index} className={`text-xs px-2 py-1 rounded bg-blue-600 text-white flex items-center gap-1`}>
              <MapPin className="w-3 h-3" />
              {coord.lat.toFixed(2)}°, {coord.lng.toFixed(2)}°
              {coord.label && <span className="opacity-75">({coord.label})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={`p-4 border-b ${theme.border} space-y-4`}>
        <div className="flex items-center gap-2">
          <label className={`text-sm font-medium ${theme.text}`}>Plot Type:</label>
          <div className="flex border rounded-md overflow-hidden">
            {(
              [
                { key: "profile", label: "Depth Profile", icon: BarChart3 },
                { key: "timeseries", label: "Time Series", icon: TrendingUp },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setPlotType(key)}
                className={`px-3 py-1 text-sm transition-colors flex items-center gap-1 ${
                  plotType === key ? "bg-blue-600 text-white" : `${theme.buttonBg} ${theme.buttonHover} ${theme.text}`
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${theme.text}`}>Region:</label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value)
                setSelectedFloat("")
                setSelectedCycle("")
              }}
              className={`px-3 py-1 text-sm border rounded-md ${theme.selectBg} ${theme.text}`}
            >
              {regions.map((region) => (
                <option key={region} value={region}>
                  {region.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${theme.text}`}>Float:</label>
            <select
              value={selectedFloat}
              onChange={(e) => {
                setSelectedFloat(e.target.value)
                setSelectedCycle("")
              }}
              className={`px-3 py-1 text-sm border rounded-md ${theme.selectBg} ${theme.text}`}
            >
              {floats.map((float) => (
                <option key={float} value={float}>
                  {float}
                </option>
              ))}
            </select>
          </div>

          {plotType === "profile" && (
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium ${theme.text}`}>Cycle:</label>
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className={`px-3 py-1 text-sm border rounded-md ${theme.selectBg} ${theme.text}`}
              >
                {cycles.map((cycle: string) => (
                  <option key={cycle} value={cycle}>
                    Cycle {cycle}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${theme.text}`}>Parameters:</label>
            <div className="flex flex-wrap gap-1">
              {availableParameters.map((param) => (
                <button
                  key={param}
                  onClick={() => {
                    setSelectedParameters((prev) =>
                      prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param],
                    )
                  }}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    selectedParameters.includes(param)
                      ? "bg-blue-600 text-white"
                      : `${theme.buttonBg} ${theme.buttonHover} ${theme.text}`
                  }`}
                >
                  {param.charAt(0).toUpperCase() + param.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className={`text-sm font-medium ${theme.text}`}>Chart Type:</label>
            <div className="flex border rounded-md overflow-hidden">
              {(["line", "scatter", "area"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`px-3 py-1 text-sm capitalize transition-colors ${
                    chartType === type
                      ? "bg-blue-600 text-white"
                      : `${theme.buttonBg} ${theme.buttonHover} ${theme.text}`
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleExportData}
            className={`ml-auto px-3 py-1 text-sm ${theme.buttonBg} ${theme.buttonHover} rounded-md transition-colors flex items-center gap-1`}
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

      {summaryEntries.length > 0 && (
        <div className={`p-4 border-b ${theme.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className={`text-sm font-semibold ${theme.text}`}>Parameter Averages</div>
            <div className={`text-xs ${theme.textSecondary}`}>
              Across retrieved cycles for {selectedFloat || "selected float"}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {summaryEntries.map(({ param, mean, samples }) => (
              <div key={param} className={`p-3 rounded-lg border ${theme.border} bg-muted`}>
                <div className={`text-xs uppercase tracking-wide ${theme.textSecondary}`}>{param}</div>
                <div className={`text-xl font-semibold ${theme.text}`}>{mean?.toFixed(2)}</div>
                {samples !== null && (
                  <div className={`text-xs ${theme.textSecondary}`}>{samples} measurements</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="p-4">
        <div className={`${isExpanded ? "h-96" : "h-64"} w-full`}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>

      {selectedCycleData && plotType === "profile" && (
        <div className={`p-4 border-t ${theme.border} grid grid-cols-2 md:grid-cols-4 gap-4`}>
          <div className="text-center">
            <div className={`text-2xl font-bold ${theme.text}`}>
              {selectedParameters.reduce((max, param) => Math.max(max, selectedCycleData[param]?.length || 0), 0)}
            </div>
            <div className={`text-sm ${theme.textSecondary}`}>Data Points</div>
          </div>
          {selectedParameters.slice(0, 3).map((param, index) => {
            const values = (selectedCycleData[param] || []).filter((v: number) => v !== null && !isNaN(v))
            const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0
            const colors = ["text-blue-600", "text-green-600", "text-purple-600"]

            return (
              <div key={param} className="text-center">
                <div className={`text-2xl font-bold ${colors[index]}`}>{avg.toFixed(1)}</div>
                <div className={`text-sm ${theme.textSecondary}`}>
                  Avg {param.charAt(0).toUpperCase() + param.slice(1)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default DataVisualization
