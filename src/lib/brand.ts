import { readDataSafe, mutateData } from "./data";
import { now } from "./utils";
import type { BrandConfig } from "@/types/brand";
import { DEFAULT_BRAND } from "@/types/brand";

const FILE = "brand.json";

const defaultBrand = (): BrandConfig => ({
  ...DEFAULT_BRAND,
  colors: { ...DEFAULT_BRAND.colors },
  fonts: { ...DEFAULT_BRAND.fonts },
  customFonts: [...DEFAULT_BRAND.customFonts],
  styleKeywords: [...DEFAULT_BRAND.styleKeywords],
});

export async function getBrand(): Promise<BrandConfig> {
  return readDataSafe<BrandConfig>(FILE, defaultBrand());
}

export async function updateBrand(
  updates: Partial<Omit<BrandConfig, "createdAt" | "updatedAt">>
): Promise<BrandConfig> {
  return mutateData<BrandConfig, BrandConfig>(FILE, defaultBrand, (current) => {
    // Mutated in place so the object the lock persists is the object returned.
    Object.assign(current, updates, {
      colors: { ...current.colors, ...updates.colors },
      fonts: { ...current.fonts, ...updates.fonts },
      createdAt: current.createdAt || now(),
      updatedAt: now(),
    });
    return current;
  });
}

export function isBrandConfigured(brand: BrandConfig): boolean {
  return brand.name.trim().length > 0;
}
