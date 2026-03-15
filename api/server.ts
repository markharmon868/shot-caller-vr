/**
 * Vercel Serverless Function wrapper for Shot Caller Express server
 *
 * This wraps the Express app from server/index.ts for Vercel's serverless environment.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

let app: Awaited<ReturnType<typeof createServerInstance>> | null = null;

async function createServerInstance() {
  const { createServer } = await import("../server/index.js");
  return await createServer();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize app on first request (cold start)
    if (!app) {
      app = await createServerInstance();
    }

    // Convert Vercel request to Express request
    const expressReq = req as any;
    const expressRes = res as any;

    // Handle the request with Express
    app(expressReq, expressRes);
  } catch (error) {
    console.error("[Vercel] Server error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Internal server error"
    });
  }
}
