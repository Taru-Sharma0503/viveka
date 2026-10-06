require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { QdrantClient } = require('@qdrant/js-client-rest');

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'vivekananda_passages';

async function uploadToQdrant() {
  console.log('Preparing to upload passages to Qdrant...');

  const embeddedPath = path.join(__dirname, '..', 'data', 'passages.embedded.json');
  let passages;

  if (fs.existsSync(embeddedPath)) {
    passages = JSON.parse(fs.readFileSync(embeddedPath, 'utf8'));
  } else {
    console.log('Embedded passages file not found. Generating embeddings first...');
    const { generateEmbeddings } = require('./generate-embeddings');
    passages = await generateEmbeddings();
  }

  const qdrantUrl = process.env.QDRANT_URL;
  const qdrantApiKey = process.env.QDRANT_API_KEY;

  if (!qdrantUrl || qdrantUrl.includes('localhost:6333') && !qdrantApiKey) {
    console.log('Notice: QDRANT_URL is not configured or pointing to local unauthenticated instance.');
  }

  const client = new QdrantClient({
    url: qdrantUrl || 'http://localhost:6333',
    apiKey: qdrantApiKey || undefined,
    checkCompatibility: false
  });

  try {
    const collections = await client.getCollections();
    const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);

    const vectorSize = passages[0] && passages[0].embedding ? passages[0].embedding.length : 1536;

    if (!exists) {
      console.log(`Creating collection '${COLLECTION_NAME}' with vector size ${vectorSize}...`);
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine'
        }
      });
    } else {
      console.log(`Collection '${COLLECTION_NAME}' already exists.`);
    }

    const points = passages.map((p, idx) => {
      // Create numeric point id or uuid from string ID
      const numericId = parseInt(p.id.replace(/\D/g, ''), 10) || idx + 1;
      return {
        id: numericId,
        vector: p.embedding,
        payload: {
          passageId: p.id,
          sourceId: p.source && p.source.id ? p.source.id : `SRC_${p.id}`,
          text: p.text,
          topics: p.topics,
          work: p.source ? p.source.work : '',
          section: p.source ? p.source.section : '',
          language: p.language || 'en',
          verified: p.verified
        }
      };
    });

    console.log(`Upserting ${points.length} points to collection '${COLLECTION_NAME}'...`);
    await client.upsert(COLLECTION_NAME, {
      points
    });

    console.log('--------------------------------------------------');
    console.log('QDRANT UPLOAD COMPLETED SUCCESSFULLY');
    console.log(`Collection: ${COLLECTION_NAME}`);
    console.log(`Uploaded count: ${points.length}`);
    console.log('--------------------------------------------------');
    return true;
  } catch (err) {
    console.warn(`[Qdrant Upload Warning]: ${err.message}`);
    console.log('In local/hackathon environment without active Qdrant instance, local fallback memory cache will be used by retrieve.js.');
    return false;
  }
}

if (require.main === module) {
  uploadToQdrant().catch((err) => {
    console.error('Fatal Qdrant Upload error:', err);
    process.exit(1);
  });
}

module.exports = { uploadToQdrant };
