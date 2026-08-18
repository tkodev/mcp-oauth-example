# Agent Instructions

Reference MCP server showing **OAuth 2.1 protected Streamable HTTP transport** —
the remote-MCP auth pattern (bearer tokens, no stdio/local secrets). This server
is the *resource server*; token issuance is delegated to an external OAuth 2.1
authorization server. Public example repo (tkodev / work identity).

Must read: @README.md for the full flow walkthrough and endpoints.

## Stack

- TypeScript (ESM, `NodeNext`), Node ≥ 20
- `@modelcontextprotocol/sdk` — `McpServer` + `StreamableHTTPServerTransport`
- `express` for HTTP + `jose` for JWKS-based JWT validation, `zod` for tool schemas
- pnpm

## Build / run / test

```bash
pnpm install
cp .env.example .env    # set AUTH_ISSUER_URL / AUTH_JWKS_URL / AUTH_AUDIENCE
pnpm dev                # tsx watch, http://localhost:3000
pnpm typecheck          # tsc --noEmit
pnpm build              # -> dist/
```

## Structure

- `src/config.ts` — env loading (server URL, issuer, JWKS, audience)
- `src/auth.ts` — RFC 9728 protected-resource metadata, JWT validation
  middleware, and the 401 `WWW-Authenticate` challenge
- `src/server.ts` — Express app, public metadata + `/healthz`, and the
  auth-gated `POST /mcp` endpoint hosting the `whoami` tool

## Conventions

- Standard MCP spec terminology (resource server vs authorization server); keep
  it aligned with the linked spec/RFCs in the README.
- Keep it minimal and readable — this is teaching code, not a framework. New
  auth mechanics should stay in `src/auth.ts`.
- Commit identity is the work account (`tony@tko.dev`); push via the
  `github.com-tkodev` SSH host alias.
- **No AI/agent attribution in commits, PRs, or issues.**
