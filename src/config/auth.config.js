// Configuration d'authentification
// ⚠️ ATTENTION: Ne pas commiter ce fichier avec des identifiants réels en production
// Utilisez des variables d'environnement pour la production
// 
// NOTE: Le serveur backend utilise maintenant auth.config.json pour une meilleure compatibilité
// Ce fichier JS est toujours utilisé par le frontend React

import authConfigJson from './auth.config.json'

export const authConfig = {
  // Configuration pour plusieurs sites (chargée depuis le JSON)
  sites: authConfigJson.sites,
  
  // Auto-refresh du token (en minutes)
  tokenRefreshInterval: authConfigJson.tokenRefreshInterval || 30,
}

