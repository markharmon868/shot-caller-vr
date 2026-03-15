/**
 * Nano Banana Pipeline — Image enhancement using Gemini 3.1 Flash Image Preview
 * Transforms user-uploaded images into higher fidelity, photorealistic versions
 * for better gaussian splat generation
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface EnhancementOptions {
  prompt?: string;
  quality?: "low" | "medium" | "high";
  style?: "photorealistic" | "cinematic" | "natural";
}

export interface EnhancedImage {
  originalUrl: string;
  enhancedDataUrl: string;
  mimeType: string;
  metadata?: {
    prompt: string;
    timestamp: number;
  };
}

/**
 * Convert a File or URL to a base64 data URL
 */
async function fileToDataUrl(input: File | string): Promise<string> {
  if (typeof input === "string") {
    // If it's already a URL, fetch and convert
    const response = await fetch(input);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } else {
    // Convert File to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(input);
    });
  }
}

/**
 * Parse data URL to get mime type and base64 data
 */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error("Invalid data URL format");
  }
  return {
    mimeType: matches[1],
    data: matches[2],
  };
}

/**
 * Generate enhancement prompt based on options
 */
function generateEnhancementPrompt(options: EnhancementOptions): string {
  if (options.prompt) {
    return options.prompt;
  }

  const style = options.style || "photorealistic";
  const styleDescriptions = {
    photorealistic:
      "photorealistic, highly detailed, sharp focus, professional photography quality",
    cinematic:
      "cinematic lighting, film-like quality, dramatic depth of field, color graded",
    natural:
      "natural lighting, authentic colors, realistic textures, clean composition",
  };

  return `Enhance this image to be more ${styleDescriptions[style]}. Improve clarity, detail, and overall visual fidelity while maintaining the original scene composition and subject matter. Make it look like a professional photograph with excellent lighting and sharpness.`;
}

/**
 * Enhance a single image using Nano Banana (Gemini 3.1 Flash Image Preview)
 */
export async function enhanceImage(
  input: File | string,
  apiKey: string,
  options: EnhancementOptions = {},
): Promise<EnhancedImage> {
  console.log("🍌 Nano Banana: Enhancing image...");

  // Convert input to data URL
  const originalDataUrl = await fileToDataUrl(input);
  const originalUrl = typeof input === "string" ? input : originalDataUrl;

  // Parse data URL
  const { mimeType, data } = parseDataUrl(originalDataUrl);

  // Initialize Gemini API
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-image-preview",
  });

  // Generate enhancement prompt
  const prompt = generateEnhancementPrompt(options);

  console.log(`🍌 Using prompt: "${prompt.substring(0, 80)}..."`);

  // Call Gemini API
  const result = await model.generateContent([
    {
      inlineData: {
        data,
        mimeType,
      },
    },
    prompt,
  ]);

  const response = result.response;

  // Extract enhanced image from response
  // The response should contain the enhanced image as inline data
  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("No candidates in Gemini response");
  }

  const parts = candidates[0].content.parts;
  let enhancedDataUrl: string | null = null;

  for (const part of parts) {
    if (part.inlineData) {
      // Found the enhanced image
      const enhancedMimeType = part.inlineData.mimeType;
      const enhancedData = part.inlineData.data;
      enhancedDataUrl = `data:${enhancedMimeType};base64,${enhancedData}`;
      break;
    }
  }

  if (!enhancedDataUrl) {
    throw new Error("No enhanced image found in Gemini response");
  }

  console.log("✅ Image enhanced successfully");

  return {
    originalUrl,
    enhancedDataUrl,
    mimeType,
    metadata: {
      prompt,
      timestamp: Date.now(),
    },
  };
}

/**
 * Enhance multiple images in sequence
 */
export async function enhanceImages(
  inputs: (File | string)[],
  apiKey: string,
  options: EnhancementOptions = {},
  onProgress?: (current: number, total: number) => void,
): Promise<EnhancedImage[]> {
  console.log(`🍌 Nano Banana: Enhancing ${inputs.length} images...`);

  const results: EnhancedImage[] = [];

  for (let i = 0; i < inputs.length; i++) {
    if (onProgress) {
      onProgress(i + 1, inputs.length);
    }

    try {
      const enhanced = await enhanceImage(inputs[i], apiKey, options);
      results.push(enhanced);

      // Rate limiting: wait 1 second between requests
      if (i < inputs.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Failed to enhance image ${i + 1}:`, error);
      // Continue with remaining images even if one fails
    }
  }

  console.log(`✅ Enhanced ${results.length}/${inputs.length} images`);

  return results;
}

/**
 * Convert enhanced image data URL to File
 */
export async function dataUrlToFile(
  dataUrl: string,
  filename: string,
): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], filename, { type: blob.type });
}

/**
 * Get API key from environment or localStorage
 */
export function getNanoBananaApiKey(): string | null {
  // Try to get from localStorage first (for browser)
  if (typeof window !== "undefined" && window.localStorage) {
    const stored = localStorage.getItem("GOOGLE_API_KEY");
    if (stored) {
      return stored;
    }
  }

  // Fallback to environment variable (for server-side)
  if (typeof process !== "undefined" && process.env) {
    return process.env.GOOGLE_API_KEY || null;
  }

  return null;
}

/**
 * Set API key in localStorage
 */
export function setNanoBananaApiKey(apiKey: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    localStorage.setItem("GOOGLE_API_KEY", apiKey);
  }
}
