// Fichier d'exemple de configuration
// Copiez ce fichier vers auth.config.js et remplissez vos identifiants

export const authConfig = {
  // Identifiants pour l'authentification
  username: 'VOTRE_IDENTIFIANT', // Remplacez par votre identifiant
  password: 'VOTRE_MOT_DE_PASSE', // Remplacez par votre mot de passe
  
  // URLs de l'API
  tokenUrl: 'https://mhlink.elivie.fr/api-token-auth/',
  patientsUrl: 'https://mhlink.elivie.fr/api/users_services?user_type=patient',
  
  // Auto-refresh du token (en minutes)
  tokenRefreshInterval: 30,
}

