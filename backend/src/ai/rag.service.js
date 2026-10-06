import { dbService } from '../services/db.service.js';

export class RagService {
  /**
   * Retrieves relevant passages for a given reflection context
   * @param {Object} params
   * @param {string} params.query
   * @param {string} [params.topic]
   * @param {number} [params.limit=1]
   */
  static async retrievePassages({ query, topic, limit = 1 }) {
    // 1. Try topic-specific passages
    let candidates = [];
    if (topic) {
      candidates = await dbService.getPassagesByTopic(topic);
    }

    if (!candidates || candidates.length === 0) {
      candidates = await dbService.getAllPassages();
    }

    if (!candidates || candidates.length === 0) {
      return [];
    }

    // 2. Score candidates based on query term overlap & topic relevance
    const queryTokens = (query || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = candidates.map((p) => {
      let score = 0;
      const combinedText = `${p.topic || ''} ${p.exactText} ${p.section || ''}`.toLowerCase();

      // Topic boost
      if (topic && p.topic && p.topic.toUpperCase() === topic.toUpperCase()) {
        score += 5;
      }

      // Keyword matches
      for (const token of queryTokens) {
        if (combinedText.includes(token)) {
          score += 2;
        }
      }

      return { passage: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.passage);
  }

  /**
   * Selects best passage ID for the current context
   */
  static async selectBestPassageId({ query, topic }) {
    const results = await this.retrievePassages({ query, topic, limit: 1 });
    if (results.length > 0) {
      return results[0].passageId;
    }
    // Default fallback passage
    return 'passage_023';
  }
}
