import type { Leihraeder, Reparaturauftraege } from './app';

export type EnrichedLeihraeder = Leihraeder & {
  verliehen_anName: string;
};

export type EnrichedReparaturauftraege = Reparaturauftraege & {
  kundeName: string;
};
