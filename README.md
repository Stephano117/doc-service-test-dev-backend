# Document Generation Service

API de génération de documents CERFA en batch avec Node.js/TypeScript, BullMQ, MongoDB GridFS.

## Architecture
Client → POST /batch → API → BullMQ (Redis) → Worker → PDF → MongoDB GridFS
↓
Client ← batchId (202 Accepted)
↓
Client → GET /batch/:batchId → Status
↓
Client → GET /document/:id → PDF

text

## Stack

- **Express + TypeScript** — API REST
- **BullMQ + Redis** — Queue avec retry et backoff exponentiel
- **MongoDB + GridFS** — Stockage métadonnées et PDFs
- **pdf-lib** — Génération PDF pure JS
- **Prometheus + Winston** — Métriques et logs structurés
- **Docker Compose** — Orchestration locale

## Démarrage rapide

```bash
# Variables d'environnement
cp .env.example .env

# Démarrage (MongoDB + Redis)
docker compose up -d mongodb redis

# Installation
npm install

# Compilation
npx tsc

# Terminal 1 - API
npm run dev

# Terminal 2 - Worker
npm run worker
Endpoints
Méthode	Route	Description
POST	/api/documents/batch	Lancer génération (1-1000 userIds)
GET	/api/documents/batch/:batchId	Statut du batch
GET	/api/documents/:documentId	Télécharger PDF
GET	/health	Health check
GET	/metrics	Métriques Prometheus
Exemple
bash
# Créer un batch
curl -X POST http://localhost:3000/api/documents/batch \
  -H "Content-Type: application/json" \
  -d '{"userIds": ["user-1", "user-2", "user-3"]}'

# Vérifier statut
curl http://localhost:3000/api/documents/batch/<batchId>
Résilience
Retry : 3 tentatives avec backoff exponentiel

Fallback mémoire si Redis down

Circuit breaker pour appels externes

Graceful shutdown (SIGTERM)

Observabilité
Logs JSON avec batchId/documentId

Métriques Prometheus sur /metrics

Health check sur /health

Déploiement
bash
# Docker (tout-en-un)
docker compose up --build
Render.com :

Web Service : npm install && npx tsc → node dist/src/server.js

Background Worker : node dist/workers/queueWorker.js

Benchmark
bash
npm run benchmark
Tests
bash
npm test
Structure
text
src/
├── api/           # Routes, controllers
├── models/        # MongoDB schemas
├── queue/         # BullMQ producer/consumer
├── services/      # PDF generation
├── middleware/    # Rate limiter, error handler
└── utils/         # Logger, metrics
Choix techniques
BullMQ : Queue persistante, retry natif, concurrency configurable

GridFS : Streaming PDF sans limite taille, pas de volume Docker

pdf-lib : Génération pure JS, sans Chromium (plus léger)
