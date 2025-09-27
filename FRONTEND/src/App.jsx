import { useState } from 'react'
import ArgoFloatVisualization from './ArgoFloatVisualization'
import './App.css'

function App() {
  const [showVisualization, setShowVisualization] = useState(true)

  return (
    <>
      <div className="App">
        {showVisualization ? (
          <div style={{ padding: '20px' }}>
            <ArgoFloatVisualization />
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => setShowVisualization(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Back to Demo
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div>
              <a href="https://vite.dev" target="_blank">
                <img src="/vite.svg" className="logo" alt="Vite logo" />
              </a>
              <a href="https://react.dev" target="_blank">
                <img src="./assets/react.svg" className="logo react" alt="React logo" />
              </a>
            </div>
            <h1>Vite + React</h1>
            <div className="card">
              <button 
                onClick={() => setShowVisualization(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginBottom: '20px'
                }}
              >
                Show Argo Float Visualization
              </button>
              <p>
                Click the button above to view your oceanographic data visualization
              </p>
            </div>
            <p className="read-the-docs">
              Your Argo float temperature data visualization is ready to use!
            </p>
          </div>
        )}
      </div>
    </>
  )
}

export default App