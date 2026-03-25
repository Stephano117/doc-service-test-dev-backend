import { Worker as ThreadWorker } from 'worker_threads';
import path from 'path';
import { Readable } from 'stream';
import mongoose from 'mongoose';
import { DocumentModel } from '../models/Document';
import { pdfGenerationDuration } from '../utils/metrics';

const PDF_TIMEOUT_MS = Number(process.env.PDF_TIMEOUT_MS) || 5000;

export const generatePdfInWorker = (
  userId: string,
  documentId: string,
  batchId: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const timer = pdfGenerationDuration.startTimer();

    const timeout = setTimeout(() => {
      reject(new Error(`Timeout PDF generation after ${PDF_TIMEOUT_MS}ms`));
    }, PDF_TIMEOUT_MS);

    // Utilise le fichier compilé dans dist/
    const workerPath = path.resolve(process.cwd(), 'dist/workers/pdfWorker.js');

    const worker = new ThreadWorker(workerPath, {
      workerData: { userId, documentId, batchId },
    });

    worker.on('message', async (result: Buffer | { error: string }) => {
      clearTimeout(timeout);

      if (typeof result === 'object' && 'error' in result) {
        timer();
        reject(new Error(result.error));
        return;
      }

      timer();
      const pdfBuffer = result as Buffer;

      try {
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
          { gridfsFileId: uploadStream.id }
        );

        resolve(filename);
      } catch (err) {
        reject(err);
      }
    });

    worker.on('error', (err) => {
      clearTimeout(timeout);
      timer();
      reject(err);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        clearTimeout(timeout);
        reject(new Error(`Worker thread exited with code ${code}`));
      }
    });
  });
};