import { Worker, Job } from 'bullmq';
import { redisConnectionOptions } from '../../config/redis';
import { QUEUE_NAME } from './producer';
import { logger, createContextLogger } from '../utils/logger';
import { DocumentModel } from '../models/Document';
import { Batch } from '../models/Batch';
import { documentsGeneratedTotal, queueSize } from '../utils/metrics';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Readable } from 'stream';
import mongoose from 'mongoose';

export interface PdfJobData {
  batchId: string;
  userId: string;
  documentId: string;
}

const generatePDFBuffer = async (
  userId: string,
  documentId: string,
  batchId: string
): Promise<Buffer> => {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const { height } = page.getSize();

  page.drawText('CERFA - Document Officiel', {
    x: 50, y: height - 60, size: 20,
    font: boldFont, color: rgb(0.1, 0.1, 0.6),
  });

  page.drawLine({
    start: { x: 50, y: height - 70 },
    end: { x: 545, y: height - 70 },
    thickness: 1, color: rgb(0.5, 0.5, 0.5),
  });

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateFormatee = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const fields = [
    { label: 'Identifiant utilisateur', value: userId },
    { label: 'Identifiant document',    value: documentId },
    { label: 'Identifiant batch',       value: batchId },
    { label: 'Date de génération',      value: dateFormatee },
    { label: 'Statut',                  value: 'Généré automatiquement' },
  ];

  fields.forEach(({ label, value }, i) => {
    const y = height - 120 - i * 40;
    page.drawText(`${label} :`, { x: 50, y, size: 11, font: boldFont, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(value, { x: 220, y, size: 11, font, color: rgb(0, 0, 0) });
  });

  page.drawText(`Généré le ${dateFormatee.split(' ')[0]}`, {
    x: 50, y: 30, size: 9, font, color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

export const startConsumer = (): Worker => {
  const worker = new Worker<PdfJobData>(
    QUEUE_NAME,
    async (job: Job<PdfJobData>) => {
      const { batchId, userId, documentId } = job.data;
      const log = createContextLogger({ batchId, documentId, userId });

      log.info('Début traitement job PDF');

      await DocumentModel.findOneAndUpdate(
        { documentId },
        { status: 'processing', attempts: job.attemptsMade + 1 }
      );

      try {
        // Génère le PDF directement (sans worker thread)
        const pdfBuffer = await generatePDFBuffer(userId, documentId, batchId);

        // Sauvegarde dans GridFS
        const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db!, {
          bucketName: 'pdfs',
        });

        const filename = `document_${documentId}.pdf`;
        const readable = Readable.from(pdfBuffer);
        const uploadStream = bucket.openUploadStream(filename, {
          metadata: { userId, documentId, batchId },
        });

        await new Promise<void>((res, rej) => {
          readable.pipe(uploadStream);
          uploadStream.on('finish', res);
          uploadStream.on('error', rej);
        });

        await DocumentModel.findOneAndUpdate(
          { documentId },
          { status: 'completed', filename, gridfsFileId: uploadStream.id }
        );

        await Batch.findOneAndUpdate(
          { batchId },
          { $inc: { processedDocuments: 1 }, $push: { documentIds: documentId } }
        );

        documentsGeneratedTotal.inc({ status: 'success' });
        queueSize.dec();
        log.info('PDF généré avec succès', { filename });

      } catch (error) {
        const err = error as Error;
        log.error('Échec génération PDF', { error: err.message });

        await DocumentModel.findOneAndUpdate(
          { documentId },
          { status: 'failed', error: err.message }
        );

        await Batch.findOneAndUpdate(
          { batchId },
          { $inc: { failedDocuments: 1 } }
        );

        documentsGeneratedTotal.inc({ status: 'failed' });
        queueSize.dec();
        throw error;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: Number(process.env.QUEUE_CONCURRENCY) || 50,
    }
  );

  worker.on('completed', (job) => {
    logger.info('Job terminé', { jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error('Job échoué définitivement', {
      jobId: job?.id,
      error: err.message,
      attempts: job?.attemptsMade,
    });
  });

  logger.info('Consumer Bull démarré', {
    concurrency: process.env.QUEUE_CONCURRENCY || 50,
  });

  return worker;
};