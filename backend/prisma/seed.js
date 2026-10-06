import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  const passagesPath = path.resolve(__dirname, '../src/data/passages.json');
  const rawData = fs.readFileSync(passagesPath, 'utf8');
  const passages = JSON.parse(rawData);

  console.log(`Seeding ${passages.length} passages...`);

  for (const passage of passages) {
    await prisma.passage.upsert({
      where: { passageId: passage.passageId },
      update: {
        exactText: passage.exactText,
        title: passage.title,
        work: passage.work,
        section: passage.section,
        author: passage.author || 'Swami Vivekananda',
        sourceUrl: passage.sourceUrl,
        topic: passage.topic,
      },
      create: {
        passageId: passage.passageId,
        exactText: passage.exactText,
        title: passage.title,
        work: passage.work,
        section: passage.section,
        author: passage.author || 'Swami Vivekananda',
        sourceUrl: passage.sourceUrl,
        topic: passage.topic,
      },
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
