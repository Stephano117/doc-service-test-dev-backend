import CircuitBreaker from 'opossum';
import { logger } from '../utils/logger';

// Simule un appel DocuSign externe
const callDocuSign = async (documentId: string): Promise<{ signed: boolean }> => {
  // Simulation : 10% de chance d'échec
  if (Math.random() < 0.1) {
    throw new Error('DocuSign service unavailable');
  }
  await new Promise((resolve) => setTimeout(resolve, 200));
  return { signed: true };
};

const options = {
  timeout: 3000,          // si pas de réponse en 3s → échec
  errorThresholdPercentage: 50,  // si 50% d'échecs → circuit ouvert
  resetTimeout: 10000,    // après 10s → tente de refermer le circuit
};

export const docuSignBreaker = new CircuitBreaker(callDocuSign, options);

docuSignBreaker.on('open', () =>
  logger.warn('Circuit breaker DocuSign OUVERT — appels bloqués')
);
docuSignBreaker.on('halfOpen', () =>
  logger.info('Circuit breaker DocuSign SEMI-OUVERT — test en cours')
);
docuSignBreaker.on('close', () =>
  logger.info('Circuit breaker DocuSign FERMÉ — service rétabli')
);

export const signDocument = async (documentId: string) => {
  return docuSignBreaker.fire(documentId);
};