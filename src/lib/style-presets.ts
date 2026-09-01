import { readDataSafe, mutateData } from "./data";
import { generateId, now } from "./utils";
import type { StylePreset, StylePresetsData } from "@/types/style-preset";

const FILE = "style-presets.json";

const emptyData = (): StylePresetsData => ({ presets: [] });

async function load(): Promise<StylePresetsData> {
  return readDataSafe<StylePresetsData>(FILE, emptyData());
}

/** Every change to style-presets.json goes through here, under the file's lock. */
function mutate<R>(fn: (data: StylePresetsData) => R): Promise<R> {
  return mutateData<StylePresetsData, R>(FILE, emptyData, fn);
}

export async function listPresets(): Promise<StylePreset[]> {
  const data = await load();
  return data.presets;
}

export async function getPreset(id: string): Promise<StylePreset | null> {
  const data = await load();
  return data.presets.find((p) => p.id === id) ?? null;
}

export async function createPreset(
  params: Omit<StylePreset, "id" | "createdAt">
): Promise<StylePreset> {
  return mutate((data) => {
    const preset: StylePreset = {
      ...params,
      id: generateId(),
      createdAt: now(),
    };
    data.presets.push(preset);
    return preset;
  });
}

export async function deletePreset(id: string): Promise<boolean> {
  return mutate((data) => {
    const idx = data.presets.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    data.presets.splice(idx, 1);
    return true;
  });
}
