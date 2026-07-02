export interface Config {
  port: number;
  serverUrl: string;
  issuerUrl: string;
  jwksUrl: string;
  audience: string;
}

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function loadConfig(): Config {
  const serverUrl = required("MCP_SERVER_URL", "http://localhost:3000");
  return {
    port: Number(process.env.PORT ?? 3000),
    serverUrl,
    issuerUrl: required("AUTH_ISSUER_URL"),
    jwksUrl: required("AUTH_JWKS_URL"),
    audience: process.env.AUTH_AUDIENCE ?? serverUrl,
  };
}
