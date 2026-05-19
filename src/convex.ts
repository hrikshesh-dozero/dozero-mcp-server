/**
 * Convex HTTP client for the DoZero MCP server.
 *
 * All calls go through /api/mcp/* routes on the DoZero Convex backend.
 * Authentication uses the WorkOS Bearer token obtained via OAuth 2.0.
 * The token is injected per-session by the SSE handler in index.ts.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { ConvexMutationResponse } from "./types.js";

export const authStorage = new AsyncLocalStorage<{ token: string }>();

function getConfig() {
  const convexUrl = process.env.DOZERO_CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "DOZERO_CONVEX_URL is not set. Set it to your Convex deployment URL (e.g. https://happy-animal-123.convex.cloud)"
    );
  }

  // Retrieve token from AsyncLocalStorage context, fallback to process.env.DOZERO_AUTH_TOKEN
  const token = authStorage.getStore()?.token || process.env.DOZERO_AUTH_TOKEN;

  return { convexUrl: convexUrl.replace(/\/$/, ""), token };
}

function headers(): Record<string, string> {
  const { token } = getConfig();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

/**
 * Call a Convex public query via the MCP gateway.
 * Route: POST /api/mcp/query
 */
export async function convexQuery<T = unknown>(
  path: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const { convexUrl } = getConfig();

  const response = await fetch(`${convexUrl}/api/mcp/query`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ path, args }),
  });

  if (response.status === 401) {
    throw new Error(
      "Authentication failed (401). Your session may have expired. " +
        "Please disconnect and reconnect DoZero in Claude Web to re-authorize."
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Convex query ${path} failed (${response.status}): ${text}`);
  }

  const result = (await response.json()) as ConvexMutationResponse<T>;

  if (result.status === "error") {
    throw new Error(`Convex query ${path} error: ${result.errorMessage}`);
  }

  return result.value as T;
}

/**
 * Call a Convex public mutation via the MCP gateway.
 * Route: POST /api/mcp/mutation
 */
export async function convexMutation<T = unknown>(
  path: string,
  args: Record<string, unknown> = {}
): Promise<T> {
  const { convexUrl } = getConfig();

  const response = await fetch(`${convexUrl}/api/mcp/mutation`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ path, args }),
  });

  if (response.status === 401) {
    throw new Error(
      "Authentication failed (401). Your session may have expired. " +
        "Please disconnect and reconnect DoZero in Claude Web to re-authorize."
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Convex mutation ${path} failed (${response.status}): ${text}`
    );
  }

  const result = (await response.json()) as ConvexMutationResponse<T>;

  if (result.status === "error") {
    throw new Error(`Convex mutation ${path} error: ${result.errorMessage}`);
  }

  return result.value as T;
}

/**
 * Call a custom DoZero HTTP endpoint (JSON response) via the MCP gateway.
 * Route: POST /api/mcp/http
 *
 * The gateway forwards { endpoint, body } to the actual endpoint internally,
 * injecting the resolved ownerId.
 */
export async function convexHttpPost<T = unknown>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const { convexUrl } = getConfig();

  const response = await fetch(`${convexUrl}/api/mcp/http`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ endpoint, body }),
  });

  if (response.status === 401) {
    throw new Error(
      "Authentication failed (401). Your API key may be invalid or revoked. " +
        "Generate a new one at: https://dozero.dev → Settings → API Keys"
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HTTP POST ${endpoint} failed (${response.status}): ${text}`
    );
  }

  return (await response.json()) as T;
}

/**
 * Call a custom DoZero HTTP endpoint (SSE response) via the MCP gateway.
 * Route: POST /api/mcp/http-sse
 *
 * Returns the full SSE text body — caller is responsible for parsing
 * the `event: done` frame.
 */
export async function convexHttpPostSSE(
  endpoint: string,
  body: Record<string, unknown>
): Promise<string> {
  const { convexUrl } = getConfig();

  const response = await fetch(`${convexUrl}/api/mcp/http-sse`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ endpoint, body }),
  });

  if (response.status === 401) {
    throw new Error(
      "Authentication failed (401). Your API key may be invalid or revoked. " +
        "Generate a new one at: https://dozero.dev → Settings → API Keys"
    );
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HTTP POST SSE ${endpoint} failed (${response.status}): ${text}`
    );
  }

  return await response.text();
}
