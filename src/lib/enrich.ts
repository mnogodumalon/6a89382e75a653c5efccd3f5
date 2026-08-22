import type { EnrichedLeihraeder, EnrichedLeihvorgaenge, EnrichedReparaturauftraege } from '@/types/enriched';
import type { Kunden, Leihraeder, Leihvorgaenge, Reparaturauftraege } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface LeihvorgaengeMaps {
  leihraederMap: Map<string, Leihraeder>;
  kundenMap: Map<string, Kunden>;
}

export function enrichLeihvorgaenge(
  leihvorgaenge: Leihvorgaenge[],
  maps: LeihvorgaengeMaps
): EnrichedLeihvorgaenge[] {
  return leihvorgaenge.map(r => ({
    ...r,
    leihradName: resolveDisplay(r.fields.leihrad, maps.leihraederMap, 'rahmennummer'),
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'vorname', 'nachname'),
  }));
}

interface LeihraederMaps {
  kundenMap: Map<string, Kunden>;
}

export function enrichLeihraeder(
  leihraeder: Leihraeder[],
  maps: LeihraederMaps
): EnrichedLeihraeder[] {
  return leihraeder.map(r => ({
    ...r,
    verliehen_anName: resolveDisplay(r.fields.verliehen_an, maps.kundenMap, 'vorname', 'nachname'),
  }));
}

interface ReparaturauftraegeMaps {
  kundenMap: Map<string, Kunden>;
}

export function enrichReparaturauftraege(
  reparaturauftraege: Reparaturauftraege[],
  maps: ReparaturauftraegeMaps
): EnrichedReparaturauftraege[] {
  return reparaturauftraege.map(r => ({
    ...r,
    kundeName: resolveDisplay(r.fields.kunde, maps.kundenMap, 'vorname', 'nachname'),
  }));
}
