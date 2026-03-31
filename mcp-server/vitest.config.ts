import { defineConfig } from "vitest/config";
import * as path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
    env: {
      // Point at the repo-level src/ directory so the server resolves
      // tool/command/source paths correctly during tests.
      CLAUDE_CODE_SRC_ROOT: path.resolve(__dirname, "..", "src"),
    },
  },
});
