import type { Destination, DestinationStatus } from "./destinations";

export type DestinationStatusFilter = "all" | DestinationStatus;
export type DestinationSort = "name-asc" | "name-desc" | "newest" | "oldest";

export interface DestinationFilters {
  search: string;
  countryId: string;
  status: DestinationStatusFilter;
  sort: DestinationSort;
}

export function filterAndSortDestinations(
  destinations: Destination[],
  filters: DestinationFilters,
): Destination[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const filtered = destinations.filter((destination) => {
    if (query && !destination.name.toLocaleLowerCase().includes(query)) return false;
    if (filters.countryId && destination.countryId !== filters.countryId) return false;
    if (filters.status !== "all" && destination.status !== filters.status) return false;
    return true;
  });

  return filtered.sort((left, right) => {
    if (filters.sort === "name-asc" || filters.sort === "name-desc") {
      const nameOrder = left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
      return filters.sort === "name-asc" ? nameOrder : -nameOrder;
    }

    const leftDate = Date.parse(left.createdAt);
    const rightDate = Date.parse(right.createdAt);
    const dateOrder = (Number.isNaN(leftDate) ? 0 : leftDate) - (Number.isNaN(rightDate) ? 0 : rightDate);
    return filters.sort === "newest" ? -dateOrder : dateOrder;
  });
}
