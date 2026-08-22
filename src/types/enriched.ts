import type { Leihraeder, Leihvorgaenge, Reparaturauftraege } from './app';

export type EnrichedLeihvorgaenge = Leihvorgaenge & {
  leihradName: string;
  kundeName: string;
};

export type EnrichedLeihraeder = Leihraeder & {
  verliehen_anName: string;
};

export type EnrichedReparaturauftraege = Reparaturauftraege & {
  kundeName: string;
};
