const fs = require('fs');
const path = require('path');

const VALID_TOPICS = [
  'fear',
  'courage',
  'strength',
  'failure',
  'self_doubt',
  'self_belief',
  'discipline',
  'concentration',
  'action',
  'responsibility',
  'motivation',
  'purpose',
  'perseverance',
  'decision',
  'confusion',
  'relationships',
  'effort'
];

function validateCorpus(filePath = null) {
  const targetPath = filePath || path.join(__dirname, '..', 'data', 'passages.json');

  if (!fs.existsSync(targetPath)) {
    console.error(`ERROR: Corpus file not found at ${targetPath}`);
    return { valid: false, errors: [`File not found: ${targetPath}`] };
  }

  let rawData;
  try {
    rawData = fs.readFileSync(targetPath, 'utf8');
  } catch (err) {
    console.error(`ERROR: Unable to read file: ${err.message}`);
    return { valid: false, errors: [`Read error: ${err.message}`] };
  }

  let passages;
  try {
    passages = JSON.parse(rawData);
  } catch (err) {
    console.error(`ERROR: Invalid JSON in corpus file: ${err.message}`);
    return { valid: false, errors: [`JSON parse error: ${err.message}`] };
  }

  if (!Array.isArray(passages)) {
    console.error('ERROR: Corpus root must be an array of passages');
    return { valid: false, errors: ['Corpus root is not an array'] };
  }

  const seenIds = new Set();
  const seenTexts = new Map();
  let duplicateIds = 0;
  let duplicateTexts = 0;
  let invalidPassages = 0;
  let verifiedCount = 0;
  const errors = [];

  passages.forEach((p, idx) => {
    let passageValid = true;

    // 1. Check ID
    if (!p.id || typeof p.id !== 'string' || p.id.trim() === '') {
      errors.push(`Passage [${idx}]: missing or invalid 'id'`);
      passageValid = false;
    } else {
      if (seenIds.has(p.id)) {
        duplicateIds++;
        errors.push(`Passage [${idx}]: duplicate id '${p.id}'`);
        passageValid = false;
      }
      seenIds.add(p.id);
    }

    // 2. Check Text
    if (!p.text || typeof p.text !== 'string' || p.text.trim() === '') {
      errors.push(`Passage '${p.id || idx}': missing or empty 'text'`);
      passageValid = false;
    } else {
      const normalizedText = p.text.trim().toLowerCase();
      if (seenTexts.has(normalizedText)) {
        duplicateTexts++;
        errors.push(`Passage '${p.id || idx}': duplicate text identical to '${seenTexts.get(normalizedText)}'`);
        passageValid = false;
      } else {
        seenTexts.set(normalizedText, p.id || idx);
      }
    }

    // 3. Check Source metadata
    if (!p.source || typeof p.source !== 'object') {
      errors.push(`Passage '${p.id || idx}': missing 'source' object`);
      passageValid = false;
    } else {
      if (!p.source.title || typeof p.source.title !== 'string') {
        errors.push(`Passage '${p.id || idx}': missing source 'title'`);
        passageValid = false;
      }
      if (!p.source.author || typeof p.source.author !== 'string') {
        errors.push(`Passage '${p.id || idx}': missing source 'author'`);
        passageValid = false;
      }
      if (!p.source.work || typeof p.source.work !== 'string') {
        errors.push(`Passage '${p.id || idx}': missing source 'work'`);
        passageValid = false;
      }
    }

    // 4. Check Topics
    if (!Array.isArray(p.topics) || p.topics.length === 0) {
      errors.push(`Passage '${p.id || idx}': 'topics' must be a non-empty array`);
      passageValid = false;
    } else {
      for (const t of p.topics) {
        if (!VALID_TOPICS.includes(t)) {
          errors.push(`Passage '${p.id || idx}': invalid topic '${t}'`);
          passageValid = false;
        }
      }
    }

    // 5. Check Verified
    if (typeof p.verified !== 'boolean') {
      errors.push(`Passage '${p.id || idx}': 'verified' must be boolean`);
      passageValid = false;
    } else if (p.verified === true) {
      verifiedCount++;
    }

    // 6. Check Language
    if (!p.language || typeof p.language !== 'string') {
      errors.push(`Passage '${p.id || idx}': missing or invalid 'language'`);
      passageValid = false;
    }

    if (!passageValid) {
      invalidPassages++;
    }
  });

  const isValid = invalidPassages === 0 && duplicateIds === 0 && duplicateTexts === 0;

  console.log('CORPUS VALIDATION');
  console.log('-----------------');
  console.log(`Total passages: ${passages.length}`);
  console.log(`Verified passages: ${verifiedCount}`);
  console.log(`Invalid passages: ${invalidPassages}`);
  console.log(`Duplicate IDs: ${duplicateIds}`);
  console.log(`Duplicate texts: ${duplicateTexts}`);
  console.log('');

  if (isValid) {
    console.log('CORPUS VALIDATION PASSED');
  } else {
    console.log('CORPUS VALIDATION FAILED');
    console.log('Details:');
    errors.forEach((e) => console.log(`  - ${e}`));
  }

  return {
    valid: isValid,
    total: passages.length,
    verified: verifiedCount,
    invalid: invalidPassages,
    duplicateIds,
    duplicateTexts,
    errors
  };
}

if (require.main === module) {
  const result = validateCorpus();
  if (!result.valid) {
    process.exit(1);
  }
}

module.exports = { validateCorpus, VALID_TOPICS };
