import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const BATCH_SIZE = 1000;

const generateUserIds = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `user-${String(i + 1).padStart(4, '0')}`);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const run = async () => {
  console.log(`\n Benchmark — ${BATCH_SIZE} documents\n`);

  const userIds = generateUserIds(BATCH_SIZE);
  const startTotal = Date.now();

  // Lance le batch
  const { data: batchData } = await axios.post(`${API_URL}/api/documents/batch`, { userIds });
  const { batchId } = batchData;
  console.log(` Batch créé : ${batchId}`);

  // Poll le statut
  let completed = false;
  let lastProcessed = 0;
  const pollStart = Date.now();

  while (!completed) {
    await sleep(2000);
    const { data } = await axios.get(`${API_URL}/api/documents/batch/${batchId}`);

    const { status, processedDocuments, failedDocuments, totalDocuments } = data;
    const elapsed = ((Date.now() - pollStart) / 1000).toFixed(1);
    const docsPerSec = (processedDocuments / ((Date.now() - pollStart) / 1000)).toFixed(1);

    if (processedDocuments !== lastProcessed) {
      console.log(
        ` [${elapsed}s] ${processedDocuments}/${totalDocuments} traités` +
        ` | ${failedDocuments} échecs | ${docsPerSec} docs/s`
      );
      lastProcessed = processedDocuments;
    }

    if (status === 'completed' || status === 'failed') {
      completed = true;
      const totalTime = ((Date.now() - startTotal) / 1000).toFixed(2);
      const finalDocsPerSec = (processedDocuments / parseFloat(totalTime)).toFixed(1);

      console.log(`\n RAPPORT BENCHMARK`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`Statut final     : ${status}`);
      console.log(`Temps total      : ${totalTime}s`);
      console.log(`Documents traités: ${processedDocuments}/${totalDocuments}`);
      console.log(`Échecs           : ${failedDocuments}`);
      console.log(`Débit moyen      : ${finalDocsPerSec} docs/seconde`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    }
  }
};

run().catch((err) => {
  console.error('Erreur benchmark:', err.message);
  process.exit(1);
});