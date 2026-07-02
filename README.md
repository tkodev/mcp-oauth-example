# mcp-oauth-example

A minimal [Model Context Protocol](https://modelcontextprotocol.io) server that
demonstrates **OAuth 2.1 protected Streamable HTTP transport** — the pattern for
exposing an MCP server to remote clients (Claude Code, the claude.ai web app,
custom agents) with per-request bearer-token auth instead of stdio + local
secrets.

It plays the **resource server** role. Token issuance is delegated to an
external OAuth 2.1 **authorization server** (e.g. Auth0, Keycloak, Okta,
WorkOS); this server only validates the tokens it receives.

## How the auth flow works

Following the [MCP authorization spec](https://modelcontextprotocol.io/specification/draft/basic/authorization):

1. Client hits `POST /mcp` with no token → server replies **401** with a
   `WWW-Authenticate` header carrying the `resource_metadata` URL.
2. Client fetches `/.well-known/oauth-protected-resource`
   ([RFC 9728](https://www.rfc-editor.org/rfc/rfc9728)) to discover the
   authorization server.
3. Client runs the OAuth 2.1 code + PKCE flow against that authorization
   server and obtains an access token scoped to this resource
   ([RFC 8707](https://www.rfc-editor.org/rfc/rfc8707) `resource` binding).
4. Client retries with `Authorization: Bearer <token>`. The server validates
   signature (JWKS), issuer, expiry, and **audience** before serving the tool.

Audience validation is what stops token passthrough — a token minted for some
other service is rejected here.

## Quick start

```bash
pnpm install
cp .env.example .env       # point AUTH_* at your authorization server
pnpm dev                   # tsx watch on http://localhost:3000
```

Verify the public metadata endpoint (no auth):

```bash
curl -s localhost:3000/.well-known/oauth-protected-resource | jq
```

Call the protected endpoint without a token to see the 401 challenge:

```bash
curl -i -X POST localhost:3000/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

With a valid token, `tools/list` returns the `whoami` tool, which echoes the
identity from the access token.

## Scripts

| command          | what it does                          |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | run with hot reload (`tsx watch`)     |
| `pnpm build`     | compile TypeScript to `dist/`         |
| `pnpm start`     | run the compiled server               |
| `pnpm typecheck` | type-check without emitting           |
| `pnpm inspect`   | launch the MCP Inspector against it   |
