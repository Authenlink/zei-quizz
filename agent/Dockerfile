# Dockerfile pour déploiement Railway / PaaS
# Référence : docs/PLAN_IMPLEMENTATION_DEPLOIEMENT_ETAPE_14.md

FROM python:3.11-slim

WORKDIR /app

# Dépendances d'abord (cache Docker)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Code source
COPY . .

# Railway injecte PORT automatiquement
EXPOSE 8000

# Pas de --reload en production
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
