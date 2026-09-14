import { z } from "zod";
import { copilotCitationSchema } from "./copilot";
import { timestamptzSchema, uuidSchema } from "./primitives";

export const briefKindSchema = z.enum(["morning", "instrument", "portfolio"]);

export type BriefKind = z.infer<typeof briefKindSchema>;

export const briefSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  kind: briefKindSchema,
  subject: z.string().min(1),
  content_md: z.string(),
  data: z.record(z.unknown()),
  pdf_key: z.string().nullable(),
  pdf_url: z.string().nullable(),
  created_at: timestamptzSchema,
});

export type Brief = z.infer<typeof briefSchema>;

export const briefGenerateRequestSchema = z
  .object({
    op: z.literal("generate").optional(),
    kind: briefKindSchema,
    subject: z.string().trim().min(1).max(32).optional(),
  })
  .strict();

export type BriefGenerateRequest = z.infer<typeof briefGenerateRequestSchema>;

export const briefListRequestSchema = z
  .object({
    op: z.literal("list").optional(),
    kind: briefKindSchema.optional(),
  })
  .strict();

export type BriefListRequest = z.infer<typeof briefListRequestSchema>;

export const briefExportRequestSchema = z
  .object({
    op: z.literal("export"),
    brief_id: uuidSchema,
  })
  .strict();

export type BriefExportRequest = z.infer<typeof briefExportRequestSchema>;

export const briefCronRequestSchema = z
  .object({
    op: z.literal("cron"),
    force: z.boolean().optional(),
  })
  .strict();

export type BriefCronRequest = z.infer<typeof briefCronRequestSchema>;

export const briefServiceRequestSchema = z.discriminatedUnion("op", [
  briefGenerateRequestSchema.extend({ op: z.literal("generate") }),
  briefListRequestSchema.extend({ op: z.literal("list") }),
  briefExportRequestSchema,
  briefCronRequestSchema,
]);

export type BriefServiceRequest = z.infer<typeof briefServiceRequestSchema>;

export const briefGenerateResponseSchema = z.object({
  brief: briefSchema,
  citations: z.array(copilotCitationSchema),
});

export type BriefGenerateResponse = z.infer<typeof briefGenerateResponseSchema>;

export const briefListResponseSchema = z.object({
  briefs: z.array(briefSchema),
});

export type BriefListResponse = z.infer<typeof briefListResponseSchema>;

export const briefExportResponseSchema = z.object({
  brief: briefSchema,
  download_url: z.string().min(1),
});

export type BriefExportResponse = z.infer<typeof briefExportResponseSchema>;

export const briefCronResponseSchema = z.object({
  generated: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
});

export type BriefCronResponse = z.infer<typeof briefCronResponseSchema>;

export const BRIEFS_BUCKET = "briefs";

export const portfolioAnalysisFactsSchema = z.object({
  max_position_pct: z.number().finite(),
  max_sector_pct: z.number().finite(),
  portfolio_beta: z.number().finite(),
  cash_pct: z.number().finite(),
  positions_count: z.number().int().nonnegative(),
  equity: z.number().finite(),
});

export type PortfolioAnalysisFacts = z.infer<typeof portfolioAnalysisFactsSchema>;
