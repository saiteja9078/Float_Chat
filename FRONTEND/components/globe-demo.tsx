"use client"
import InteractiveGlobe from "./interactive-globe"

// Demo component showing the globe in a dashboard context
const GlobeDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Interactive 3D Globe</h1>
          <p className="text-gray-600">Drag to rotate, scroll to zoom, hover over markers for details</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: "600px" }}>
          <InteractiveGlobe />
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-2">Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Smooth rotation and zoom</li>
              <li>• Interactive markers</li>
              <li>• Auto-rotation when idle</li>
              <li>• Responsive design</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-2">Controls</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Left click + drag: Rotate</li>
              <li>• Mouse wheel: Zoom in/out</li>
              <li>• Hover markers: Show labels</li>
              <li>• Auto-pause on interaction</li>
            </ul>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-2">Customization</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Custom marker colors</li>
              <li>• Adjustable globe size</li>
              <li>• Theme integration</li>
              <li>• Data point mapping</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlobeDemo
