import { z } from "zod";
import { numericSchema, timestamptzSchema, uuidSchema } from "./primitives";

export const newsEventTypeSchema = z.enum([
  "earnings",
  "analyst",
  "macro",
  "product",
  "regulatory",
  "mna",
]);

export type NewsEventType = z.infer<typeof newsEventTypeSchema>;

export const newsHeadlineTemplateSchema = z.object({
  headline: z.string().min(1),
  sentiment: z.tuple([z.number(), z.number()]),
});

export const newsTemplatesFileSchema = z
  .object({
    earnings: z.array(newsHeadlineTemplateSchema).min(1),
    analyst: z.array(newsHeadlineTemplateSchema).min(1),
    macro: z.array(newsHeadlineTemplateSchema).min(1),
    product: z.array(newsHeadlineTemplateSchema).min(1),
    regulatory: z.array(newsHeadlineTemplateSchema).min(1),
    mna: z.array(newsHeadlineTemplateSchema).min(1),
    fills: z.record(z.array(z.string().min(1))),
  })
  .strict();

export type NewsTemplatesFile = z.infer<typeof newsTemplatesFileSchema>;

export const newsItemSchema = z.object({
  id: uuidSchema,
  ts: timestamptzSchema,
  headline: z.string().min(1),
  body: z.string().min(1),
  source: z.string().min(1),
  symbols: z.array(z.string().min(1)),
  sector: z.string().nullable(),
  sentiment: numericSchema.refine((value) => value >= -1 && value <= 1, "sentiment"),
  event_type: newsEventTypeSchema,
});

export type NewsItem = z.infer<typeof newsItemSchema>;

export const newsItemInsertSchema = newsItemSchema.omit({ id: true }).extend({
  id: uuidSchema.optional(),
});

export type NewsItemInsert = z.infer<typeof newsItemInsertSchema>;

export const newsRealtimeBatchSchema = z.object({
  ts: timestamptzSchema,
  items: z.array(newsItemSchema).min(1),
});

export type NewsRealtimeBatch = z.infer<typeof newsRealtimeBatchSchema>;
