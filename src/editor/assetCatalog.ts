export interface CatalogItem {
  id: string;
  name: string;
  manufacturer: string;
  description: string;
  dailyRate: number;
  weeklyRate: number;
  unit: string;
  gltfUrl: string | null;
  /** Vertical offset (meters) applied after auto-scaling. Use to fine-tune model height. */
  yOffset?: number;
  notes: string;
}

export interface CatalogCategory {
  id: string;
  label: string;
  elementType: string;
  icon?: string;
  items: CatalogItem[];
}

export interface AssetCatalog {
  version: number;
  description: string;
  categories: CatalogCategory[];
}

let _catalog: AssetCatalog | null = null;

export async function loadAssetCatalog(): Promise<AssetCatalog> {
  if (_catalog) return _catalog;
  const res = await fetch("/asset-catalog.json");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  _catalog = (await res.json()) as AssetCatalog;
  return _catalog;
}

export function getCatalogItemById(id: string): CatalogItem | undefined {
  if (!_catalog) return undefined;
  for (const cat of _catalog.categories) {
    const item = cat.items.find((i) => i.id === id);
    if (item) return item;
  }
  return undefined;
}
