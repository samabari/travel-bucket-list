import type { Destination } from "./destinations";

export function pickRandomWishlistDestination(
  destinations: Destination[],
  previousDestinationId: string | null = null,
  random: () => number = Math.random,
): Destination | null {
  const wishlist = destinations.filter((destination) => destination.status === "wishlist");
  if (wishlist.length === 0) return null;

  const alternatives = previousDestinationId && wishlist.length > 1
    ? wishlist.filter((destination) => destination.id !== previousDestinationId)
    : wishlist;
  const choices = alternatives.length > 0 ? alternatives : wishlist;
  const randomValue = Math.min(Math.max(random(), 0), 1 - Number.EPSILON);
  return choices[Math.floor(randomValue * choices.length)] ?? null;
}
