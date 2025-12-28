import React, { useState } from 'react'
import './SetupPage.css'

const SetupPage = ({ onComplete }) => {
  const [step, setStep] = useState(1)
  const [configPassword, setConfigPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePasswordSetup = async (e) => {
    e.preventDefault()
    setError('')

    if (configPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    if (configPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSaving(true)

    try {
      const response = await fetch('http://localhost:3003/api/setup-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: configPassword }),
      })

      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde du mot de passe')
      }

      // Sauvegarder aussi dans le localStorage pour la session actuelle
      localStorage.setItem('configAuth', 'authenticated')
      
      setStep(2)
    } catch (err) {
      setError('Erreur lors de la configuration: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = () => {
    if (onComplete) {
      onComplete()
    }
  }

  if (step === 1) {
    return (
      <div className="setup-page">
        <div className="setup-container">
          <div className="setup-header">
            <h1>🔧 Configuration initiale</h1>
            <p>Bienvenue ! Configurez votre application en quelques étapes.</p>
          </div>

          <div className="setup-content">
            <div className="setup-step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Définir le mot de passe de configuration</h3>
                <p>Ce mot de passe protégera l'accès à la page de configuration des identifiants.</p>
                
                <form onSubmit={handlePasswordSetup} className="setup-form">
                  <div className="form-group">
                    <label htmlFor="configPassword">Mot de passe</label>
                    <input
                      type="password"
                      id="configPassword"
                      value={configPassword}
                      onChange={(e) => setConfigPassword(e.target.value)}
                      placeholder="Minimum 6 caractères"
                      required
                      minLength={6}
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirmPassword">Confirmer le mot de passe</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      required
                      minLength={6}
                    />
                  </div>

                  {error && <div className="error-message">{error}</div>}

                  <button type="submit" disabled={saving} className="setup-button">
                    {saving ? '⏳ Configuration...' : 'Suivant →'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (step === 2) {
    return (
      <div className="setup-page">
        <div className="setup-container">
          <div className="setup-header">
            <h1>✅ Configuration terminée !</h1>
            <p>Votre application est maintenant configurée.</p>
          </div>

          <div className="setup-content">
            <div className="setup-step success-step">
              <div className="success-icon">✓</div>
              <div className="step-content">
                <h3>Prêt à l'emploi</h3>
                <p>
                  Vous pouvez maintenant accéder à la page de configuration à tout moment 
                  en cliquant sur le bouton "⚙️ Configuration" dans l'interface principale.
                </p>
                <p className="info-text">
                  <strong>Prochaine étape :</strong> Configurez les identifiants de vos sites 
                  via la page de configuration.
                </p>
                
                <button onClick={handleComplete} className="setup-button primary">
                  Accéder à l'application →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default SetupPage

