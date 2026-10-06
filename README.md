# Viveka

> Contemplative AI Mentorship Platform rooted in Swami Vivekananda's teachings.

## Architecture

```text
React (Frontend)
      ↓
Express API (Backend)
      ↓
State Machine
      ↓
AI / RAG Orchestration
      ↓
PostgreSQL
      ↓
Structured Response
```

## Backend Services
- **REST APIs**: 7 Canonical Endpoints for session, reflection, passage verification, and action review.
- **State Machine**: Multi-stage inquiry journey (`UNDERSTAND` -> `CLARIFY` -> `ROOT_CONCERN` -> `TEACHING` -> `REFLECT` -> `ACTION` -> `REVIEW`).
- **Quote Verification**: Strict database validation preventing LLM quote hallucination.
- **Safety Gate**: Crisis detection and safe human support redirection.
