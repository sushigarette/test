import express from 'express'
import cors from 'cors'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3003

app.use(cors())
app.use(express.json())

let sitesConfig = []
try {
  const jsonConfigPath = path.join(__dirname, 'src', 'config', 'auth.config.json')
  const exampleConfigPath = path.join(__dirname, 'src', 'config', 'auth.config.example.json')
  
  if (fs.existsSync(jsonConfigPath)) {
    const jsonContent = fs.readFileSync(jsonConfigPath, 'utf8')
    const configData = JSON.parse(jsonContent)
    sitesConfig = configData.sites || []
  } else if (fs.existsSync(exampleConfigPath)) {
    // Si le fichier de config n'existe pas, créer un fichier vide à partir de l'exemple
    const exampleContent = fs.readFileSync(exampleConfigPath, 'utf8')
    fs.writeFileSync(jsonConfigPath, exampleContent, 'utf8')
    const configData = JSON.parse(exampleContent)
    sitesConfig = configData.sites || []
  } else {
    // Créer un fichier de config vide
    const emptyConfig = {
      sites: [],
      tokenRefreshInterval: 30,
    }
    fs.writeFileSync(jsonConfigPath, JSON.stringify(emptyConfig, null, 2), 'utf8')
    sitesConfig = []
  }
} catch (error) {
  console.error('❌ Erreur lors du chargement de la config:', error)
  console.error(error.stack)
}

app.post('/api/token', async (req, res) => {
  try {
    const { username, password, baseUrl } = req.body
    
    let site = null
    if (baseUrl) {
      site = sitesConfig.find(s => s.baseUrl === baseUrl)
    }
    
    if (!site && sitesConfig.length > 0) {
      site = sitesConfig[0]
    }
    
    if (!site) {
      return res.status(400).json({ error: 'Aucun site configuré' })
    }
    
    const finalUsername = username || site.username
    const finalPassword = password || site.password
    
    if (!finalUsername || !finalPassword) {
      return res.status(400).json({ error: 'Identifiants manquants' })
    }
    
    let tokenUrl = site.tokenUrl
    if (!tokenUrl.startsWith('http')) {
      tokenUrl = `${site.baseUrl}${tokenUrl.startsWith('/') ? '' : '/'}${tokenUrl}`
    }
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        username: finalUsername,
        password: finalPassword,
      }),
    })

    const data = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/patients', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Token ', '') || req.headers.authorization?.replace('Bearer ', '')
    const baseUrl = req.headers['x-site-url']
    
    if (!token) {
      return res.status(401).json({ error: 'Token manquant' })
    }

    // Trouver le site correspondant
    let site = sitesConfig.find(s => s.baseUrl === baseUrl)
    
    // Si aucun site trouvé, utiliser le premier par défaut
    if (!site && sitesConfig.length > 0) {
      site = sitesConfig[0]
    }
    
    if (!site) {
      return res.status(400).json({ error: 'Aucun site configuré' })
    }

    let patientsUrl = site.patientsUrl
    if (!patientsUrl.startsWith('http')) {
      patientsUrl = `${site.baseUrl}${patientsUrl.startsWith('/') ? '' : '/'}${patientsUrl}`
    }

    const response = await fetch(patientsUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Token ${token}`,
      },
    })

    const data = await response.json()
    
    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/config-test', (req, res) => {
  res.json({
    sitesCount: sitesConfig.length,
    sites: sitesConfig.map(s => ({
      name: s.name,
      baseUrl: s.baseUrl,
      hasUsername: !!s.username,
      hasPassword: !!s.password,
    })),
  })
})

app.get('/api/config-get', (req, res) => {
  res.json({
    sites: sitesConfig.map(s => ({
      name: s.name,
      baseUrl: s.baseUrl,
      username: s.username,
      password: s.password,
      tokenUrl: s.tokenUrl,
      patientsUrl: s.patientsUrl,
    })),
  })
})

app.post('/api/config-save', (req, res) => {
  try {
    const { sites } = req.body
    
    if (!sites || !Array.isArray(sites)) {
      return res.status(400).json({ error: 'Données invalides' })
    }

    const jsonConfigPath = path.join(__dirname, 'src', 'config', 'auth.config.json')
    
    const configData = {
      sites: sites.map(site => ({
        name: site.name,
        baseUrl: site.baseUrl,
        username: site.username,
        password: site.password,
        tokenUrl: site.tokenUrl,
        patientsUrl: site.patientsUrl,
      })),
      tokenRefreshInterval: 30,
    }

    fs.writeFileSync(jsonConfigPath, JSON.stringify(configData, null, 2), 'utf8')
    
    sitesConfig = configData.sites
    
    res.json({ success: true, message: 'Configuration sauvegardée' })
  } catch (error) {
    console.error('Erreur lors de la sauvegarde:', error)
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/check-setup', (req, res) => {
  const passwordPath = path.join(__dirname, 'src', 'config', '.config-password')
  const isConfigured = fs.existsSync(passwordPath)
  res.json({ isConfigured })
})

app.post('/api/setup-password', (req, res) => {
  try {
    const { password } = req.body
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' })
    }

    const passwordPath = path.join(__dirname, 'src', 'config', '.config-password')
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    
    fs.writeFileSync(passwordPath, hash, 'utf8')
    
    res.json({ success: true, message: 'Mot de passe configuré' })
  } catch (error) {
    console.error('Erreur lors de la configuration du mot de passe:', error)
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/verify-password', (req, res) => {
  try {
    const { password } = req.body
    const passwordPath = path.join(__dirname, 'src', 'config', '.config-password')
    
    if (!fs.existsSync(passwordPath)) {
      // Si le fichier n'existe pas, utiliser le mot de passe par défaut pour la migration
      const defaultPassword = 'admin123'
      return res.json({ valid: password === defaultPassword })
    }

    const storedHash = fs.readFileSync(passwordPath, 'utf8').trim()
    const hash = crypto.createHash('sha256').update(password).digest('hex')
    
    res.json({ valid: hash === storedHash })
  } catch (error) {
    console.error('Erreur lors de la vérification du mot de passe:', error)
    res.status(500).json({ error: error.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`)
})
