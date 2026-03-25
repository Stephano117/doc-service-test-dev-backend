import { body, param } from 'express-validator';

export const validateBatchCreate = [
  body('userIds')
    .isArray({ min: 1, max: 1000 })
    .withMessage('userIds doit être un tableau de 1 à 1000 éléments'),
  body('userIds.*')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Chaque userId doit être une chaîne non vide'),
];

export const validateBatchId = [
  param('batchId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('batchId invalide'),
];

export const validateDocumentId = [
  param('documentId')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('documentId invalide'),
];