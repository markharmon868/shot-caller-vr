/**
 * Pipeline environment loader.
 * Call loadPipelineEnv() at the top of any pipeline script.
 */
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

/**
 * Load .env from project root.
 * Idempotent — safe to call multiple times.
 */
export function loadPipelineEnv(): void {
  config({ path: path.join(rootDir, ".env") });
}

// Auto-load when imported
loadPipelineEnv();
