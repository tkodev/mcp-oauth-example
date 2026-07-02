import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { NextFunction, Request, Response } from "express";
import type { Config } from "./config.js";

/**
 * OAuth 2.1 support for an MCP resource server, per the MCP authorization spec:
 *
 *   1. Advertise Protected Resource Metadata (RFC 9728) at
 *      `/.well-known/oauth-protected-resource`, pointing clients at the
 *      external authorization server that issues tokens.
 *   2. Require a Bearer access token on the MCP endpoint. Validate its
 *      signature (JWKS), issuer, expiry, and audience (RFC 8707 — the token
 *      must be bound to THIS resource, preventing token passthrough).
 *   3. On a missing/invalid token, answer 401 with a `WWW-Authenticate`
 *      challenge that carries the `resource_metadata` URL so the client can
 *      discover where to authorize.
 */

export interface AuthContext {
  subject: string;
  scopes: string[];
  claims: JWTPayload;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export function protectedResourceMetadata(config: Config) {
  return {
    resource: config.serverUrl,
    authorization_servers: [config.issuerUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools"],
  };
}

export function createAuthMiddleware(config: Config) {
  const jwks = createRemoteJWKSet(new URL(config.jwksUrl));
  const metadataUrl = new URL(
    "/.well-known/oauth-protected-resource",
    config.serverUrl,
  ).toString();

  function challenge(res: Response, error: string, description: string) {
    res
      .status(401)
      .set(
        "WWW-Authenticate",
        `Bearer resource_metadata="${metadataUrl}", error="${error}", error_description="${description}"`,
      )
      .json({ error, error_description: description });
  }

  return async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    const header = req.headers.authorization ?? "";
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      challenge(res, "invalid_request", "Missing Bearer access token");
      return;
    }

    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: config.issuerUrl,
        audience: config.audience,
      });
      const scope = typeof payload.scope === "string" ? payload.scope : "";
      req.auth = {
        subject: payload.sub ?? "unknown",
        scopes: scope ? scope.split(" ") : [],
        claims: payload,
      };
      next();
    } catch (err) {
      const description =
        err instanceof Error ? err.message : "Token validation failed";
      challenge(res, "invalid_token", description);
    }
  };
}
