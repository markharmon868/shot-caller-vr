import path from "node:path";
import { readFile } from "node:fs/promises";
import { z } from "zod";

import { NormalizedCatalogMatchSchema } from "../../shared/contracts/call-sheet.js";
import type { NormalizedPlacedAsset } from "./normalize.js";

const CatalogItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  dailyRate: z.number().nonnegative(),
  weeklyRate: z.number().nonnegative(),
  gltfUrl: z.string().nullable().optional(),
});

const CatalogCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  elementType: z.string().min(1),
  items: z.array(CatalogItemSchema),
});

const AssetCatalogSchema = z.object({
  version: z.number(),
  categories: z.array(CatalogCategorySchema),
});

export type AssetCatalog = z.infer<typeof AssetCatalogSchema>;
export type CatalogCategory = z.infer<typeof CatalogCategorySchema>;
export type CatalogItem = z.infer<typeof CatalogItemSchema>;
export type NormalizedCatalogMatch = z.infer<typeof NormalizedCatalogMatchSchema>;

let catalogPromise: Promise<AssetCatalog> | undefined;

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function catalogPath(): string {
  return path.resolve(process.cwd(), "public", "asset-catalog.json");
}

export async function loadAssetCatalog(): Promise<AssetCatalog> {
  if (!catalogPromise) {
    catalogPromise = readFile(catalogPath(), "utf8").then((raw) => AssetCatalogSchema.parse(JSON.parse(raw)));
  }
  return await catalogPromise;
}

function toMatch(params: {
  asset: NormalizedPlacedAsset;
  category: CatalogCategory;
  item: CatalogItem;
  confidence: "high" | "medium" | "low";
  source: "gltfUrl" | "name" | "equipType";
}): NormalizedCatalogMatch {
  return NormalizedCatalogMatchSchema.parse({
    elementId: params.asset.id,
    elementType: params.asset.type,
    elementName: params.asset.name,
    catalogItemId: params.item.id,
    catalogCategoryId: params.category.id,
    displayName: params.item.name,
    dailyRate: params.item.dailyRate,
    weeklyRate: params.item.weeklyRate,
    confidence: params.confidence,
    source: params.source,
  });
}

function matchByGltfUrl(asset: NormalizedPlacedAsset, catalog: AssetCatalog): NormalizedCatalogMatch | null {
  if (!asset.gltfUrl) {
    return null;
  }

  for (const category of catalog.categories) {
    for (const item of category.items) {
      if (item.gltfUrl && item.gltfUrl === asset.gltfUrl) {
        return toMatch({
          asset,
          category,
          item,
          confidence: "high",
          source: "gltfUrl",
        });
      }
    }
  }

  return null;
}

function matchByName(asset: NormalizedPlacedAsset, catalog: AssetCatalog): NormalizedCatalogMatch | null {
  const candidates = new Set<string>([
    normalizeKey(asset.name),
    normalizeKey(asset.fileName ?? asset.name),
  ]);

  for (const category of catalog.categories) {
    for (const item of category.items) {
      const itemName = normalizeKey(item.name);
      for (const candidate of candidates) {
        if (candidate.length === 0) {
          continue;
        }
        if (candidate === itemName) {
          return toMatch({
            asset,
            category,
            item,
            confidence: "high",
            source: "name",
          });
        }
        if (candidate.includes(itemName) || itemName.includes(candidate)) {
          return toMatch({
            asset,
            category,
            item,
            confidence: "medium",
            source: "name",
          });
        }
      }
    }
  }

  return null;
}

function matchByEquipType(asset: NormalizedPlacedAsset, catalog: AssetCatalog): NormalizedCatalogMatch | null {
  if (!asset.equipType) {
    return null;
  }

  const equipType = normalizeKey(asset.equipType);
  for (const category of catalog.categories) {
    for (const item of category.items) {
      const itemName = normalizeKey(item.name);
      const itemId = normalizeKey(item.id);
      if (itemName.includes(equipType) || itemId.includes(equipType)) {
        return toMatch({
          asset,
          category,
          item,
          confidence: "low",
          source: "equipType",
        });
      }
    }
  }

  return null;
}

export async function matchCatalogAssets(assets: NormalizedPlacedAsset[]): Promise<NormalizedCatalogMatch[]> {
  const catalog = await loadAssetCatalog();
  const matches = new Map<string, NormalizedCatalogMatch>();

  for (const asset of assets) {
    const match = matchByGltfUrl(asset, catalog)
      ?? matchByName(asset, catalog)
      ?? matchByEquipType(asset, catalog);

    if (match) {
      matches.set(asset.id, match);
    }
  }

  return Array.from(matches.values());
}
