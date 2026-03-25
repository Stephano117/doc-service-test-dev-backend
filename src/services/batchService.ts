import { v4 as uuidv4 } from 'uuid';
import { Batch, IBatch } from '../models/Batch';
import { DocumentModel } from '../models/Document';
import { enqueueBatch } from '../queue/producer';
import { logger } from '../utils/logger';
import { batchProcessingDuration } from '../utils/metrics';

export const createBatch = async (userIds: string[]): Promise<string> => {
  const batchId = uuidv4();
  const timer = batchProcessingDuration.startTimer();

  // Crée les documents individuels en base
  const documents = userIds.map((userId) => ({
    documentId: uuidv4(),
    batchId,
    userId,
    status: 'pending' as const,
  }));

  // Insertion en masse (plus rapide qu'un insert par un)
  await DocumentModel.insertMany(documents);

  // Crée le batch
  await Batch.create({
    batchId,
    status: 'pending',
    userIds,
    totalDocuments: userIds.length,
  });

  // Enfile les jobs dans Bull
  await enqueueBatch(
    batchId,
    documents.map((d) => ({ userId: d.userId, documentId: d.documentId }))
  );

  // Met à jour le statut du batch
  await Batch.findOneAndUpdate({ batchId }, { status: 'processing' });

  logger.info('Batch créé', { batchId, total: userIds.length });

  // Arrête le timer quand le batch est completé (via hook mongoose)
  const checkCompletion = setInterval(async () => {
    const batch = await Batch.findOne({ batchId });
    if (!batch) return;

    const isDone =
      batch.processedDocuments + batch.failedDocuments >= batch.totalDocuments;

    if (isDone) {
      clearInterval(checkCompletion);
      const status = batch.failedDocuments === batch.totalDocuments
        ? 'failed'
        : 'completed';
      await Batch.findOneAndUpdate({ batchId }, { status, completedAt: new Date() });
      timer();
      logger.info('Batch terminé', { batchId, status });
    }
  }, 2000); // vérifie toutes les 2 secondes

  return batchId;
};

export const getBatchStatus = async (batchId: string): Promise<IBatch | null> => {
  return Batch.findOne({ batchId });
};