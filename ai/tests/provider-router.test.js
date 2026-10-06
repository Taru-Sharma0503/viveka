const { LLMRouter } = require('../providers/llm-router');
const { validateResponse } = require('../ai.service');

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    throw new Error(`[FAIL] ${message}`);
  }
}

async function runRouterTests() {
  console.log('\n--- LLM ROUTER & PROVIDER FALLBACK TEST SUITE ---');

  const validResponse = {
    mode: 'CLARIFY',
    nextStage: 'ROOT_CONCERN',
    mentorText: 'Valid response',
    clarifyingQuestion: { text: 'Question?', options: ['A', 'B'], allowFreeText: true },
    theme: 'SELF_BELIEF',
    passageIds: [],
    interpretation: null,
    reflectionQuestion: null,
    suggestedActions: []
  };

  // Test 1: Gemini succeeds -> Groq is not called
  {
    console.log('Router Test 1: Gemini succeeds -> Groq is not called');
    let groqCalled = false;
    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => validResponse
      },
      groqProvider: {
        generate: async () => {
          groqCalled = true;
          return validResponse;
        }
      }
    });

    const res = await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    assert(res.mode === 'CLARIFY', 'Response returned from Gemini');
    assert(groqCalled === false, 'Groq must NOT be called when Gemini succeeds');
  }

  // Test 2: Gemini returns 429 -> Groq is called
  {
    console.log('Router Test 2: Gemini returns 429 -> Groq is called');
    let groqCalled = false;
    const rateLimitErr = new Error('429 Rate limit exceeded');
    rateLimitErr.status = 429;
    rateLimitErr.isFallbackEligible = true;

    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => { throw rateLimitErr; }
      },
      groqProvider: {
        generate: async () => {
          groqCalled = true;
          return validResponse;
        }
      }
    });

    const res = await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    assert(res.mode === 'CLARIFY', 'Fallback response returned');
    assert(groqCalled === true, 'Groq MUST be called when Gemini encounters 429 rate limit');
  }

  // Test 3: Gemini times out -> Groq is called
  {
    console.log('Router Test 3: Gemini times out -> Groq is called');
    let groqCalled = false;
    const timeoutErr = new Error('Gemini request timed out');
    timeoutErr.status = 504;
    timeoutErr.code = 'ETIMEDOUT';
    timeoutErr.isFallbackEligible = true;

    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => { throw timeoutErr; }
      },
      groqProvider: {
        generate: async () => {
          groqCalled = true;
          return validResponse;
        }
      }
    });

    const res = await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    assert(res.mode === 'CLARIFY', 'Fallback response returned on timeout');
    assert(groqCalled === true, 'Groq MUST be called when Gemini request times out');
  }

  // Test 4: Gemini returns 5xx -> Groq is called
  {
    console.log('Router Test 4: Gemini returns 5xx -> Groq is called');
    let groqCalled = false;
    const serverErr = new Error('500 Internal Server Error');
    serverErr.status = 500;
    serverErr.isFallbackEligible = true;

    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => { throw serverErr; }
      },
      groqProvider: {
        generate: async () => {
          groqCalled = true;
          return validResponse;
        }
      }
    });

    const res = await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    assert(res.mode === 'CLARIFY', 'Fallback response returned on 5xx error');
    assert(groqCalled === true, 'Groq MUST be called when Gemini returns 5xx error');
  }

  // Test 5: Gemini fails and Groq succeeds -> valid canonical response returned
  {
    console.log('Router Test 5: Gemini fails and Groq succeeds -> valid canonical response');
    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => {
          const err = new Error('503 Service Unavailable');
          err.status = 503;
          throw err;
        }
      },
      groqProvider: {
        generate: async () => validResponse
      }
    });

    const res = await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    assert(validateResponse(res) === true, 'Groq fallback response must conform to JSON schema');
  }

  // Test 6: Gemini and Groq both fail -> controlled error returned
  {
    console.log('Router Test 6: Both providers fail -> controlled error returned');
    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => {
          const err = new Error('500 Server Error');
          err.status = 500;
          throw err;
        }
      },
      groqProvider: {
        generate: async () => {
          const err = new Error('500 Groq Server Error');
          err.status = 500;
          throw err;
        }
      }
    });

    let thrown = null;
    try {
      await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    } catch (err) {
      thrown = err;
    }
    assert(thrown !== null, 'Should throw when both providers fail');
    assert(thrown.code === 'LLM_GENERATION_UNAVAILABLE', 'Error code must be LLM_GENERATION_UNAVAILABLE');
  }

  // Test 7: Invalid application/schema error does not trigger fallback
  {
    console.log('Router Test 7: Invalid schema/application bug does NOT trigger fallback');
    let groqCalled = false;
    const appBugErr = new Error('Application bug / safety violation');
    appBugErr.isFallbackEligible = false;

    const router = new LLMRouter({
      geminiProvider: {
        generate: async () => { throw appBugErr; }
      },
      groqProvider: {
        generate: async () => {
          groqCalled = true;
          return validResponse;
        }
      }
    });

    let thrown = null;
    try {
      await router.generate({ systemPrompt: 'sys', userPrompt: 'usr' });
    } catch (err) {
      thrown = err;
    }
    assert(thrown === appBugErr, 'Application bug error re-thrown directly');
    assert(groqCalled === false, 'Groq MUST NOT be called for application/schema bugs');
  }

  // Test 8: API keys are never exposed in logs
  {
    console.log('Router Test 8: API keys sanitization in logs');
    const router = new LLMRouter();
    const secretKeyErr = new Error('Failed with key=AIzaSyA_secret_key_12345 and gsk_groq_secret_6789');
    const sanitized = router.sanitizeErrorMessage(secretKeyErr);
    assert(!sanitized.includes('AIzaSyA_secret_key_12345'), 'Sanitized log must not contain raw Gemini API key');
    assert(!sanitized.includes('gsk_groq_secret_6789'), 'Sanitized log must not contain raw Groq API key');
  }

  console.log('--- ALL ROUTER TESTS PASSED ---\n');
}

module.exports = { runRouterTests };
