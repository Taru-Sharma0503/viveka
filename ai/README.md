# Viveka — AI/ML Reflective Mentor Layer

Viveka is an AI reflective mentor inspired by the documented teachings of Swami Vivekananda.

> **CRITICAL ETHICAL & ARCHITECTURAL CONSTRAINTS:**
> - Viveka is NOT Swami Vivekananda and does NOT impersonate him.
> - The AI is NOT a spiritual or moral authority and does not diagnose mental health conditions.
> - Documented teachings are strictly distinguished from AI interpretation.
> - The AI module NEVER fabricates or alters quotations. It returns ONLY passage ID references (`["VIV_001"]`).
> - The backend is the single authority for retrieving exact quotation text from PostgreSQL using passage IDs.

---

## 1. Directory Structure

```text
ai/
├── data/
│   └── passages.json               # Verified Vivekananda corpus (JSON)
├── ingestion/
│   ├── validate-corpus.js          # Corpus integrity & schema validator
│   ├── generate-embeddings.js      # Batch embedding generator
│   └── upload-qdrant.js            # Qdrant collection creator & vector uploader
├── providers/
│   ├── gemini.provider.js          # Primary LLM provider (Google Gemini)
│   ├── groq.provider.js            # Fallback LLM provider (Groq)
│   └── llm-router.js               # LLM router with fallback error handling
├── rag/
│   ├── embed.js                    # Core text embedding interface (Independent)
│   ├── retrieve.js                 # Semantic vector search & topic filtering
│   └── rag.service.js              # Context generator & topic routing assistant
├── prompts/
│   ├── system.prompt.txt           # Base system persona & constraints
│   ├── understand.prompt.txt       # UNDERSTAND stage prompt
│   ├── clarify.prompt.txt          # CLARIFY stage prompt
│   ├── root-concern.prompt.txt     # ROOT_CONCERN stage prompt
│   ├── teaching.prompt.txt         # TEACHING stage prompt
│   ├── reflection.prompt.txt       # REFLECT stage prompt
│   ├── action.prompt.txt           # ACTION stage prompt
│   └── review.prompt.txt           # REVIEW stage prompt
├── schemas/
│   └── ai-response.schema.json     # Draft-07 JSON Schema for AI response validation
├── tests/
│   ├── run-tests.js                # Integrated test suite runner
│   └── provider-router.test.js     # LLM router & provider fallback tests
├── ai.service.js                   # Primary AI response generator
├── index.js                        # Integration entrypoint for Node/Express Backend
└── README.md                       # Documentation
```

---

## 2. Provider Architecture & Fallback Flow

Gemini is configured as the **Primary** LLM provider. Groq is configured as the **Fallback** provider.

```text
                ┌───────────────┐
                │ User Message  │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │ RAG / Qdrant  │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │ Stage Prompt  │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │  LLM Router   │
                └───────┬───────┘
                        ↓
                 ┌─────────────┐
                 │   Gemini    │
                 │   Primary   │
                 └──────┬──────┘
                        │ failure (429 / 5xx / timeout)
                        ↓
                 ┌─────────────┐
                 │    Groq     │
                 │  Fallback   │
                 └──────┬──────┘
                        ↓
                ┌───────────────┐
                │ JSON Schema   │
                │ Validation    │
                └───────┬───────┘
                        ↓
                ┌───────────────┐
                │ passageIds    │
                │ only          │
                └───────┬───────┘
                        ↓
                PostgreSQL exact
                verified passage
                        ↓
                  Backend / UI
```

### Fallback Conditions
Fallback from Gemini to Groq triggers **ONLY** on temporary/provider-availability issues:
- HTTP 429 / Rate limits / Quota exhaustion
- Request timeouts (`LLM_TIMEOUT_MS`)
- HTTP 500 / 502 / 503 / 504 / Server errors
- Network socket / Connection failures

**DO NOT** fallback for:
- Invalid user input
- Prompt/programming errors
- Malformed internal requests
- Safety policy blocks
- Application / JSON Schema bugs

If both providers fail, the system returns a controlled `LLM_GENERATION_UNAVAILABLE` error.

---

## 3. Environment Variables

Update `.env` with the following configuration:

```env
# Primary LLM Provider (Gemini)
PRIMARY_LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash

# Fallback LLM Provider (Groq)
FALLBACK_LLM_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

# LLM Timeout & Retry Settings
LLM_TIMEOUT_MS=15000
LLM_MAX_RETRIES=1

# Independent Embedding Configuration
EMBEDDING_MODEL=text-embedding-3-small

# Qdrant Vector DB Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
QDRANT_COLLECTION=vivekananda_passages
QDRANT_SCORE_THRESHOLD=0.45

# Node Environment
NODE_ENV=development
```

---

## 4. Standardized Development Logging

Successful Gemini generation:
```text
[AI] Provider: Gemini
[AI] Generation successful
```

Gemini fallback to Groq:
```text
[AI] Provider: Gemini
[AI] Gemini failed: 429 RATE_LIMIT
[AI] Falling back to Groq
[AI] Provider: Groq
[AI] Generation successful
```

Both providers unavailable:
```text
[AI] Gemini failed
[AI] Groq fallback failed
[AI] Generation unavailable
```

*Note: API keys and user secrets are automatically sanitized from all error logs.*

---

## 5. Ingestion & Validation Commands

```bash
# 1. Validate corpus integrity
npm run corpus:validate

# 2. Generate text vector embeddings
npm run corpus:embed

# 3. Upload vectors to Qdrant Collection
npm run qdrant:upload

# 4. Run test suite
npm run test
```

---

## 6. Backend Integration Guide

The backend integration contract remains unchanged:

```js
const { generateMentorResponse, generateContext } = require('./ai');

// Example Express Route Handler
app.post('/api/chat', async (req, res) => {
  const { stage, userMessage, conversationContext, previousStage } = req.body;

  let retrievedPassages = [];
  if (stage === 'TEACHING') {
    const ragContext = await generateContext({
      userMessage,
      conversationContext,
      currentStage: stage
    });
    retrievedPassages = ragContext.passages;
  }

  const aiResponse = await generateMentorResponse({
    stage,
    userMessage,
    conversationContext,
    retrievedPassages,
    previousStage
  });

  // Retrieve exact verified text from PostgreSQL if passageIds present
  let verifiedQuotations = [];
  if (aiResponse.passageIds && aiResponse.passageIds.length > 0) {
    verifiedQuotations = await db.query(
      'SELECT id, exact_text, work, location_label FROM passages WHERE id = ANY($1)',
      [aiResponse.passageIds]
    );
  }

  res.json({
    ...aiResponse,
    quotations: verifiedQuotations.rows
  });
});
```

---

## 7. Response Schema Contract

Every AI response strictly conforms to `ai/schemas/ai-response.schema.json`:

```json
{
  "mode": "TEACHING",
  "nextStage": "REFLECT",
  "mentorText": "Consider this documented teaching regarding strength and self-belief.",
  "clarifyingQuestion": null,
  "theme": "SELF_BELIEF",
  "passageIds": ["VIV_001"],
  "interpretation": "This teaching suggests focusing on inherent strength rather than temporary setbacks.",
  "reflectionQuestion": null,
  "suggestedActions": []
}
```
