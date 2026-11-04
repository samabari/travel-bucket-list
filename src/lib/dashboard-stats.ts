import type { Destination } from "./destinations";

export interface DashboardStats {
  totalDestinations: number;
  visitedDestinations: number;
  wishlistDestinations: number;
  uniqueCountries: number;
}

export function calculateDashboardStats(destinations: Destination[]): DashboardStats {
  return {
    totalDestinations: destinations.length,
    visitedDestinations: destinations.filter((destination) => destination.status === "visited").length,
    wishlistDestinations: destinations.filter((destination) => destination.status === "wishlist").length,
    uniqueCountries: new Set(destinations.map((destination) => destination.countryId)).size,
  };
}
