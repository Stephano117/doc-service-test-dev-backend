import mongoose from 'mongoose';
import { logger } from '../src/utils/logger';

let isConnected = false;

export const connectDB = async (): Promise<void> => {
  if (isConnected) return;

  try {
    const uri = process.env.MONGODB_URI!;
    await mongoose.connect(uri);
    isConnected = true;
    logger.info('MongoDB connecté');
  } catch (error) {
    logger.error('Erreur connexion MongoDB', { error });
    throw error;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB déconnecté');
};

export const isDBConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
