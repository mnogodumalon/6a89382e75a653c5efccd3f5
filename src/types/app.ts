import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Leihraeder {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    rahmennummer?: string;
    groesse?: LookupValue;
    tagespreis?: number;
    verliehen_an?: string; // applookup -> URL zu 'Kunden' Record
  };
}

export interface Kunden {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    vorname?: string;
    nachname?: string;
    telefonnummer?: string;
    email?: string;
    stammkunde?: boolean;
  };
}

export interface Reparaturauftraege {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kostenvoranschlag?: number;
    kunde?: string; // applookup -> URL zu 'Kunden' Record
    fahrrad_beschreibung?: string;
    problembeschreibung?: string;
    abgabedatum?: string; // Format: YYYY-MM-DD oder ISO String
    status?: LookupValue;
  };
}

export interface Ersatzteile {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    bezeichnung?: string;
    lagerbestand?: number;
    preis?: number;
    mindestbestand?: number;
  };
}

export const APP_IDS = {
  LEIHRAEDER: '6a893fdc641de8c47248bb48',
  KUNDEN: '6a89381649b1e4adfb583623',
  REPARATURAUFTRAEGE: '6a893819520245c43dad9f5e',
  ERSATZTEILE: '6a8938194cf2973db816a8b8',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'leihraeder': {
    groesse: [{ key: "s", get label() { return lookupLabel('leihraeder', 'groesse', "s") ?? "S"; } }, { key: "m", get label() { return lookupLabel('leihraeder', 'groesse', "m") ?? "M"; } }, { key: "l", get label() { return lookupLabel('leihraeder', 'groesse', "l") ?? "L"; } }],
  },
  'reparaturauftraege': {
    status: [{ key: "angenommen", get label() { return lookupLabel('reparaturauftraege', 'status', "angenommen") ?? "Angenommen"; } }, { key: "in_arbeit", get label() { return lookupLabel('reparaturauftraege', 'status', "in_arbeit") ?? "In Arbeit"; } }, { key: "fertig", get label() { return lookupLabel('reparaturauftraege', 'status', "fertig") ?? "Fertig"; } }, { key: "abgeholt", get label() { return lookupLabel('reparaturauftraege', 'status', "abgeholt") ?? "Abgeholt"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'leihraeder': {
    'rahmennummer': 'string/text',
    'groesse': 'lookup/select',
    'tagespreis': 'number',
    'verliehen_an': 'applookup/select',
  },
  'kunden': {
    'vorname': 'string/text',
    'nachname': 'string/text',
    'telefonnummer': 'string/tel',
    'email': 'string/email',
    'stammkunde': 'bool',
  },
  'reparaturauftraege': {
    'kostenvoranschlag': 'number',
    'kunde': 'applookup/select',
    'fahrrad_beschreibung': 'string/text',
    'problembeschreibung': 'string/textarea',
    'abgabedatum': 'date/date',
    'status': 'lookup/radio',
  },
  'ersatzteile': {
    'bezeichnung': 'string/text',
    'lagerbestand': 'number',
    'preis': 'number',
    'mindestbestand': 'number',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateLeihraeder = StripLookup<Leihraeder['fields']>;
export type CreateKunden = StripLookup<Kunden['fields']>;
export type CreateReparaturauftraege = StripLookup<Reparaturauftraege['fields']>;
export type CreateErsatzteile = StripLookup<Ersatzteile['fields']>;