/**
 * Vercel serverless function — proxies requests to the Express HTTP server.
 *
 * This file re-exports the Express app as a Vercel serverless handler.
 * Vercel automatically routes /api/* to this function.
 *
 * Deploy:
 *   cd mcp-server && npx vercel
 *
 * Environment variables (set in Vercel dashboard):
 *   CLAUDE_CODE_SRC_ROOT — absolute path where src/ is deployed
 *   MCP_API_KEY          — optional bearer token for auth
 *
 * NOTE: Vercel serverless functions are stateless, so the Streamable HTTP
 * transport (which requires sessions) won't persist across invocations.
 * For production use with session-based MCP clients, prefer Railway/Render/VPS.
 * The legacy SSE transport and stateless tool calls work fine on Vercel.
 */

export { app as default } from "./vercelApp.js";

