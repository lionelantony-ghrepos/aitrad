export const packageName = "@meridian/rag" as const;

export {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_OPENROUTER_EMBEDDINGS_URL,
  parseEmbeddingsResponse,
  requestOpenRouterEmbedding,
} from "./gateway";
export { hybridRank, newsEmbedText, type EmbeddedNews } from "./hybrid";
export {
  EMBED_MAX_ATTEMPTS,
  nextEmbedOutcome,
  runEmbedCycle,
  type EmbedCycleDeps,
  type EmbedCycleItem,
  type EmbedAttemptOutcome,
  type GatewayEmbedResult,
} from "./retry";
export {
  RAG_CANNED_FIXTURES,
  RAG_DISTRACTORS,
  mergeNewsCorpusWithRagFixtures,
  ragFixtureItems,
} from "./fixtures";
export { cosineSimilarity, formatVectorLiteral, hashEmbed, tokenize } from "./vector";
