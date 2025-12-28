import React, { useState, useEffect } from 'react'
import { authConfig } from '../config/auth.config'
import './ConfigPage.css'

const ConfigPage = ({ onBack }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const [sites, setSites] = useState([])

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà authentifié
    const authStatus = localStorage.getItem('configAuth')
    if (authStatus === 'authenticated') {
      setIsAuthenticated(true)
      loadSites()
    }
  }, [])

  const loadSites = async () => {
    try {
      const response = await fetch('http://localhost:3003/api/config-get')
      if (response.ok) {
        const data = await response.json()
        const loadedSites = data.sites || []
        // Si aucun site n'est configuré, créer un site vide
        if (loadedSites.length === 0) {
          setSites([{
            name: '',
            baseUrl: '',
            username: '',
            password: '',
            tokenUrl: '',
            patientsUrl: '',
          }])
        } else {
          setSites(loadedSites)
        }
      } else {
        throw new Error('Erreur de chargement')
      }
    } catch (err) {
      // Si erreur, créer un site vide
      setSites([{
        name: '',
        baseUrl: '',
        username: '',
        password: '',
        tokenUrl: '',
        patientsUrl: '',
      }])
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const response = await fetch('http://localhost:3003/api/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      })

      const data = await response.json()

      if (data.valid) {
        setIsAuthenticated(true)
        localStorage.setItem('configAuth', 'authenticated')
        loadSites()
        setError('')
      } else {
        setError('Mot de passe incorrect')
        setPassword('')
      }
    } catch (err) {
      setError('Erreur lors de la vérification du mot de passe')
      setPassword('')
    }
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('configAuth')
    setPassword('')
    setSites([])
  }

  const handleSiteChange = (index, field, value) => {
    const updatedSites = [...sites]
    updatedSites[index] = {
      ...updatedSites[index],
      [field]: value,
    }
    setSites(updatedSites)
    setSaveSuccess(false)
  }

  const handleAddSite = () => {
    const newSite = {
      name: '',
      baseUrl: '',
      username: '',
      password: '',
      tokenUrl: '',
      patientsUrl: '',
    }
    setSites([...sites, newSite])
    setSaveSuccess(false)
  }

  const handleRemoveSite = (index) => {
    if (sites.length > 1) {
      const updatedSites = sites.filter((_, i) => i !== index)
      setSites(updatedSites)
      setSaveSuccess(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    setError('')

    try {
      const response = await fetch('http://localhost:3003/api/config-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sites }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde')
      }

      setSaveSuccess(true)
      setTimeout(() => {
        setSaveSuccess(false)
      }, 3000)
    } catch (err) {
      setError('Erreur lors de la sauvegarde: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="config-page">
        <div className="config-login">
          <h2>Accès à la configuration</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="password">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Entrez le mot de passe"
                required
                autoFocus
              />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="login-button">
              Se connecter
            </button>
          </form>
          {onBack && (
            <button onClick={onBack} className="back-button">
              ← Retour
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="config-page">
      <div className="config-header">
        <h2>Configuration des sites</h2>
        <div className="config-actions">
          <button onClick={handleLogout} className="logout-button">
            Déconnexion
          </button>
          {onBack && (
            <button onClick={onBack} className="back-button">
              ← Retour
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="config-form">
        {sites.map((site, index) => (
          <div key={index} className="site-config-card">
            <div className="site-card-header">
              <h3>{site.name || `Site ${index + 1}`}</h3>
              {sites.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleRemoveSite(index)}
                  className="remove-site-button"
                  title="Supprimer ce site"
                >
                  🗑️
                </button>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor={`name-${index}`}>Nom du site</label>
              <input
                type="text"
                id={`name-${index}`}
                value={site.name || ''}
                onChange={(e) => handleSiteChange(index, 'name', e.target.value)}
                placeholder="Ex: MHLink Elivie"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`baseUrl-${index}`}>URL de base</label>
              <input
                type="text"
                id={`baseUrl-${index}`}
                value={site.baseUrl || ''}
                onChange={(e) => handleSiteChange(index, 'baseUrl', e.target.value)}
                placeholder="https://mhlink.example.fr"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`username-${index}`}>Nom d'utilisateur</label>
              <input
                type="text"
                id={`username-${index}`}
                value={site.username || ''}
                onChange={(e) => handleSiteChange(index, 'username', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`password-${index}`}>Mot de passe</label>
              <input
                type="password"
                id={`password-${index}`}
                value={site.password || ''}
                onChange={(e) => handleSiteChange(index, 'password', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`tokenUrl-${index}`}>URL du token</label>
              <input
                type="text"
                id={`tokenUrl-${index}`}
                value={site.tokenUrl || ''}
                onChange={(e) => handleSiteChange(index, 'tokenUrl', e.target.value)}
                placeholder="https://mhlink.example.fr/api-token-auth/"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor={`patientsUrl-${index}`}>URL des patients</label>
              <input
                type="text"
                id={`patientsUrl-${index}`}
                value={site.patientsUrl || ''}
                onChange={(e) => handleSiteChange(index, 'patientsUrl', e.target.value)}
                placeholder="https://mhlink.example.fr/api/users_services?user_type=patient"
                required
              />
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={handleAddSite}
          className="add-site-button"
        >
          + Ajouter un site
        </button>

        {error && <div className="error-message">{error}</div>}
        {saveSuccess && (
          <div className="success-message">
            ✅ Configuration sauvegardée avec succès !
          </div>
        )}

        <div className="form-actions">
          <button type="submit" disabled={saving} className="save-button">
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ConfigPage

