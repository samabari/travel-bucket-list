import { describe, expect, it } from "vitest";
import type { Destination } from "./destinations";
import { calculateDashboardStats } from "./dashboard-stats";

function destination(
  id: string,
  countryId: string,
  status: Destination["status"],
): Destination {
  return {
    id,
    countryId,
    countryName: countryId,
    name: `Destination ${id}`,
    status,
    visitDate: null,
    rating: null,
    notes: null,
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("calculateDashboardStats", () => {
  it("counts total destinations, visited places, wishlists, and unique countries", () => {
    const destinations = [
      destination("1", "JP", "visited"),
      destination("2", "JP", "visited"),
      destination("3", "PT", "visited"),
      destination("4", "IT", "wishlist"),
      destination("5", "IT", "wishlist"),
    ];

    expect(calculateDashboardStats(destinations)).toEqual({
      totalDestinations: 5,
      visitedDestinations: 3,
      wishlistDestinations: 2,
      uniqueCountries: 3,
    });
  });

  it("returns zero counts for an empty destination list", () => {
    expect(calculateDashboardStats([])).toEqual({
      totalDestinations: 0,
      visitedDestinations: 0,
      wishlistDestinations: 0,
      uniqueCountries: 0,
    });
  });
});
