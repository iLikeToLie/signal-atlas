import type { AtlasData } from './types.ts';
import type { GroupingSettings } from './grouping.ts';
import { DEFAULT_GROUPING, GROUPING_KEY, validateGroupingForAtlas } from './grouping.ts';

export const QUANTITY_GROUPING_KEY = 'frequency-agile-atlas.grouping.v2';
export type QuantitySettings = Record<'frequency' | 'pri', GroupingSettings>;

export function loadGroupingSettings(frequencyAtlas: AtlasData, priAtlas: AtlasData): { settings: QuantitySettings; error: string } {
  try {
    const text = localStorage.getItem(QUANTITY_GROUPING_KEY), legacy = localStorage.getItem(GROUPING_KEY);
    const value = text ? JSON.parse(text) : { frequency: legacy ? JSON.parse(legacy) : DEFAULT_GROUPING, pri: legacy ? JSON.parse(legacy) : DEFAULT_GROUPING };
    return { settings: { frequency: validateGroupingForAtlas(value.frequency, frequencyAtlas), pri: validateGroupingForAtlas(value.pri, priAtlas) }, error: '' };
  } catch (e) {
    return { settings: { frequency: DEFAULT_GROUPING, pri: DEFAULT_GROUPING }, error: `Saved grouping settings could not be read: ${(e as Error).message} Defaults are active; saved settings have been left untouched.` };
  }
}
