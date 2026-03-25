import { Queue } from 'bullmq';
import { redisConnectionOptions } from '../../config/redis';
import { logger } from '../utils/logger';
import { queueSize } from '../utils/metrics';

export const QUEUE_NAME = 'pdf-generation';

let pdfQueue: Queue | null = null;

export const getQueue = (): Queue => {
  if (!pdfQueue) {
    pdfQueue = new Queue(QUEUE_NAME, {
      connection: redisConnectionOptions, // ← options brutes, pas le client
      defaultJobOptions: {
        attempts: Number(process.env.MAX_RETRIES) || 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
    logger.info('Queue PDF initialisée');
  }
  return pdfQueue;
};

export const enqueueBatch = async (
  batchId: string,
  jobs: { userId: string; documentId: string }[]
): Promise<void> => {
  const queue = getQueue();

  await queue.addBulk(
    jobs.map((job) => ({
      name: 'generate-pdf',
      data: { batchId, userId: job.userId, documentId: job.documentId },
    }))
  );

  queueSize.set(jobs.length);
  logger.info('Jobs enfilés dans la queue', { batchId, count: jobs.length });
};