import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { globalRateLimiter } from './middleware/rateLimiter';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import documentsRouter from './api/routes/documents';
import { register } from './utils/metrics';
import { isDBConnected } from '../config/database';
import { isRedisUp } from '../config/redis';
import { logger } from './utils/logger';

const app = express();

// Sécurité
app.use(helmet());
app.use(cors());
app.use(globalRateLimiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger UI
const swaggerDocument = YAML.load(
  path.join(__dirname, '../swagger.yaml')
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/documents', documentsRouter);

// Health check
app.get('/health', (_req, res) => {
  const status = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: isDBConnected() ? 'up' : 'down',
      redis: isRedisUp() ? 'up' : 'down',
    },
  };

  const isHealthy = isDBConnected();
  res.status(isHealthy ? 200 : 503).json(status);
});

// Métriques Prometheus
app.get('/metrics', async (_req, res) => {
  try {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  } catch (err) {
    logger.error('Erreur métriques', { err });
    res.status(500).end();
  }
});

// 404
app.use(notFoundHandler);

// Gestion globale des erreurs
app.use(errorHandler);

export default app;