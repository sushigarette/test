#!/bin/bash
# Script de test pour vérifier l'authentification

echo "Test de l'authentification avec curl..."
echo ""

curl -X POST "https://mhlink.elivie.fr/api-token-auth/" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "username": "mhadmin",
    "password": ";s/N!ii^&EP6Qkg{UgqqzqQYw%sD$Zy}*n)8W)NDzw?WYmwrxuXgA3i!5s11"
  }'

echo ""
echo ""
echo "Si vous obtenez un token, les identifiants sont corrects."
echo "Si vous obtenez une erreur 403, vérifiez vos identifiants."

