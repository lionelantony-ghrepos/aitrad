import { z } from "zod";
import {
  InsForgeApiError,
  insforgeErrorBodySchema,
  recordsUrl,
  type QueryValue,
  type RecordTable,
} from "./rest";

export type RecordsClientConfig = {
  baseUrl: string;
  getAccessToken: () => string | Promise<string>;
  fetchImpl?: typeof fetch;
};

export type ListOptions = {
  query?: Record<string, QueryValue | undefined>;
};

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  return JSON.parse(text) as unknown;
}

export function createRecordsClient(config: RecordsClientConfig) {
  const runFetch = config.fetchImpl ?? fetch;

  async function request(input: {
    method: string;
    table: RecordTable;
    query?: Record<string, QueryValue | undefined>;
    body?: unknown;
    preferRepresentation?: boolean;
  }): Promise<unknown> {
    const token = await config.getAccessToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    if (input.preferRepresentation) {
      headers.Prefer = "return=representation";
    }

    const response = await runFetch(
      recordsUrl({
        baseUrl: config.baseUrl,
        table: input.table,
        query: input.query,
      }),
      {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
      },
    );

    const payload = await parseJson(response);
    if (!response.ok) {
      const parsed = insforgeErrorBodySchema.safeParse(payload);
      throw new InsForgeApiError({
        status: response.status,
        message: parsed.success
          ? (parsed.data.message ?? response.statusText)
          : response.statusText,
        code: parsed.success ? parsed.data.error : undefined,
      });
    }
    return payload;
  }

  return {
    async list<T>(
      table: RecordTable,
      schema: z.ZodType<T>,
      options: ListOptions = {},
    ): Promise<T[]> {
      const payload = await request({
        method: "GET",
        table,
        query: options.query,
      });
      return z.array(schema).parse(payload);
    },

    async insert<T>(table: RecordTable, schema: z.ZodType<T>, rows: unknown[]): Promise<T[]> {
      const payload = await request({
        method: "POST",
        table,
        body: rows,
        preferRepresentation: true,
      });
      return z.array(schema).parse(payload);
    },

    async update<T>(
      table: RecordTable,
      schema: z.ZodType<T>,
      query: Record<string, QueryValue | undefined>,
      patch: unknown,
    ): Promise<T[]> {
      const payload = await request({
        method: "PATCH",
        table,
        query,
        body: patch,
        preferRepresentation: true,
      });
      return z.array(schema).parse(payload);
    },

    async remove(table: RecordTable, query: Record<string, QueryValue | undefined>): Promise<void> {
      await request({
        method: "DELETE",
        table,
        query,
      });
    },
  };
}

export type RecordsClient = ReturnType<typeof createRecordsClient>;
