import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { LOCAL_MIGRATION_IDS } from "./migrations";

const here = fileURLToPath(new URL(".", import.meta.url));
const migrationSql = readFileSync(
  path.join(here, "../../../../insforge/migrations/0015_news-embeddings.sql"),
  "utf8",
);
const cliTwinSql = readFileSync(
  path.join(here, "../../../../migrations/20260909220000_news-embeddings.sql"),
  "utf8",
);

describe("PBI-023 migration 0015 news embeddings", () => {
  it("lists 0015 after 0014", () => {
    expect(LOCAL_MIGRATION_IDS[LOCAL_MIGRATION_IDS.length - 1]).toBe("0015");
    expect(LOCAL_MIGRATION_IDS).toContain("0014");
  });

  it("creates pgvector news_embeddings, ivfflat, dead-letter, and hybrid search", () => {
    expect(cliTwinSql).toBe(migrationSql);
    expect(migrationSql).toContain("CREATE EXTENSION IF NOT EXISTS vector");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.news_embeddings");
    expect(migrationSql).toContain("embedding vector(1536) NOT NULL");
    expect(migrationSql).toContain("USING ivfflat (embedding vector_cosine_ops)");
    expect(migrationSql).toContain("CREATE TABLE IF NOT EXISTS public.news_embed_dead_letters");
    expect(migrationSql).toContain("dead BOOLEAN NOT NULL DEFAULT false");
    expect(migrationSql).toContain(
      "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.news_embeddings TO project_admin",
    );
    expect(migrationSql).not.toContain(
      "GRANT SELECT ON TABLE public.news_embeddings TO anon, authenticated",
    );
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.search_news_hybrid");
    expect(migrationSql).toContain("CREATE OR REPLACE FUNCTION public.list_pending_news_embeds");
    expect(migrationSql).toContain("FROM public.news_items n");
    expect(migrationSql).not.toContain("CREATE TABLE IF NOT EXISTS public.docs_embeddings");
  });
});
