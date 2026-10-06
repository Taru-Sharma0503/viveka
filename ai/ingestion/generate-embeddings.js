require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { embedText } = require('../rag/embed');
const { validateCorpus } = require('./validate-corpus');

async function generateEmbeddings() {
  console.log('Generating embeddings for Vivekananda corpus...');
  const validation = validateCorpus();
  if (!validation.valid) {
    console.error('Cannot generate embeddings: Corpus validation failed.');
    process.exit(1);
  }

  const inputPath = path.join(__dirname, '..', 'data', 'passages.json');
  const passages = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  const embeddedPassages = [];

  for (let i = 0; i < passages.length; i++) {
    const passage = passages[i];
    console.log(`[${i + 1}/${passages.length}] Embedding passage ${passage.id}...`);
    try {
      const vector = await embedText(passage.text);
      embeddedPassages.push({
        ...passage,
        embedding: vector
      });
    } catch (err) {
      console.error(`Failed to embed passage ${passage.id}: ${err.message}`);
    }
  }

  const outputPath = path.join(__dirname, '..', 'data', 'passages.embedded.json');
  fs.writeFileSync(outputPath, JSON.stringify(embeddedPassages, null, 2), 'utf8');

  console.log('--------------------------------------------------');
  console.log(`EMBEDDINGS GENERATED SUCCESSFULLY`);
  console.log(`Total passages processed: ${embeddedPassages.length}`);
  console.log(`Saved to: ${outputPath}`);
  console.log('--------------------------------------------------');

  return embeddedPassages;
}

if (require.main === module) {
  generateEmbeddings().catch((err) => {
    console.error('Fatal error during embedding generation:', err);
    process.exit(1);
  });
}

module.exports = { generateEmbeddings };
