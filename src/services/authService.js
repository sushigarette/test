import { authConfig } from '../config/auth.config'

class AuthService {
  constructor() {
    this.tokens = {}
    this.tokenExpiry = {}
    this.refreshTimer = null
  }

  async getToken(siteIndex = 0) {
    const site = authConfig.sites[siteIndex]
    if (!site) {
      throw new Error(`Site à l'index ${siteIndex} non trouvé`)
    }

    const siteKey = site.baseUrl
    
    if (this.tokens[siteKey] && this.tokenExpiry[siteKey] && Date.now() < this.tokenExpiry[siteKey]) {
      return this.tokens[siteKey]
    }

    try {
      const url = 'http://localhost:3003/api/token'
      const requestBody = {
        username: site.username,
        password: site.password,
        baseUrl: site.baseUrl,
      }
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        let errorData = {}
        const contentType = response.headers.get('content-type')
        
        try {
          if (contentType && contentType.includes('application/json')) {
            errorData = await response.json()
          } else {
            const textData = await response.text()
            errorData = { raw: textData }
          }
        } catch (parseError) {
          // Ignorer les erreurs de parsing
        }
        
        const errorMessage = 
          errorData.non_field_errors?.[0] ||
          errorData.detail ||
          errorData.message ||
          errorData.error ||
          (errorData.raw ? `Réponse serveur: ${errorData.raw}` : '') ||
          (response.status === 400 ? `Erreur 400 Bad Request: ${JSON.stringify(errorData)}` : '') ||
          (response.status === 403 ? 'Accès refusé (403). Vérifiez vos identifiants dans auth.config.js' : '') ||
          `Erreur d'authentification: ${response.status} ${response.statusText}`
        
        throw new Error(errorMessage)
      }

      const data = await response.json()
      this.tokens[siteKey] = data.token
      this.tokenExpiry[siteKey] = Date.now() + authConfig.tokenRefreshInterval * 60 * 1000

      return this.tokens[siteKey]
    } catch (error) {
      throw error
    }
  }

  async getPatients(siteIndex = 0) {
    const site = authConfig.sites[siteIndex]
    if (!site) {
      throw new Error(`Site à l'index ${siteIndex} non trouvé`)
    }

    try {
      const token = await this.getToken(siteIndex)

      // Utiliser le serveur backend local pour contourner CORS
      const url = 'http://localhost:3003/api/patients'

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Token ${token}`,
          'X-Site-Url': site.baseUrl, // Envoyer l'URL de base pour que le serveur sache quel site utiliser
        },
      })

      if (!response.ok) {
        if (response.status === 401) {
          this.tokens[site.baseUrl] = null
          const newToken = await this.getToken(siteIndex)
          
          const retryResponse = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Authorization': `Token ${newToken}`,
              'X-Site-Url': site.baseUrl,
            },
          })

          if (!retryResponse.ok) {
            const errorData = await retryResponse.json().catch(() => ({}))
            throw new Error(
              errorData.detail ||
              `Erreur ${retryResponse.status}: ${retryResponse.statusText}`
            )
          }

          return await retryResponse.json()
        }

        const errorData = await response.json().catch(() => ({}))
        throw new Error(
          errorData.detail ||
          `Erreur ${response.status}: ${response.statusText}`
        )
      }

      return await response.json()
    } catch (error) {
      throw error
    }
  }

  async getAllPatients() {
    const results = []
    for (let i = 0; i < authConfig.sites.length; i++) {
      try {
        const data = await this.getPatients(i)
        const count = this.countPatients(data)
        
        results.push({
          siteIndex: i,
          siteName: authConfig.sites[i].name,
          data: data,
          count: count,
        })
      } catch (error) {
        results.push({
          siteIndex: i,
          siteName: authConfig.sites[i].name,
          error: error.message,
          count: 0,
        })
      }
    }
    return results
  }

  countPatients(jsonData) {
    if (!jsonData) return 0

    if (Array.isArray(jsonData)) {
      if (jsonData.length === 0) return 0
      
      const firstItem = jsonData[0]
      if (firstItem && typeof firstItem === 'object' && 'source' in firstItem && 'target' in firstItem) {
        const uniqueSources = new Set(jsonData.map(item => item.source).filter(id => id != null))
        return uniqueSources.size
      }
      
      return jsonData.length
    }

    if (typeof jsonData === 'object') {
      const possibleKeys = ['results', 'data', 'patients', 'items', 'users_services', 'users', 'user_services']

      for (const key of possibleKeys) {
        if (Array.isArray(jsonData[key])) {
          return jsonData[key].length
        }
      }

      if (typeof jsonData.count === 'number') return jsonData.count
      if (typeof jsonData.total === 'number') return jsonData.total

      let maxCount = 0
      for (const key in jsonData) {
        if (Array.isArray(jsonData[key]) && jsonData[key].length > maxCount) {
          maxCount = jsonData[key].length
        }
      }
      
      if (maxCount > 0) return maxCount

      let count = 0
      for (const key in jsonData) {
        if (Array.isArray(jsonData[key])) {
          count += jsonData[key].length
        } else if (jsonData[key] && typeof jsonData[key] === 'object' && jsonData[key].id) {
          count++
        }
      }
      
      return count > 0 ? count : 0
    }

    return 0
  }

  cleanup() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
    }
  }
}

export const authService = new AuthService()
