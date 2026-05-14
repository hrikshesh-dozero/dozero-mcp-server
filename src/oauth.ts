/**
 * OAuth 2.0 Authorization Code flow for the DoZero MCP server.
 *
 * How it works:
 * 1. Claude Web hits GET /authorize  → we redirect to WorkOS AuthKit login page
 * 2. User logs in to DoZero (WorkOS) normally
 * 3. WorkOS redirects back to GET /callback?code=... on this server
 * 4. We exchange the code for a WorkOS access token
 * 5. We redirect back to Claude Web with the token
 * 6. Claude Web sends that token as Authorization: Bearer <token> on /sse
 * 7. We forward it as the Convex auth header — Convex validates it against WorkOS JWKS
 */

import type { Request, Response } from "express";
import crypto from "crypto";

// ── Config ──────────────────────────────────────────────────────────────────

function getOAuthConfig() {
  const clientId = process.env.WORKOS_CLIENT_ID;
  const clientSecret = process.env.WORKOS_CLIENT_SECRET;
  const redirectUri = process.env.MCP_OAUTH_REDIRECT_URI;
  const appUrl = process.env.MCP_APP_URL ?? "http://localhost:3000";

  if (!clientId) throw new Error("WORKOS_CLIENT_ID is not set");
  if (!clientSecret) throw new Error("WORKOS_CLIENT_SECRET is not set");
  if (!redirectUri)
    throw new Error(
      "MCP_OAUTH_REDIRECT_URI is not set (e.g. http://localhost:3000/callback)"
    );

  return { clientId, clientSecret, redirectUri, appUrl };
}

// Temporary in-memory state store (PKCE + redirect_uri per session).
// For production, swap with Redis or a database table.
const pendingStates = new Map<string, { codeVerifier: string; redirectUri: string }>();

// ── PKCE Helpers ─────────────────────────────────────────────────────────────

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ── Route Handlers ────────────────────────────────────────────────────────────

/**
 * GET /authorize
 *
 * Claude Web hits this endpoint first. We:
 *   1. Generate a PKCE code verifier + challenge.
 *   2. Generate a random state parameter.
 *   3. Redirect to WorkOS AuthKit authorization URL.
 *
 * Query params forwarded by Claude Web:
 *   - redirect_uri  (where to send the token after login)
 *   - state         (Claude Web's own CSRF token — we wrap it in ours)
 */
export async function handleAuthorize(req: Request, res: Response) {
  const { clientId, redirectUri } = getOAuthConfig();

  const clientRedirectUri = req.query.redirect_uri as string | undefined;
  const clientState = req.query.state as string | undefined;

  if (!clientRedirectUri) {
    res.status(400).send("Missing redirect_uri parameter");
    return;
  }

  // PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString("hex");

  // Store state → code verifier + where to redirect after
  pendingStates.set(state, {
    codeVerifier,
    redirectUri: clientRedirectUri + (clientState ? `&state=${encodeURIComponent(clientState)}` : ""),
  });

  // Auto-expire after 10 minutes
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

  // Build WorkOS AuthKit authorization URL
  const authUrl = new URL("https://api.workos.com/user_management/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("provider", "authkit"); // WorkOS AuthKit

  res.redirect(authUrl.toString());
}

/**
 * GET /callback
 *
 * WorkOS redirects here after the user successfully logs in.
 * We exchange the auth code for an access token and forward it back to Claude Web.
 */
export async function handleCallback(req: Request, res: Response) {
  const { clientId, clientSecret, redirectUri } = getOAuthConfig();

  const code = req.query.code as string | undefined;
  const state = req.query.state as string | undefined;
  const error = req.query.error as string | undefined;

  if (error) {
    res.status(400).send(`Authorization error: ${req.query.error_description ?? error}`);
    return;
  }

  if (!code || !state) {
    res.status(400).send("Missing code or state parameter");
    return;
  }

  const pending = pendingStates.get(state);
  if (!pending) {
    res.status(400).send("Invalid or expired state. Please try connecting again.");
    return;
  }

  pendingStates.delete(state);

  // Exchange code for access token with WorkOS
  const tokenResponse = await fetch("https://api.workos.com/user_management/authenticate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: pending.codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    console.error("WorkOS token exchange failed:", text);
    res.status(500).send("Failed to exchange authorization code for token. Please try again.");
    return;
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };

  // Redirect back to Claude Web with the access token
  const finalRedirectUrl = new URL(pending.redirectUri);
  finalRedirectUrl.searchParams.set("access_token", tokenData.access_token);
  finalRedirectUrl.searchParams.set("token_type", tokenData.token_type ?? "Bearer");
  if (tokenData.expires_in) {
    finalRedirectUrl.searchParams.set("expires_in", String(tokenData.expires_in));
  }

  res.redirect(finalRedirectUrl.toString());
}

/**
 * GET /oauth/metadata
 *
 * OAuth 2.0 server metadata — Claude Web fetches this to discover the
 * authorization endpoint automatically (RFC 8414).
 */
export function handleOAuthMetadata(req: Request, res: Response) {
  const appUrl = process.env.MCP_APP_URL ?? `${req.protocol}://${req.get("host")}`;
  res.json({
    issuer: appUrl,
    authorization_endpoint: `${appUrl}/authorize`,
    token_endpoint: `${appUrl}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
  });
}
