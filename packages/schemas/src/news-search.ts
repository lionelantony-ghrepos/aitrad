import { z } from "zod";
import { newsItemSchema } from "./news";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

/** Engineering result cap (DoS guard), not a decision-table threshold. */
export const NEWS_SEARCH_LIMIT = 50;

/** pgvector column width for openai/text-embedding-3-small (Model Gateway). */
export const NEWS_EMBEDDING_DIM = 1536;

export const newsSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(500),
  symbols: z.array(z.string().min(1)).max(32).optional(),
  since: timestamptzSchema.optional(),
  limit: z.number().int().min(1).max(NEWS_SEARCH_LIMIT).optional(),
});

export type NewsSearchRequest = z.infer<typeof newsSearchRequestSchema>;

export const newsSearchHitSchema = newsItemSchema.extend({
  score: numericSchema,
});

export type NewsSearchHit = z.infer<typeof newsSearchHitSchema>;

export const newsSearchResponseSchema = z.object({
  items: z.array(newsSearchHitSchema),
});

export type NewsSearchResponse = z.infer<typeof newsSearchResponseSchema>;

export const embedWorkerRequestSchema = z.object({
  op: z.enum(["cycle", "backfill"]).default("cycle"),
  news_ids: z.array(uuidSchema).max(200).optional(),
});

export type EmbedWorkerRequest = z.infer<typeof embedWorkerRequestSchema>;

export const embedWorkerResponseSchema = z.object({
  scanned: z.number().int().nonnegative(),
  embedded: z.number().int().nonnegative(),
  retried: z.number().int().nonnegative(),
  dead_lettered: z.number().int().nonnegative(),
});

export type EmbedWorkerResponse = z.infer<typeof embedWorkerResponseSchema>;

export const newsEmbedDeadLetterSchema = z.object({
  news_id: uuidSchema,
  attempts: z.number().int().nonnegative(),
  last_error: z.string().min(1),
  last_http_status: z.number().int().nullable(),
  dead: z.boolean(),
  updated_at: timestamptzSchema,
});

export type NewsEmbedDeadLetter = z.infer<typeof newsEmbedDeadLetterSchema>;
