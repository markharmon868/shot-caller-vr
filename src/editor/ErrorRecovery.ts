/**
 * ErrorRecovery — Fadell principle: Design for failure scenarios
 * Graceful degradation and recovery strategies
 */

import { toast } from "./Toast.js";

export interface RecoveryStrategy {
  name: string;
  canRecover: (error: Error) => boolean;
  recover: (error: Error) => Promise<void>;
}

/**
 * Network error recovery
 */
const networkRecovery: RecoveryStrategy = {
  name: "Network Retry",
  canRecover: (error) => {
    return (
      error.message.includes("fetch") ||
      error.message.includes("network") ||
      error.message.includes("Failed to load")
    );
  },
  recover: async (error) => {
    toast("Network error - retrying in 3 seconds...", "warning");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // The calling code should retry the operation
  },
};

/**
 * Storage quota exceeded recovery
 */
const storageRecovery: RecoveryStrategy = {
  name: "Storage Cleanup",
  canRecover: (error) => {
    return (
      error.name === "QuotaExceededError" ||
      error.message.includes("quota") ||
      error.message.includes("storage")
    );
  },
  recover: async (error) => {
    toast("Storage full - clearing old data...", "warning");

    // Clear old scene autosaves (keep most recent)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("shot-caller-scene-")) {
        keysToRemove.push(key);
      }
    }

    // Keep only the 3 most recent
    keysToRemove.sort().reverse();
    keysToRemove.slice(3).forEach((key) => {
      localStorage.removeItem(key);
    });

    toast("Storage cleaned - please try again", "success");
  },
};

/**
 * WebGL context loss recovery
 */
const webglRecovery: RecoveryStrategy = {
  name: "WebGL Context",
  canRecover: (error) => {
    return (
      error.message.includes("WebGL") ||
      error.message.includes("context") ||
      error.message.includes("lost")
    );
  },
  recover: async (error) => {
    toast("Graphics error - reloading scene...", "warning");
    // Give the browser time to restore context
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // The calling code should reinitialize the renderer
  },
};

/**
 * File loading error recovery
 */
const fileLoadRecovery: RecoveryStrategy = {
  name: "File Load Fallback",
  canRecover: (error) => {
    return (
      error.message.includes("404") ||
      error.message.includes("not found") ||
      error.message.includes("ENOENT")
    );
  },
  recover: async (error) => {
    toast("File not found - using default scene", "warning");
    // The calling code should fall back to default assets
  },
};

const strategies: RecoveryStrategy[] = [
  networkRecovery,
  storageRecovery,
  webglRecovery,
  fileLoadRecovery,
];

/**
 * Attempt to recover from an error
 */
export async function attemptRecovery(error: Error): Promise<boolean> {
  console.error("Error occurred:", error);

  // Find applicable recovery strategy
  const strategy = strategies.find((s) => s.canRecover(error));

  if (strategy) {
    try {
      console.log(`Attempting recovery: ${strategy.name}`);
      await strategy.recover(error);
      return true;
    } catch (recoveryError) {
      console.error("Recovery failed:", recoveryError);
      return false;
    }
  }

  // No recovery strategy available
  toast(`Error: ${error.message}`, "error");
  return false;
}

/**
 * Wrap an async function with error recovery
 */
export function withRecovery<T>(
  fn: () => Promise<T>,
  fallback?: () => T,
): () => Promise<T> {
  return async () => {
    try {
      return await fn();
    } catch (error) {
      const recovered = await attemptRecovery(error as Error);

      if (recovered) {
        // Retry once after recovery
        try {
          return await fn();
        } catch (retryError) {
          console.error("Retry after recovery failed:", retryError);
          if (fallback) {
            return fallback();
          }
          throw retryError;
        }
      }

      // Recovery not possible
      if (fallback) {
        return fallback();
      }
      throw error;
    }
  };
}

/**
 * Safe localStorage wrapper with quota handling
 */
export const safeStorage = {
  setItem: async (key: string, value: string): Promise<boolean> => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      const recovered = await attemptRecovery(error as Error);
      if (recovered) {
        try {
          localStorage.setItem(key, value);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("localStorage.getItem failed:", error);
      return null;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("localStorage.removeItem failed:", error);
    }
  },
};
