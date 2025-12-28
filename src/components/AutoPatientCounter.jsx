import React, { useState, useEffect } from 'react'
import { authService } from '../services/authService'
import { authConfig } from '../config/auth.config'
import './AutoPatientCounter.css'

const AutoPatientCounter = () => {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const [results, setResults] = useState([])
  const [lastUpdate, setLastUpdate] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(60) // en secondes

  const fetchAllPatients = async () => {
    setLoading(true)
    setErrors({})

    try {
      const allResults = await authService.getAllPatients()
      setResults(allResults)
      setLastUpdate(new Date())
    } catch (err) {
      // Erreur silencieuse, gérée par l'affichage dans l'interface
    } finally {
      setLoading(false)
    }
  }

  // Charger les données au démarrage
  useEffect(() => {
    fetchAllPatients()
  }, [])

  // Auto-refresh si activé
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAllPatients()
      }, refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])

  // Nettoyer le service lors du démontage
  useEffect(() => {
    return () => {
      authService.cleanup()
    }
  }, [])

  const formatTime = (date) => {
    if (!date) return 'Jamais'
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const totalPatients = results.reduce((sum, result) => sum + (result.count || 0), 0)

  return (
    <div className="auto-patient-counter">
      <div className="counter-header">
        <h2>Compteur Automatique de Patients</h2>
        <p className="subtitle">
          Authentification automatique pour {authConfig.sites.length} site(s) configuré(s)
        </p>
      </div>

      <div className="counter-controls">
        <button
          onClick={fetchAllPatients}
          disabled={loading}
          className="refresh-button"
        >
          {loading ? '⏳ Chargement...' : '🔄 Actualiser tous les sites'}
        </button>

        <div className="auto-refresh-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Actualisation automatique
          </label>
          {autoRefresh && (
            <>
              <input
                type="number"
                min="10"
                max="600"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 60)}
                className="interval-input"
              />
              <span className="interval-label">secondes</span>
            </>
          )}
        </div>
      </div>

      <div className="sites-results">
        {results.map((result, index) => (
          <div key={index} className="site-result-card">
            <h3 className="site-name">{result.siteName}</h3>
            {result.error ? (
              <div className="error">
                <strong>Erreur:</strong> {result.error}
              </div>
            ) : (
              <>
                <div className="patient-count-display">
                  <div className="count-label">Nombre de patients</div>
                  <div className="count-value">{result.count}</div>
                  {result.data && (
                    <div className="count-info">
                      {Array.isArray(result.data) ? (
                        <span>Format: Tableau direct</span>
                      ) : typeof result.data === 'object' ? (
                        <span>
                          Format: Objet avec clés: {Object.keys(result.data).slice(0, 3).join(', ')}
                          {Object.keys(result.data).length > 3 ? '...' : ''}
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>
                {result.data && (
                  <details className="json-viewer">
                    <summary>Voir les données JSON complètes (pour vérification)</summary>
                    <pre>{JSON.stringify(result.data, null, 2)}</pre>
                  </details>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="total-card">
        <h2>Total des patients (tous sites)</h2>
        <div className="total-count">{totalPatients}</div>
        <div className="last-update">
          Dernière mise à jour: {formatTime(lastUpdate)}
        </div>
      </div>
    </div>
  )
}

export default AutoPatientCounter
