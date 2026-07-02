import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { loadConfig } from "./config.js";
import {
  createAuthMiddleware,
  protectedResourceMetadata,
} from "./auth.js";

const config = loadConfig();

/** Build a fresh MCP server exposing a single OAuth-protected tool. */
function buildMcpServer(): McpServer {
  const server = new McpServer({
    name: "mcp-oauth-example",
    version: "0.1.0",
  });

  server.tool(
    "whoami",
    "Return the identity carried by the caller's OAuth access token.",
    { verbose: z.boolean().default(false) },
    async ({ verbose }, extra) => {
      // The auth context is threaded through per-request (see below).
      const auth = (extra as { auth?: { subject: string; scopes: string[] } })
        .auth;
      const text = verbose
        ? JSON.stringify(auth ?? {}, null, 2)
        : `authenticated as ${auth?.subject ?? "unknown"}`;
      return { content: [{ type: "text", text }] };
    },
  );

  return server;
}

const app = express();
app.use(express.json());

// RFC 9728 — Protected Resource Metadata. Public, no auth required.
app.get("/.well-known/oauth-protected-resource", (_req, res) => {
  res.json(protectedResourceMetadata(config));
});

app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Everything under /mcp requires a valid OAuth access token.
const authenticate = createAuthMiddleware(config);

app.post("/mcp", authenticate, async (req, res) => {
  // Stateless transport: a new server + transport per request keeps the
  // example simple. For sessions, persist transports by `mcp-session-id`.
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const server = buildMcpServer();
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  // Surface the verified identity to tool handlers via request context.
  await transport.handleRequest(req, res, req.body, {
    requestInfo: { auth: req.auth },
  } as never);
});

app.listen(config.port, () => {
  console.log(`mcp-oauth-example listening on ${config.serverUrl}`);
  console.log(
    `  metadata: ${config.serverUrl}/.well-known/oauth-protected-resource`,
  );
  console.log(`  issuer:   ${config.issuerUrl}`);
});
