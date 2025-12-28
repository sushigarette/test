import React, { useState, useEffect } from 'react'
import AutoPatientCounter from './components/AutoPatientCounter'
import ConfigPage from './components/ConfigPage'
import SetupPage from './components/SetupPage'
import './App.css'

function App() {
  const [showConfig, setShowConfig] = useState(false)
  const [showSetup, setShowSetup] = useState(false)
  const [isCheckingSetup, setIsCheckingSetup] = useState(true)

  useEffect(() => {
    // Vérifier si c'est le premier lancement
    const checkSetup = async () => {
      try {
        const response = await fetch('/kpi/api/check-setup')
        const data = await response.json()
        
        if (!data.isConfigured) {
          setShowSetup(true)
        }
      } catch (err) {
        // En cas d'erreur, on considère que c'est configuré pour éviter de bloquer
        console.error('Erreur lors de la vérification du setup:', err)
      } finally {
        setIsCheckingSetup(false)
      }
    }

    checkSetup()
  }, [])

  const handleSetupComplete = () => {
    setShowSetup(false)
  }

  if (isCheckingSetup) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  if (showSetup) {
    return (
      <div className="app">
        <SetupPage onComplete={handleSetupComplete} />
      </div>
    )
  }

  return (
    <div className="app">
      {showConfig ? (
        <ConfigPage onBack={() => setShowConfig(false)} />
      ) : (
        <>
          <div className="app-header">
            <button onClick={() => setShowConfig(true)} className="config-button">
              ⚙️ Configuration
            </button>
          </div>
          <AutoPatientCounter />
        </>
      )}
    </div>
  )
}

export default App


