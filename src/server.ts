import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from '../config/database';
import { getRedisClient } from '../config/redis';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT) || 3000;

const start = async () => {
  try {
    // Connexions
    await connectDB();
    const redis = getRedisClient();
    await redis.connect().catch(() => {
      logger.warn('Redis non disponible au démarrage, fallback mémoire actif');
    });

    // Démarrage serveur
    const server = app.listen(PORT, () => {
      logger.info(`Serveur démarré sur http://localhost:${PORT}`);
      logger.info(`Swagger UI : http://localhost:${PORT}/api-docs`);
      logger.info(`Health check : http://localhost:${PORT}/health`);
      logger.info(`Métriques : http://localhost:${PORT}/metrics`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Signal ${signal} reçu, arrêt propre...`);
      server.close(async () => {
        logger.info('Serveur HTTP fermé');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Erreur démarrage serveur', { error });
    process.exit(1);
  }
};

start();