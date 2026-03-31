FROM node:22-slim AS build
WORKDIR /app

# Copy full repo (src/ is needed at runtime for the MCP explorer)
COPY . .

# Build MCP server
WORKDIR /app/mcp-server
RUN npm ci && npm run build

# ---------------------------------------------------------------------------
FROM node:22-slim
WORKDIR /app

# Copy built MCP server and source code it explores
COPY --from=build /app/mcp-server/dist /app/mcp-server/dist
COPY --from=build /app/mcp-server/node_modules /app/mcp-server/node_modules
COPY --from=build /app/mcp-server/package.json /app/mcp-server/package.json
COPY --from=build /app/src /app/src
COPY --from=build /app/README.md /app/README.md

ENV NODE_ENV=production
ENV CLAUDE_CODE_SRC_ROOT=/app/src
ENV PORT=3000

EXPOSE 3000

WORKDIR /app/mcp-server
CMD ["node", "dist/http.js"]
