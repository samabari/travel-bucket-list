import { describe, expect, it } from "vitest";
import {
  filterAndSortDestinations,
  type DestinationFilters,
} from "./destination-filters";
import type { Destination } from "./destinations";

const destinations: Destination[] = [
  {
    id: "d-1",
    countryId: "jp",
    countryName: "Japan",
    name: "Kyoto",
    status: "visited",
    visitDate: null,
    rating: null,
    notes: null,
    photoUrl: null,
    createdAt: "2025-02-03T12:00:00Z",
  },
  {
    id: "d-2",
    countryId: "pt",
    countryName: "Portugal",
    name: "Lisbon",
    status: "wishlist",
    visitDate: null,
    rating: null,
    notes: null,
    photoUrl: null,
    createdAt: "2025-02-01T12:00:00Z",
  },
  {
    id: "d-3",
    countryId: "jp",
    countryName: "Japan",
    name: "Tokyo",
    status: "wishlist",
    visitDate: null,
    rating: null,
    notes: null,
    photoUrl: null,
    createdAt: "2025-02-02T12:00:00Z",
  },
];

const defaults: DestinationFilters = {
  search: "",
  countryId: "",
  status: "all",
  sort: "newest",
};

describe("filterAndSortDestinations", () => {
  it("searches destination names without case or surrounding-space sensitivity", () => {
    expect(filterAndSortDestinations(destinations, { ...defaults, search: "  KYOT " }).map(({ id }) => id))
      .toEqual(["d-1"]);
  });

  it("filters by country", () => {
    expect(filterAndSortDestinations(destinations, { ...defaults, countryId: "jp" }).map(({ id }) => id))
      .toEqual(["d-1", "d-3"]);
  });

  it("filters by visited and wishlist status", () => {
    expect(filterAndSortDestinations(destinations, { ...defaults, status: "visited" }).map(({ id }) => id))
      .toEqual(["d-1"]);
    expect(filterAndSortDestinations(destinations, { ...defaults, status: "wishlist" }).map(({ id }) => id))
      .toEqual(["d-3", "d-2"]);
  });

  it("sorts names in both directions", () => {
    expect(filterAndSortDestinations(destinations, { ...defaults, sort: "name-asc" }).map(({ name }) => name))
      .toEqual(["Kyoto", "Lisbon", "Tokyo"]);
    expect(filterAndSortDestinations(destinations, { ...defaults, sort: "name-desc" }).map(({ name }) => name))
      .toEqual(["Tokyo", "Lisbon", "Kyoto"]);
  });

  it("sorts by newest and oldest creation date", () => {
    expect(filterAndSortDestinations(destinations, { ...defaults, sort: "newest" }).map(({ id }) => id))
      .toEqual(["d-1", "d-3", "d-2"]);
    expect(filterAndSortDestinations(destinations, { ...defaults, sort: "oldest" }).map(({ id }) => id))
      .toEqual(["d-2", "d-3", "d-1"]);
  });

  it("combines name, country, and status filters before sorting", () => {
    expect(filterAndSortDestinations(destinations, {
      ...defaults,
      search: "o",
      countryId: "jp",
      status: "wishlist",
      sort: "name-asc",
    }).map(({ id }) => id)).toEqual(["d-3"]);
  });

  it("returns an empty list when no destination matches", () => {
    expect(filterAndSortDestinations(destinations, { ...defaults, search: "Reykjavik" })).toEqual([]);
  });

  it("does not mutate the Supabase-provided destination array", () => {
    const copy = [...destinations];
    filterAndSortDestinations(destinations, { ...defaults, sort: "name-asc" });
    expect(destinations).toEqual(copy);
  });
});
