# ADR-0003 — Embeddings via InsForge Model Gateway (OpenRouter)

Date: 2026-09-09
Status: accepted

Use this **only** when a durable design choice is not already stated in [doc 02](../../02-Technical-Architecture-Blueprint.md), or when implementation must refine/deviate from that blueprint. Do not duplicate the architecture doc.

## Context

Doc 02 specifies the InsForge AI Gateway for embeddings/RAG. Current InsForge docs mark `POST /api/ai/embeddings` and `insforge.ai.embeddings.create()` as deprecated compatibility proxies. New integrations must call OpenRouter with the project-provisioned key (`OPENROUTER_API_KEY`) and store vectors in InsForge Postgres (pgvector).

## Decision

PBI-023 `embed-worker` and `search-news` call `https://openrouter.ai/api/v1/embeddings` (override `OPENROUTER_EMBEDDINGS_URL`) with `OPENROUTER_EMBEDDING_MODEL` defaulting to `openai/text-embedding-3-small` to match `news_embeddings.embedding vector(1536)`. Keys stay server-side. The deprecated InsForge embeddings proxy is not used.

## Consequences

Local Docker seed without a gateway key can set `MERIDIAN_EMBEDDING_MODE=hash` for a deterministic 1536-d vector (tests and offline backfill only). Production and copilot RAG must use the gateway model so query and document spaces match. Related: [PBI-023 as-built](../as-built/PBI-023.md).

## Alternatives considered

- Keep calling `/api/ai/embeddings`: rejected; InsForge marks it deprecated for new code.
- Client-side embeddings: rejected; keys must not enter the browser bundle.
