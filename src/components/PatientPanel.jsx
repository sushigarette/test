import React, { useState, useEffect } from 'react'
import './PatientPanel.css'

const PatientPanel = () => {
  const [endpoint1, setEndpoint1] = useState('')
  const [endpoint2, setEndpoint2] = useState('')
  const [data1, setData1] = useState(null)
  const [data2, setData2] = useState(null)
  const [loading1, setLoading1] = useState(false)
  const [loading2, setLoading2] = useState(false)
  const [error1, setError1] = useState(null)
  const [error2, setError2] = useState(null)
  const [patientCount1, setPatientCount1] = useState(0)
  const [patientCount2, setPatientCount2] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30) // en secondes
  
  // Authentification pour endpoint 1
  const [authType1, setAuthType1] = useState('none') // 'none', 'basic', 'bearer'
  const [username1, setUsername1] = useState('')
  const [password1, setPassword1] = useState('')
  const [token1, setToken1] = useState('')
  
  // Authentification pour endpoint 2
  const [authType2, setAuthType2] = useState('none') // 'none', 'basic', 'bearer'
  const [username2, setUsername2] = useState('')
  const [password2, setPassword2] = useState('')
  const [token2, setToken2] = useState('')
  
  // Headers personnalisés et debug
  const [customHeaders1, setCustomHeaders1] = useState('')
  const [customHeaders2, setCustomHeaders2] = useState('')
  const [showHeaders1, setShowHeaders1] = useState(false)
  const [showHeaders2, setShowHeaders2] = useState(false)
  const [lastHeaders1, setLastHeaders1] = useState(null)
  const [lastHeaders2, setLastHeaders2] = useState(null)
  const [useProxy1, setUseProxy1] = useState(false)
  const [useProxy2, setUseProxy2] = useState(false)

  // Fonction pour compter les patients dans un JSON
  const countPatients = (jsonData, endpoint = '') => {
    if (!jsonData) return 0
    
    // Si c'est un tableau, compter les éléments (cas le plus courant pour /api/my_patients)
    if (Array.isArray(jsonData)) {
      return jsonData.length
    }
    
    // Si c'est un objet, chercher des clés communes pour les patients
    if (typeof jsonData === 'object') {
      // Chercher des clés communes comme 'patients', 'data', 'results', etc.
      // Ajouter 'my_patients' si l'endpoint contient cette clé
      const possibleKeys = [
        'patients', 
        'my_patients',
        'data', 
        'results', 
        'items', 
        'records',
        'patient_list',
        'patientList'
      ]
      
      for (const key of possibleKeys) {
        if (Array.isArray(jsonData[key])) {
          return jsonData[key].length
        }
      }
      
      // Si l'objet a une propriété 'count' ou 'total'
      if (typeof jsonData.count === 'number') {
        return jsonData.count
      }
      if (typeof jsonData.total === 'number') {
        return jsonData.total
      }
      
      // Chercher toutes les propriétés qui sont des tableaux
      // et prendre le plus grand tableau (probablement la liste de patients)
      let maxCount = 0
      let maxKey = null
      for (const key in jsonData) {
        if (Array.isArray(jsonData[key]) && jsonData[key].length > maxCount) {
          maxCount = jsonData[key].length
          maxKey = key
        }
      }
      
      // Si on trouve un tableau, retourner sa taille
      if (maxCount > 0) {
        return maxCount
      }
      
      // Si l'objet contient des objets qui ressemblent à des patients
      // (avec des clés communes comme 'id', 'name', 'email', etc.)
      const patientLikeKeys = ['id', 'name', 'email', 'patient_id', 'patientId']
      let patientLikeCount = 0
      for (const key in jsonData) {
        if (jsonData[key] && typeof jsonData[key] === 'object') {
          const hasPatientKeys = patientLikeKeys.some(pk => 
            jsonData[key].hasOwnProperty(pk)
          )
          if (hasPatientKeys) {
            patientLikeCount++
          }
        }
      }
      if (patientLikeCount > 0) {
        return patientLikeCount
      }
      
      // Si aucun tableau trouvé mais que l'objet existe, retourner 0
      return 0
    }
    
    return 0
  }

  // Fonction pour parser les headers personnalisés
  const parseCustomHeaders = (customHeadersString) => {
    const headers = {}
    if (!customHeadersString || !customHeadersString.trim()) {
      return headers
    }
    
    // Format: "Key: Value" ou "Key=Value" ou JSON
    try {
      // Essayer de parser comme JSON d'abord
      const jsonHeaders = JSON.parse(customHeadersString)
      return jsonHeaders
    } catch {
      // Sinon parser ligne par ligne
      const lines = customHeadersString.split('\n')
      lines.forEach(line => {
        const trimmed = line.trim()
        if (!trimmed) return
        
        // Format "Key: Value" ou "Key=Value"
        if (trimmed.includes(':')) {
          const [key, ...valueParts] = trimmed.split(':')
          headers[key.trim()] = valueParts.join(':').trim()
        } else if (trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          headers[key.trim()] = valueParts.join('=').trim()
        }
      })
    }
    
    return headers
  }

  // Fonction pour créer les headers d'authentification
  const getAuthHeaders = (authType, username, password, token, customHeadersString) => {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    }

    if (authType === 'basic') {
      if (!username || !password) {
        throw new Error('Nom d\'utilisateur et mot de passe requis pour Basic Auth')
      }
      // Encoder en base64 de manière sécurisée
      const credentials = btoa(unescape(encodeURIComponent(`${username}:${password}`)))
      headers['Authorization'] = `Basic ${credentials}`
    } else if (authType === 'bearer') {
      if (!token) {
        throw new Error('Token requis pour Bearer Auth')
      }
      headers['Authorization'] = `Bearer ${token.trim()}`
    }

    // Ajouter les headers personnalisés (ils peuvent écraser les headers par défaut)
    const customHeaders = parseCustomHeaders(customHeadersString)
    Object.assign(headers, customHeaders)

    return headers
  }

  // Fonction pour récupérer les données d'un endpoint
  const fetchData = async (
    endpoint,
    setData,
    setLoading,
    setError,
    setCount,
    authType,
    username,
    password,
    token,
    customHeadersString,
    setLastHeaders,
    useProxy = false
  ) => {
    if (!endpoint) {
      setError('Veuillez entrer une URL')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Valider les credentials avant de construire les headers
      if (authType === 'basic' && (!username || !password)) {
        throw new Error('Veuillez remplir le nom d\'utilisateur et le mot de passe pour Basic Auth')
      }
      if (authType === 'bearer' && !token) {
        throw new Error('Veuillez remplir le token pour Bearer Auth')
      }

      // Utiliser le proxy si activé (pour contourner CORS)
      let finalEndpoint = endpoint
      if (useProxy && endpoint.includes('mhlink.elivie.fr')) {
        // Remplacer l'URL par le proxy local
        finalEndpoint = endpoint.replace('https://mhlink.elivie.fr', '/api')
      }

      const headers = getAuthHeaders(authType, username, password, token, customHeadersString)
      
      // Sauvegarder les headers pour l'affichage debug
      if (setLastHeaders) {
        setLastHeaders({ ...headers })
      }

      const response = await fetch(finalEndpoint, {
        method: 'GET',
        headers: headers,
        credentials: 'include', // Inclure les cookies si nécessaire
        mode: 'cors', // Mode CORS explicite
      })

      // Essayer de lire la réponse même en cas d'erreur pour voir le message
      let jsonData
      const contentType = response.headers.get('content-type')
      
      if (contentType && contentType.includes('application/json')) {
        jsonData = await response.json()
      } else {
        const textData = await response.text()
        jsonData = { rawResponse: textData }
      }

      if (!response.ok) {
        // Si la réponse contient un message d'erreur détaillé, l'utiliser
        if (jsonData.detail || jsonData.message || jsonData.error) {
          const errorMsg = jsonData.detail || jsonData.message || jsonData.error
          throw new Error(`Erreur ${response.status}: ${errorMsg}`)
        }
        if (response.status === 401 || response.status === 403) {
          throw new Error('Erreur d\'authentification: Vérifiez vos identifiants')
        }
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`)
      }

      setData(jsonData)
      const count = countPatients(jsonData, endpoint)
      setCount(count)
    } catch (err) {
      // Gestion améliorée des erreurs
      let errorMessage = err.message
      
      // Erreur réseau ou CORS
      if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        errorMessage = 'Erreur de connexion: Impossible de se connecter au serveur.\n\n' +
          'Causes possibles:\n' +
          '• Problème CORS (le serveur n\'autorise pas les requêtes depuis ce domaine)\n' +
          '• Problème de réseau\n' +
          '• URL incorrecte\n\n' +
          'Solutions:\n' +
          '• Activez l\'option "Utiliser proxy" ci-dessous\n' +
          '• Vérifiez vos identifiants d\'authentification\n' +
          '• Vérifiez que l\'URL est correcte'
      }
      
      // Erreur de parsing JSON
      if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        errorMessage = `Erreur de parsing JSON: ${err.message}`
      }
      
      setError(errorMessage)
      setData(null)
      setCount(0)
      
      // Afficher l'erreur complète dans la console pour le debug
      console.error('Erreur lors de la récupération des données:', {
        endpoint: finalEndpoint,
        originalEndpoint: endpoint,
        error: err,
        message: err.message,
        stack: err.stack
      })
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour récupérer les deux endpoints
  const fetchAllData = () => {
    if (endpoint1) {
      fetchData(
        endpoint1,
        setData1,
        setLoading1,
        setError1,
        setPatientCount1,
        authType1,
        username1,
        password1,
        token1,
        customHeaders1,
        setLastHeaders1,
        useProxy1
      )
    }
    if (endpoint2) {
      fetchData(
        endpoint2,
        setData2,
        setLoading2,
        setError2,
        setPatientCount2,
        authType2,
        username2,
        password2,
        token2,
        customHeaders2,
        setLastHeaders2,
        useProxy2
      )
    }
  }

  // Auto-refresh si activé
  useEffect(() => {
    if (autoRefresh && (endpoint1 || endpoint2)) {
      const interval = setInterval(() => {
        fetchAllData()
      }, refreshInterval * 1000)

      return () => clearInterval(interval)
    }
  }, [
    autoRefresh,
    refreshInterval,
    endpoint1,
    endpoint2,
    authType1,
    username1,
    password1,
    token1,
    customHeaders1,
    authType2,
    username2,
    password2,
    token2,
    customHeaders2,
  ])

  const totalPatients = patientCount1 + patientCount2

  return (
    <div className="patient-panel">
      <div className="panel-controls">
        {/* Endpoint 1 */}
        <div className="endpoint-section">
          <h3 className="endpoint-section-title">Endpoint 1</h3>
          <div className="control-group">
            <label htmlFor="endpoint1">URL:</label>
            <input
              id="endpoint1"
              type="text"
              value={endpoint1}
              onChange={(e) => setEndpoint1(e.target.value)}
              placeholder="https://mhlink.elivie.fr/api/my_patients"
              className="endpoint-input"
            />
          </div>

          {endpoint1.includes('mhlink.elivie.fr') && (
            <div className="control-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useProxy1}
                  onChange={(e) => setUseProxy1(e.target.checked)}
                />
                Utiliser le proxy (contourne les problèmes CORS)
              </label>
            </div>
          )}
          
          <div className="control-group">
            <label htmlFor="authType1">Type d'authentification:</label>
            <select
              id="authType1"
              value={authType1}
              onChange={(e) => setAuthType1(e.target.value)}
              className="auth-select"
            >
              <option value="none">Aucune</option>
              <option value="basic">Basic Auth (Username/Password)</option>
              <option value="bearer">Bearer Token</option>
            </select>
          </div>

          {authType1 === 'basic' && (
            <>
              <div className="auth-info">
                <span className="info-icon">ℹ️</span>
                <span>Remplissez les identifiants pour Basic Auth</span>
              </div>
              <div className="control-group">
                <label htmlFor="username1">Nom d'utilisateur: <span className="required">*</span></label>
                <input
                  id="username1"
                  type="text"
                  value={username1}
                  onChange={(e) => setUsername1(e.target.value)}
                  placeholder="username"
                  className={`auth-input ${authType1 === 'basic' && !username1 ? 'input-warning' : ''}`}
                />
              </div>
              <div className="control-group">
                <label htmlFor="password1">Mot de passe: <span className="required">*</span></label>
                <input
                  id="password1"
                  type="password"
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  placeholder="password"
                  className={`auth-input ${authType1 === 'basic' && !password1 ? 'input-warning' : ''}`}
                />
              </div>
              {authType1 === 'basic' && (!username1 || !password1) && (
                <div className="auth-warning">
                  ⚠️ Les identifiants sont requis pour Basic Auth
                </div>
              )}
            </>
          )}

          {authType1 === 'bearer' && (
            <>
              <div className="auth-info">
                <span className="info-icon">ℹ️</span>
                <span>Collez votre token Bearer</span>
              </div>
              <div className="control-group">
                <label htmlFor="token1">Token: <span className="required">*</span></label>
                <input
                  id="token1"
                  type="password"
                  value={token1}
                  onChange={(e) => setToken1(e.target.value)}
                  placeholder="Votre token d'authentification"
                  className={`auth-input ${authType1 === 'bearer' && !token1 ? 'input-warning' : ''}`}
                />
              </div>
              {authType1 === 'bearer' && !token1 && (
                <div className="auth-warning">
                  ⚠️ Le token est requis pour Bearer Auth
                </div>
              )}
            </>
          )}

          <div className="control-group">
            <button
              onClick={() =>
                fetchData(
                  endpoint1,
                  setData1,
                  setLoading1,
                  setError1,
                  setPatientCount1,
                  authType1,
                  username1,
                  password1,
                  token1,
                  customHeaders1,
                  setLastHeaders1
                )
              }
              disabled={loading1 || !endpoint1}
              className="fetch-button"
            >
              {loading1 ? 'Chargement...' : 'Récupérer'}
            </button>
          </div>

          <div className="headers-section">
            <button
              type="button"
              onClick={() => setShowHeaders1(!showHeaders1)}
              className="toggle-headers-button"
            >
              {showHeaders1 ? '▼' : '▶'} Headers HTTP
            </button>
            
            {showHeaders1 && (
              <div className="headers-content">
                <div className="headers-display">
                  <h4>Headers envoyés (dernière requête):</h4>
                  {lastHeaders1 ? (
                    <pre className="headers-preview">{JSON.stringify(lastHeaders1, null, 2)}</pre>
                  ) : (
                    <p className="no-headers">Aucune requête effectuée</p>
                  )}
                </div>
                
                <div className="custom-headers-input">
                  <label htmlFor="customHeaders1">Headers personnalisés (optionnel):</label>
                  <textarea
                    id="customHeaders1"
                    value={customHeaders1}
                    onChange={(e) => setCustomHeaders1(e.target.value)}
                    placeholder='Format JSON: {"X-Custom-Header": "value"}&#10;Ou ligne par ligne:&#10;X-Custom-Header: value&#10;Another-Header: value'
                    className="headers-textarea"
                    rows="4"
                  />
                  <small className="headers-help">
                    Format: JSON ou une ligne par header (Key: Value)
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Endpoint 2 */}
        <div className="endpoint-section">
          <h3 className="endpoint-section-title">Endpoint 2</h3>
          <div className="control-group">
            <label htmlFor="endpoint2">URL:</label>
            <input
              id="endpoint2"
              type="text"
              value={endpoint2}
              onChange={(e) => setEndpoint2(e.target.value)}
              placeholder="https://api.example.com/patients2"
              className="endpoint-input"
            />
          </div>
          
          <div className="control-group">
            <label htmlFor="authType2">Type d'authentification:</label>
            <select
              id="authType2"
              value={authType2}
              onChange={(e) => setAuthType2(e.target.value)}
              className="auth-select"
            >
              <option value="none">Aucune</option>
              <option value="basic">Basic Auth (Username/Password)</option>
              <option value="bearer">Bearer Token</option>
            </select>
          </div>

          {authType2 === 'basic' && (
            <>
              <div className="auth-info">
                <span className="info-icon">ℹ️</span>
                <span>Remplissez les identifiants pour Basic Auth</span>
              </div>
              <div className="control-group">
                <label htmlFor="username2">Nom d'utilisateur: <span className="required">*</span></label>
                <input
                  id="username2"
                  type="text"
                  value={username2}
                  onChange={(e) => setUsername2(e.target.value)}
                  placeholder="username"
                  className={`auth-input ${authType2 === 'basic' && !username2 ? 'input-warning' : ''}`}
                />
              </div>
              <div className="control-group">
                <label htmlFor="password2">Mot de passe: <span className="required">*</span></label>
                <input
                  id="password2"
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder="password"
                  className={`auth-input ${authType2 === 'basic' && !password2 ? 'input-warning' : ''}`}
                />
              </div>
              {authType2 === 'basic' && (!username2 || !password2) && (
                <div className="auth-warning">
                  ⚠️ Les identifiants sont requis pour Basic Auth
                </div>
              )}
            </>
          )}

          {authType2 === 'bearer' && (
            <>
              <div className="auth-info">
                <span className="info-icon">ℹ️</span>
                <span>Collez votre token Bearer</span>
              </div>
              <div className="control-group">
                <label htmlFor="token2">Token: <span className="required">*</span></label>
                <input
                  id="token2"
                  type="password"
                  value={token2}
                  onChange={(e) => setToken2(e.target.value)}
                  placeholder="Votre token d'authentification"
                  className={`auth-input ${authType2 === 'bearer' && !token2 ? 'input-warning' : ''}`}
                />
              </div>
              {authType2 === 'bearer' && !token2 && (
                <div className="auth-warning">
                  ⚠️ Le token est requis pour Bearer Auth
                </div>
              )}
            </>
          )}

          <div className="control-group">
            <button
              onClick={() =>
                fetchData(
                  endpoint2,
                  setData2,
                  setLoading2,
                  setError2,
                  setPatientCount2,
                  authType2,
                  username2,
                  password2,
                  token2,
                  customHeaders2,
                  setLastHeaders2
                )
              }
              disabled={loading2 || !endpoint2}
              className="fetch-button"
            >
              {loading2 ? 'Chargement...' : 'Récupérer'}
            </button>
          </div>

          <div className="headers-section">
            <button
              type="button"
              onClick={() => setShowHeaders2(!showHeaders2)}
              className="toggle-headers-button"
            >
              {showHeaders2 ? '▼' : '▶'} Headers HTTP
            </button>
            
            {showHeaders2 && (
              <div className="headers-content">
                <div className="headers-display">
                  <h4>Headers envoyés (dernière requête):</h4>
                  {lastHeaders2 ? (
                    <pre className="headers-preview">{JSON.stringify(lastHeaders2, null, 2)}</pre>
                  ) : (
                    <p className="no-headers">Aucune requête effectuée</p>
                  )}
                </div>
                
                <div className="custom-headers-input">
                  <label htmlFor="customHeaders2">Headers personnalisés (optionnel):</label>
                  <textarea
                    id="customHeaders2"
                    value={customHeaders2}
                    onChange={(e) => setCustomHeaders2(e.target.value)}
                    placeholder='Format JSON: {"X-Custom-Header": "value"}&#10;Ou ligne par ligne:&#10;X-Custom-Header: value&#10;Another-Header: value'
                    className="headers-textarea"
                    rows="4"
                  />
                  <small className="headers-help">
                    Format: JSON ou une ligne par header (Key: Value)
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="control-group">
          <button onClick={fetchAllData} className="fetch-all-button">
            Récupérer les deux
          </button>
        </div>

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
            <input
              type="number"
              min="5"
              max="300"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
              className="interval-input"
            />
          )}
          {autoRefresh && <span className="interval-label">secondes</span>}
        </div>
      </div>

      <div className="results-container">
        <div className="result-card">
          <h3>Endpoint 1</h3>
          {loading1 && <div className="loading">Chargement...</div>}
          {error1 && <div className="error">Erreur: {error1}</div>}
          {!loading1 && !error1 && (
            <>
              <div className="patient-count">
                <span className="count-label">Nombre de patients:</span>
                <span className="count-value">{patientCount1}</span>
              </div>
              {data1 && (
                <details className="json-viewer">
                  <summary>Voir les données JSON</summary>
                  <pre>{JSON.stringify(data1, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </div>

        <div className="result-card">
          <h3>Endpoint 2</h3>
          {loading2 && <div className="loading">Chargement...</div>}
          {error2 && <div className="error">Erreur: {error2}</div>}
          {!loading2 && !error2 && (
            <>
              <div className="patient-count">
                <span className="count-label">Nombre de patients:</span>
                <span className="count-value">{patientCount2}</span>
              </div>
              {data2 && (
                <details className="json-viewer">
                  <summary>Voir les données JSON</summary>
                  <pre>{JSON.stringify(data2, null, 2)}</pre>
                </details>
              )}
            </>
          )}
        </div>
      </div>

      <div className="total-card">
        <h2>Total des patients</h2>
        <div className="total-count">{totalPatients}</div>
      </div>
    </div>
  )
}

export default PatientPanel

