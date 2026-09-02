import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const timestamptzSchema = z.string().min(1);

/** Postgres NUMERIC values often arrive as strings over REST. */
export const numericSchema = z.coerce.number();
