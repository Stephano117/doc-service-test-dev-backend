import Redis from 'ioredis';
import { logger } from '../src/utils/logger';

// Options de connexion partagées (utilisées par BullMQ directement)
export const redisConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null, // obligatoire pour BullMQ
};

// Client ioredis pour usage direct (fallback, safeGet, safeSet)
let redisClient: Redis | null = null;
let isRedisAvailable = false;

const memoryFallback = new Map<string, string>();

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis(redisConnectionOptions);

    redisClient.on('connect', () => {
      isRedisAvailable = true;
      logger.info('Redis connecté');
    });

    redisClient.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn('Redis indisponible, fallback mémoire actif', { err: err.message });
    });
  }
  return redisClient;
};

export const isRedisUp = (): boolean => isRedisAvailable;

export const safeSet = async (key: string, value: string): Promise<void> => {
  if (isRedisAvailable && redisClient) {
    await redisClient.set(key, value);
  } else {
    memoryFallback.set(key, value);
  }
};

export const safeGet = async (key: string): Promise<string | null> => {
  if (isRedisAvailable && redisClient) {
    return redisClient.get(key);
  }
  return memoryFallback.get(key) ?? null;
};