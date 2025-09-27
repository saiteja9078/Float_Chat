import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { Calendar, Thermometer, MapPin, Waves, TrendingUp, Eye, Upload } from 'lucide-react';

const ArgoFloatVisualization = () => {
  const [floatData, setFloatData] = useState(null);
  const [selectedFloat, setSelectedFloat] = useState(null);
  const [viewMode, setViewMode] = useState('timeSeries');
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load data from results.json
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await fetch('/results.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const parsedData = await response.json();
        console.log('Loaded data:', parsedData);
        setFloatData(parsedData);
        
        // Set default selected float
        const floatIds = Object.keys(parsedData);
        if (floatIds.length > 0) {
          setSelectedFloat(floatIds[0]);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(`Failed to load results.json file: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Process data for visualization
  const processedData = useMemo(() => {
    if (!floatData || !selectedFloat) return { timeSeriesData: [], profileData: [], floatInfo: {} };
    
    const currentFloatData = floatData[selectedFloat] || {};
    const cycles = Object.keys(currentFloatData).sort((a, b) => parseInt(a) - parseInt(b));
    
    console.log(`Processing float ${selectedFloat}, cycles:`, cycles);
    
    // Time series data - surface and various depth temperatures
    const timeSeriesData = cycles.map(cycle => {
      const cycleData = currentFloatData[cycle];
      const temps = cycleData.temperature_adjusted || [];
      
      // Handle different date formats
      let date, dateString, timestamp;
      try {
        if (cycleData.juld) {
          date = new Date(cycleData.juld);
          if (isNaN(date.getTime())) {
            // Try parsing as a different format
            date = new Date(cycleData.juld.replace(' ', 'T'));
          }
          if (isNaN(date.getTime())) {
            // If still invalid, use current date as fallback
            console.warn(`Invalid date for cycle ${cycle}:`, cycleData.juld);
            date = new Date();
          }
          dateString = date.toISOString().split('T')[0];
          timestamp = date.getTime();
        } else {
          // No date available, use cycle as timestamp
          date = new Date();
          dateString = 'Unknown';
          timestamp = parseInt(cycle);
        }
      } catch (error) {
        console.error(`Error parsing date for cycle ${cycle}:`, error);
        date = new Date();
        dateString = 'Unknown';
        timestamp = parseInt(cycle);
      }
      
      console.log(`Cycle ${cycle}:`, { 
        originalDate: cycleData.juld, 
        parsedDate: dateString, 
        tempCount: temps.length 
      });
      
      return {
        cycle: cycle,
        cycleNumber: parseInt(cycle),
        date: dateString,
        timestamp: timestamp,
        surfaceTemp: temps[0] || null,
        temp10m: temps[2] || null,
        temp50m: temps.length > 10 ? temps[10] : null,
        temp100m: temps.length > 20 ? temps[20] : null,
        temp200m: temps.length > 40 ? temps[40] : null,
        deepTemp: temps[temps.length - 1] || null,
        latitude: cycleData.latitude,
        longitude: cycleData.longitude,
        profileCount: temps.length
      };
    }).filter(d => d.surfaceTemp !== null);

    // Profile data for selected cycle
    const profileData = selectedCycle && currentFloatData[selectedCycle] 
      ? currentFloatData[selectedCycle].temperature_adjusted.map((temp, index) => ({
          depth: index * 5, // Assuming 5m intervals - adjust based on your data
          temperature: temp,
          index: index
        }))
      : [];

    // Float summary info
    const floatInfo = {
      id: selectedFloat,
      totalCycles: cycles.length,
      dateRange: timeSeriesData.length > 0 ? {
        start: timeSeriesData[0].date,
        end: timeSeriesData[timeSeriesData.length - 1].date
      } : null,
      latRange: timeSeriesData.length > 0 ? {
        min: Math.min(...timeSeriesData.map(d => d.latitude)),
        max: Math.max(...timeSeriesData.map(d => d.latitude))
      } : null,
      lonRange: timeSeriesData.length > 0 ? {
        min: Math.min(...timeSeriesData.map(d => d.longitude)),
        max: Math.max(...timeSeriesData.map(d => d.longitude))
      } : null
    };

    console.log('Processed data:', { timeSeriesCount: timeSeriesData.length, profileCount: profileData.length });
    return { timeSeriesData, profileData, floatInfo };
  }, [floatData, selectedFloat, selectedCycle]);

  const formatTooltip = (value, name) => {
    if (name && name.includes('Temp')) {
      return [`${value?.toFixed(2)}°C`, name.replace('Temp', ' Temperature')];
    }
    return [value, name];
  };

  const formatXAxisTick = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return `Cycle ${timestamp}`;
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      return `Cycle ${timestamp}`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
        <div className="text-center">
          <Waves className="w-12 h-12 animate-bounce text-blue-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700">Loading oceanographic data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-red-50 to-orange-50 rounded-lg">
        <div className="text-center max-w-md">
          <Upload className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">Data Loading Error</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!floatData) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const floatIds = Object.keys(floatData);
  const { timeSeriesData, profileData, floatInfo } = processedData;

  return (
    <div className="w-full max-w-7xl mx-auto p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
          <Waves className="text-blue-600" />
          Argo Float Temperature Analysis
        </h1>
        <p className="text-gray-600">Interactive visualization of oceanographic temperature profiles and time series</p>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Float</label>
          <select 
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={selectedFloat || ''}
            onChange={(e) => {
              setSelectedFloat(e.target.value);
              setSelectedCycle(null);
            }}
          >
            {floatIds.map(id => (
              <option key={id} value={id}>{id.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
            ))}
          </select>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
          <div className="flex gap-2">
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'timeSeries' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setViewMode('timeSeries')}
            >
              <TrendingUp className="w-4 h-4 inline mr-1" />
              Time Series
            </button>
            <button
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'profile' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setViewMode('profile')}
            >
              <Eye className="w-4 h-4 inline mr-1" />
              Profiles
            </button>
          </div>
        </div>

        {viewMode === 'profile' && floatData[selectedFloat] && (
          <div className="bg-white p-4 rounded-lg shadow">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Cycle</label>
            <select 
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedCycle || ''}
              onChange={(e) => setSelectedCycle(e.target.value)}
            >
              <option value="">Choose a cycle...</option>
              {Object.keys(floatData[selectedFloat]).map(cycle => (
                <option key={cycle} value={cycle}>
                  Cycle {cycle}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Float Info Cards */}
      {floatInfo.dateRange && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">Date Range</span>
            </div>
            <p className="text-lg font-semibold text-gray-800">{floatInfo.dateRange.start}</p>
            <p className="text-sm text-gray-600">to {floatInfo.dateRange.end}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-5 h-5 text-cyan-500" />
              <span className="text-sm font-medium text-gray-700">Total Cycles</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{floatInfo.totalCycles}</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-gray-700">Latitude Range</span>
            </div>
            <p className="text-lg font-semibold text-gray-800">
              {floatInfo.latRange.min.toFixed(2)}° to {floatInfo.latRange.max.toFixed(2)}°
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-gray-700">Longitude Range</span>
            </div>
            <p className="text-lg font-semibold text-gray-800">
              {floatInfo.lonRange.min.toFixed(2)}° to {floatInfo.lonRange.max.toFixed(2)}°
            </p>
          </div>
        </div>
      )}

      {/* Main Visualization */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        {viewMode === 'timeSeries' ? (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Temperature Time Series - {selectedFloat?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="timestamp"
                    type="number"
                    scale="time"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={formatXAxisTick}
                    stroke="#666"
                  />
                  <YAxis 
                    label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
                    stroke="#666"
                  />
                  <Tooltip 
                    labelFormatter={(value) => {
                      try {
                        const date = new Date(value);
                        if (isNaN(date.getTime())) {
                          return `Cycle ${value}`;
                        }
                        return date.toLocaleDateString();
                      } catch (error) {
                        return `Cycle ${value}`;
                      }
                    }}
                    formatter={formatTooltip}
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="surfaceTemp" 
                    stroke="#ef4444" 
                    strokeWidth={3}
                    name="Surface Temp"
                    dot={{ fill: '#ef4444', strokeWidth: 0, r: 4 }}
                    connectNulls={false}
                  />
                  {timeSeriesData.some(d => d.temp50m) && (
                    <Line 
                      type="monotone" 
                      dataKey="temp50m" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      name="50m Temp"
                      dot={{ fill: '#f59e0b', strokeWidth: 0, r: 3 }}
                      connectNulls={false}
                    />
                  )}
                  {timeSeriesData.some(d => d.temp100m) && (
                    <Line 
                      type="monotone" 
                      dataKey="temp100m" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="100m Temp"
                      dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
                      connectNulls={false}
                    />
                  )}
                  {timeSeriesData.some(d => d.temp200m) && (
                    <Line 
                      type="monotone" 
                      dataKey="temp200m" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="200m Temp"
                      dot={{ fill: '#3b82f6', strokeWidth: 0, r: 3 }}
                      connectNulls={false}
                    />
                  )}
                  <Line 
                    type="monotone" 
                    dataKey="deepTemp" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Deep Temp"
                    dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
                <p className="text-gray-500">No time series data available for this float</p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold text-gray-800 mb-4">
              Temperature Profile {selectedCycle ? `- Cycle ${selectedCycle}` : '(Select a cycle)'}
            </h3>
            {profileData.length > 0 ? (
              <ResponsiveContainer width="100%" height={500}>
                <ScatterChart data={profileData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="temperature"
                    label={{ value: 'Temperature (°C)', position: 'insideBottom', offset: -5 }}
                    stroke="#666"
                  />
                  <YAxis 
                    dataKey="depth"
                    reversed={true}
                    label={{ value: 'Depth (m)', angle: -90, position: 'insideLeft' }}
                    stroke="#666"
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'temperature' ? `${value.toFixed(2)}°C` : `${value}m`,
                      name === 'temperature' ? 'Temperature' : 'Depth'
                    ]}
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }}
                  />
                  <Scatter 
                    dataKey="temperature" 
                    fill="#3b82f6"
                    stroke="#1e40af"
                    strokeWidth={1}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
                <p className="text-gray-500">Select a cycle to view the temperature profile</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          💡 Switch between time series and profile views to explore different aspects of the data
        </p>
      </div>
    </div>
  );
};

export default ArgoFloatVisualization;