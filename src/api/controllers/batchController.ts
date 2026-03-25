import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { createBatch, getBatchStatus } from '../../services/batchService';
import { DocumentModel } from '../../models/Document';
import { createError } from '../../middleware/errorHandler';
import { logger } from '../../utils/logger';
import mongoose from 'mongoose';

// POST /api/documents/batch
export const createBatchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError(
        errors.array().map(e => e.msg).join(', '),
        400
      ));
    }

    const { userIds } = req.body as { userIds: string[] };
    const batchId = await createBatch(userIds);

    logger.info('Batch lancé via API', { batchId, count: userIds.length });

    res.status(202).json({
      success: true,
      batchId,
      message: `Génération de ${userIds.length} documents lancée`,
      statusUrl: `/api/documents/batch/${batchId}`,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/documents/batch/:batchId
export const getBatchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('batchId invalide', 400));
    }

    const batchId = req.params.batchId as string;
    const batch = await getBatchStatus(batchId);

    if (!batch) {
      return next(createError('Batch introuvable', 404));
    }

    res.json({
      success: true,
      batchId: batch.batchId,
      status: batch.status,
      totalDocuments: batch.totalDocuments,
      processedDocuments: batch.processedDocuments,
      failedDocuments: batch.failedDocuments,
      documentIds: batch.documentIds,
      createdAt: batch.createdAt,
      completedAt: batch.completedAt,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/documents/:documentId
export const getDocumentHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(createError('documentId invalide', 400));
    }

    const documentId = req.params.documentId as string;
    const document = await DocumentModel.findOne({ documentId });

    if (!document) {
      return next(createError('Document introuvable', 404));
    }

    if (document.status !== 'completed' || !document.gridfsFileId) {
      return next(createError(`Document non disponible (statut: ${document.status})`, 404));
    }

    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
      bucketName: 'pdfs',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.filename}"`
    );

    const downloadStream = bucket.openDownloadStream(document.gridfsFileId);

    downloadStream.on('error', () => {
      next(createError('Erreur lecture PDF', 500));
    });

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};