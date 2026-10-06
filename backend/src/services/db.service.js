import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory fallback storage
class MemoryStore {
  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.passages = new Map();
    this.actions = new Map();
    this.reviews = new Map();
    this.initPassages();
  }

  initPassages() {
    try {
      const passagesPath = path.resolve(__dirname, '../data/passages.json');
      if (fs.existsSync(passagesPath)) {
        const raw = fs.readFileSync(passagesPath, 'utf8');
        const list = JSON.parse(raw);
        for (const p of list) {
          const passageId = p.passageId || p.passage_id || p.id;
          const passageObj = {
            passageId,
            exactText: p.exactText || p.text,
            title: p.title || (p.source ? p.source.title : 'Complete Works of Swami Vivekananda'),
            work: p.work || (p.source ? p.source.work : 'Complete Works'),
            section: p.section || (p.source ? p.source.section : null),
            author: p.author || (p.source ? p.source.author : 'Swami Vivekananda'),
            sourceUrl: p.sourceUrl || (p.source ? p.source.sourceUrl : null),
            topic: p.topic || (p.topics ? p.topics[0] : null),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          if (passageId) this.passages.set(passageId, passageObj);
          if (p.id) this.passages.set(p.id, passageObj);
          if (p.passageId) this.passages.set(p.passageId, passageObj);
          if (p.passage_id) this.passages.set(p.passage_id, passageObj);
        }
      }
    } catch (err) {
      console.warn('MemoryStore: could not load passages.json:', err.message);
    }
  }

  async createSession(data) {
    const session = {
      id: data.id,
      topic: data.topic || null,
      currentStage: data.currentStage || 'UNDERSTAND',
      completedStages: data.completedStages || [],
      contextData: data.contextData || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getSessionById(id) {
    const session = this.sessions.get(id);
    if (!session) return null;

    const messages = Array.from(this.messages.values())
      .filter((m) => m.sessionId === id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const actions = Array.from(this.actions.values())
      .filter((a) => a.sessionId === id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    return {
      ...session,
      messages,
      actions,
    };
  }

  async updateSession(id, data) {
    const session = this.sessions.get(id);
    if (!session) return null;
    const updated = {
      ...session,
      ...data,
      updatedAt: new Date(),
    };
    this.sessions.set(id, updated);
    return updated;
  }

  async deleteSession(id) {
    const exists = this.sessions.has(id);
    if (exists) {
      this.sessions.delete(id);
      for (const [mId, m] of this.messages.entries()) {
        if (m.sessionId === id) this.messages.delete(mId);
      }
      for (const [aId, a] of this.actions.entries()) {
        if (a.sessionId === id) {
          this.actions.delete(aId);
          for (const [rId, r] of this.reviews.entries()) {
            if (r.actionId === aId) this.reviews.delete(rId);
          }
        }
      }
    }
    return exists;
  }

  async createMessage(data) {
    const message = {
      id: data.id,
      sessionId: data.sessionId,
      sender: data.sender,
      text: data.text,
      stage: data.stage,
      mode: data.mode || null,
      metadata: data.metadata || null,
      createdAt: new Date(),
    };
    this.messages.set(message.id, message);
    return message;
  }

  async getMessagesBySessionId(sessionId) {
    return Array.from(this.messages.values())
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }

  async getPassageById(passageId) {
    return this.passages.get(passageId) || null;
  }

  async getAllPassages() {
    return Array.from(this.passages.values());
  }

  async getPassagesByTopic(topic) {
    if (!topic) return this.getAllPassages();
    return Array.from(this.passages.values()).filter(
      (p) => p.topic && p.topic.toUpperCase() === topic.toUpperCase()
    );
  }

  async createAction(data) {
    const action = {
      id: data.id,
      sessionId: data.sessionId,
      actionText: data.actionText,
      status: data.status || 'PENDING',
      reviewDue: data.reviewDue ? new Date(data.reviewDue) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.actions.set(action.id, action);
    return action;
  }

  async getActionById(id) {
    return this.actions.get(id) || null;
  }

  async updateAction(id, data) {
    const action = this.actions.get(id);
    if (!action) return null;
    const updated = {
      ...action,
      ...data,
      updatedAt: new Date(),
    };
    this.actions.set(id, updated);
    return updated;
  }

  async createActionReview(data) {
    const review = {
      id: data.id,
      actionId: data.actionId,
      status: data.status,
      note: data.note || null,
      helpfulnessRating: data.helpfulnessRating ?? null,
      nextStepText: data.nextStepText || null,
      createdAt: new Date(),
    };
    this.reviews.set(review.id, review);
    return review;
  }
}

class DatabaseService {
  constructor() {
    this.memoryStore = new MemoryStore();
    this.prisma = null;
    this.isConnectedToPrisma = false;
    this.initPrisma();
  }

  async initPrisma() {
    if (process.env.DATABASE_URL) {
      try {
        const client = new PrismaClient();
        await client.$connect();
        this.prisma = client;
        this.isConnectedToPrisma = true;
        console.log('DatabaseService: Connected to PostgreSQL via Prisma');
      } catch (err) {
        console.warn('DatabaseService: Prisma connection unavailable, using resilient store:', err.message);
        this.isConnectedToPrisma = false;
      }
    }
  }

  async createSession(data) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.session.create({
          data: {
            id: data.id,
            topic: data.topic,
            currentStage: data.currentStage,
            completedStages: data.completedStages || [],
            contextData: data.contextData || {},
          },
        });
      } catch (err) {
        console.warn('Prisma createSession failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.createSession(data);
  }

  async getSessionById(id) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.session.findUnique({
          where: { id },
          include: {
            messages: { orderBy: { createdAt: 'asc' } },
            actions: { orderBy: { createdAt: 'asc' } },
          },
        });
      } catch (err) {
        console.warn('Prisma getSessionById failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.getSessionById(id);
  }

  async updateSession(id, data) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.session.update({
          where: { id },
          data,
        });
      } catch (err) {
        console.warn('Prisma updateSession failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.updateSession(id, data);
  }

  async deleteSession(id) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        await this.prisma.session.delete({ where: { id } });
        return true;
      } catch (err) {
        if (err.code === 'P2025') return false; // Not found
        console.warn('Prisma deleteSession failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.deleteSession(id);
  }

  async createMessage(data) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.message.create({
          data: {
            id: data.id,
            sessionId: data.sessionId,
            sender: data.sender,
            text: data.text,
            stage: data.stage,
            mode: data.mode,
            metadata: data.metadata,
          },
        });
      } catch (err) {
        console.warn('Prisma createMessage failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.createMessage(data);
  }

  async getMessagesBySessionId(sessionId) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.message.findMany({
          where: { sessionId },
          orderBy: { createdAt: 'asc' },
        });
      } catch (err) {
        console.warn('Prisma getMessagesBySessionId failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.getMessagesBySessionId(sessionId);
  }

  async getPassageById(passageId) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        const passage = await this.prisma.passage.findUnique({
          where: { passageId },
        });
        if (passage) return passage;
      } catch (err) {
        console.warn('Prisma getPassageById failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.getPassageById(passageId);
  }

  async getAllPassages() {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        const passages = await this.prisma.passage.findMany();
        if (passages && passages.length > 0) return passages;
      } catch (err) {
        console.warn('Prisma getAllPassages failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.getAllPassages();
  }

  async getPassagesByTopic(topic) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        const passages = await this.prisma.passage.findMany({
          where: {
            topic: {
              equals: topic,
              mode: 'insensitive',
            },
          },
        });
        if (passages && passages.length > 0) return passages;
      } catch (err) {
        console.warn('Prisma getPassagesByTopic failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.getPassagesByTopic(topic);
  }

  async createAction(data) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.action.create({
          data: {
            id: data.id,
            sessionId: data.sessionId,
            actionText: data.actionText,
            status: data.status || 'PENDING',
            reviewDue: data.reviewDue ? new Date(data.reviewDue) : null,
          },
        });
      } catch (err) {
        console.warn('Prisma createAction failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.createAction(data);
  }

  async getActionById(id) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.action.findUnique({
          where: { id },
        });
      } catch (err) {
        console.warn('Prisma getActionById failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.getActionById(id);
  }

  async updateAction(id, data) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.action.update({
          where: { id },
          data,
        });
      } catch (err) {
        console.warn('Prisma updateAction failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.updateAction(id, data);
  }

  async createActionReview(data) {
    if (this.isConnectedToPrisma && this.prisma) {
      try {
        return await this.prisma.actionReview.create({
          data: {
            id: data.id,
            actionId: data.actionId,
            status: data.status,
            note: data.note,
            helpfulnessRating: data.helpfulnessRating,
            nextStepText: data.nextStepText,
          },
        });
      } catch (err) {
        console.warn('Prisma createActionReview failed, falling back to memory store:', err.message);
      }
    }
    return this.memoryStore.createActionReview(data);
  }
}

export const dbService = new DatabaseService();
