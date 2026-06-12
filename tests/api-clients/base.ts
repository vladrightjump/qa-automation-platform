// Shared building blocks for the subject-domain clients.
//
// Every domain client takes a `RequestContext` (Playwright APIRequestContext +
// the API base URL) and uses `parseJson` to validate responses through a Zod
// schema before they leave the client. Contract drift fails here, not at the
// assertion site.
import type { APIRequestContext, APIResponse } from '@playwright/test';
import { z } from '@qa/contracts';

type ZodSchema<T> = z.ZodType<T>;

export const API_BASE = process.env.API_BASE_URL ?? 'http://localhost:3001';

export interface RequestContext {
  request: APIRequestContext;
  baseUrl: string;
}

export function authHeader(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function expectOk(res: APIResponse, label: string): Promise<APIResponse> {
  if (!res.ok()) {
    throw new Error(`${label}: ${res.status()} ${await res.text()}`);
  }
  return res;
}

export async function parseJson<T>(
  res: APIResponse,
  schema: ZodSchema<T>,
  label: string,
): Promise<T> {
  await expectOk(res, label);
  return schema.parse(await res.json());
}
