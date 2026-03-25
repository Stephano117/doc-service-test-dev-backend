import { Router } from 'express';
import {
  createBatchHandler,
  getBatchHandler,
  getDocumentHandler,
} from '../controllers/batchController';
import {
  validateBatchCreate,
  validateBatchId,
  validateDocumentId,
} from '../validators/batchValidator';
import { batchRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/documents/batch
router.post('/batch', batchRateLimiter, validateBatchCreate, createBatchHandler);

// GET /api/documents/batch/:batchId
router.get('/batch/:batchId', validateBatchId, getBatchHandler);

// GET /api/documents/:documentId
router.get('/:documentId', validateDocumentId, getDocumentHandler);

export default router;