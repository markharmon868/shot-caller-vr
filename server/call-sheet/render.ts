import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import type { PdfSpec } from "../../shared/contracts/call-sheet.js";

const execFileAsync = promisify(execFile);
const DENO_SCRIPT_PATH = path.resolve(process.cwd(), "server", "call-sheet", "deno-generate-scratch.mjs");
const MANAGED_DENO_INSTALL_DIR = path.resolve(process.cwd(), ".data", "tools", "deno");

export class CallSheetRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CallSheetRenderError";
  }
}

export interface CallSheetRenderer {
  render(spec: PdfSpec): Promise<Buffer>;
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new CallSheetRenderError(`Deno renderer script not found at ${filePath}.`);
  }
}

function managedDenoBin(installDir: string): string {
  return path.join(installDir, "bin", "deno");
}

async function commandExists(command: string): Promise<boolean> {
  try {
    await execFileAsync(command, ["--version"], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    return true;
  } catch (error) {
    return false;
  }
}

async function installManagedDeno(installDir = MANAGED_DENO_INSTALL_DIR): Promise<string> {
  await fs.mkdir(installDir, { recursive: true });

  try {
    await execFileAsync("sh", [
      "-c",
      "curl -fsSL https://deno.land/install.sh | sh -s -- -y",
    ], {
      env: {
        ...process.env,
        DENO_INSTALL: installDir,
      },
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Deno installation failure.";
    throw new CallSheetRenderError(
      `Deno is required to render call-sheet PDFs and automatic installation failed: ${message}`,
    );
  }

  if (!await commandExists(managedDenoBin(installDir))) {
    throw new CallSheetRenderError(
      `Deno installation completed without a usable binary in ${path.join(installDir, "bin")}.`,
    );
  }

  return managedDenoBin(installDir);
}

export async function ensureDenoAvailable(denoBin = "deno", installDir = MANAGED_DENO_INSTALL_DIR): Promise<string> {
  if (await commandExists(denoBin)) {
    return denoBin;
  }
  const installedBin = managedDenoBin(installDir);
  if (await commandExists(installedBin)) {
    return installedBin;
  }

  return await installManagedDeno(installDir);
}

export function createCallSheetRenderer(options?: {
  denoBin?: string;
  scriptPath?: string;
  managedInstallDir?: string;
}): CallSheetRenderer {
  const denoBin = options?.denoBin ?? "deno";
  const scriptPath = options?.scriptPath ?? DENO_SCRIPT_PATH;
  const managedInstallDir = options?.managedInstallDir ?? MANAGED_DENO_INSTALL_DIR;

  return {
    async render(spec) {
      await ensureFileExists(scriptPath);
      const resolvedDenoBin = await ensureDenoAvailable(denoBin, managedInstallDir);

      const tempDir = path.join(os.tmpdir(), `shot-caller-call-sheet-${randomUUID()}`);
      const specPath = path.join(tempDir, "spec.json");
      const outputPath = path.join(tempDir, "call-sheet.pdf");

      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(specPath, JSON.stringify(spec, null, 2), "utf8");

      try {
        await execFileAsync(resolvedDenoBin, [
          "run",
          "--allow-read",
          "--allow-write",
          "--node-modules-dir=auto",
          scriptPath,
          specPath,
          outputPath,
        ], {
          timeout: 60_000,
          maxBuffer: 10 * 1024 * 1024,
        });

        return await fs.readFile(outputPath);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Deno renderer failure.";
        throw new CallSheetRenderError(`Failed to render call-sheet PDF: ${message}`);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    },
  };
}
