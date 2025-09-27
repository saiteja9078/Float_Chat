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
import { BarChart3, Download, Maximize2, Minimize2, MapPin, Calendar, TrendingUp } from "lucide-react"

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

  const theme = {
    bg: isDarkMode ? "bg-gray-900" : "bg-white",
    cardBg: isDarkMode ? "bg-gray-800" : "bg-white",
    border: isDarkMode ? "border-gray-700" : "border-gray-200",
    text: isDarkMode ? "text-gray-100" : "text-gray-900",
    textSecondary: isDarkMode ? "text-gray-400" : "text-gray-600",
    buttonBg: isDarkMode ? "bg-gray-700" : "bg-gray-100",
    buttonHover: isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-200",
    selectBg: isDarkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300",
  }

  const structuredData = useMemo(() => {
    if (!data || typeof data !== "object") return null

    const regions = Object.keys(data)
    const result: any = {}

    regions.forEach((region) => {
      const floats = Object.keys(data[region])
      result[region] = {}

      floats.forEach((floatId) => {
        const cycles = Object.keys(data[region][floatId])
        result[region][floatId] = cycles.map((cycle) => {
          const cycleData = data[region][floatId][cycle]

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
                    depth: index * 10, // Assuming 10m intervals
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
      })
    })

    return result
  }, [data])

  const availableParameters = useMemo(() => {
    if (!structuredData) return []

    const allParams = new Set<string>()
    Object.values(structuredData).forEach((region: any) => {
      Object.values(region).forEach((floatData: any) => {
        floatData.forEach((cycle: any) => {
          cycle.parameters?.forEach((param: string) => allParams.add(param))
        })
      })
    })

    return Array.from(allParams)
  }, [structuredData])

  // Get available options for dropdowns
  const regions = structuredData ? Object.keys(structuredData) : []
  const floats = selectedRegion && structuredData ? Object.keys(structuredData[selectedRegion] || {}) : []
  const cycles =
    selectedFloat && selectedRegion && structuredData
      ? structuredData[selectedRegion]?.[selectedFloat]?.map((c: any) => c.cycle.toString()) || []
      : []

  React.useEffect(() => {
    if (regions.length > 0 && !selectedRegion) {
      setSelectedRegion(regions[0])
    }

    if (selectedRegion && !selectedFloat) {
      const firstFloat = Object.keys(structuredData[selectedRegion] || {})[0]
      if (firstFloat) {
        setSelectedFloat(firstFloat)
        if (structuredData[selectedRegion][firstFloat]?.length > 0) {
          setSelectedCycle(structuredData[selectedRegion][firstFloat][0].cycle.toString())
        }
      }
    }

    if (availableParameters.length > 0 && selectedParameters.length === 0) {
      setSelectedParameters([availableParameters[0]])
    }
  }, [structuredData, regions, selectedRegion, selectedFloat, availableParameters, selectedParameters.length])

  const chartData = useMemo(() => {
    if (!structuredData || !selectedRegion || !selectedFloat || !selectedParameters.length) return []

    const floatData = structuredData[selectedRegion]?.[selectedFloat]

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

            // Add average values for selected parameters
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

      // Combine all selected parameters into single depth profile
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

  // Get metadata for selected cycle
  const selectedCycleData = useMemo(() => {
    if (!structuredData || !selectedRegion || !selectedFloat || !selectedCycle) return null

    return structuredData[selectedRegion]?.[selectedFloat]?.find((c: any) => c.cycle.toString() === selectedCycle)
  }, [structuredData, selectedRegion, selectedFloat, selectedCycle])

  if (!structuredData || regions.length === 0) {
    return (
      <div className={`p-4 ${theme.cardBg} border ${theme.border} rounded-lg`}>
        <div className="flex items-center gap-2 text-orange-600">
          <BarChart3 className="w-5 h-5" />
          <span className="text-sm font-medium">No visualization data available</span>
        </div>
      </div>
    )
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
      grid: isDarkMode ? "#374151" : "#E5E7EB",
      text: isDarkMode ? "#D1D5DB" : "#374151",
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
                backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
                border: `1px solid ${isDarkMode ? "#374151" : "#E5E7EB"}`,
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
                backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
                border: `1px solid ${isDarkMode ? "#374151" : "#E5E7EB"}`,
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
                backgroundColor: isDarkMode ? "#1F2937" : "#FFFFFF",
                border: `1px solid ${isDarkMode ? "#374151" : "#E5E7EB"}`,
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
              <span className={`flex items-center gap-1 ${theme.textSecondary}`}>
                <MapPin className="w-3 h-3" />
                {selectedCycleData.latitude?.toFixed(2)}°N, {selectedCycleData.longitude?.toFixed(2)}°E
              </span>
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
                setSelectedFloat("") // Reset float selection when region changes
                setSelectedCycle("") // Reset cycle selection when region changes
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
                setSelectedCycle("") // Reset cycle selection when float changes
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
                {cycles.map((cycle) => (
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
            className={`ml-auto px-3 py-1 text-sm ${theme.buttonBg} ${theme.buttonHover} rounded-md transition-colors flex items-center gap-1`}
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </div>

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
