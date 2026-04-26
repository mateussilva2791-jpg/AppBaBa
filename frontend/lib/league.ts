import type { League } from "@/lib/types";
import { getActiveLeagueForUser } from "@/services/leagues/getActiveLeagueForUser";


export async function getLeagueBySlug(token: string, slug: string): Promise<League | null> {
  const resolved = await getActiveLeagueForUser({ token, requestedLeagueSlug: slug });
  if (!resolved.availableLeagues.length) {
    return null;
  }

  const league = resolved.availableLeagues.find((item) => item.slug === slug) ?? null;

  if (!league) {
    throw new Error("Liga nao encontrada para este usuario.");
  }

  return league;
}
