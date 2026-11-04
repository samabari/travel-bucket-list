import { describe, expect, it } from "vitest";
import type { Destination } from "./destinations";
import { pickRandomWishlistDestination } from "./random-destination-picker";

function destination(
  id: string,
  status: Destination["status"],
): Destination {
  return {
    id,
    countryId: `country-${id}`,
    countryName: `Country ${id}`,
    name: `Place ${id}`,
    status,
    visitDate: null,
    rating: null,
    notes: null,
    photoUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("pickRandomWishlistDestination", () => {
  it("selects only destinations from the wishlist", () => {
    const destinations = [
      destination("visited", "visited"),
      destination("wishlist-a", "wishlist"),
      destination("wishlist-b", "wishlist"),
    ];

    expect(pickRandomWishlistDestination(destinations, null, () => 0.999)?.id).toBe("wishlist-b");
  });

  it("never selects a visited destination", () => {
    const destinations = [
      destination("wishlist", "wishlist"),
      destination("visited", "visited"),
    ];

    expect(pickRandomWishlistDestination(destinations, null, () => 0.999)?.id).toBe("wishlist");
  });

  it("returns null when the user has no wishlist destinations", () => {
    expect(pickRandomWishlistDestination([destination("visited", "visited")], null, () => 0)).toBeNull();
    expect(pickRandomWishlistDestination([], null, () => 0)).toBeNull();
  });

  it("avoids the previous destination when another wishlist choice exists", () => {
    const destinations = [
      destination("previous", "wishlist"),
      destination("next", "wishlist"),
    ];

    expect(pickRandomWishlistDestination(destinations, "previous", () => 0)?.id).toBe("next");
  });

  it("allows a repeat when it is the only wishlist destination", () => {
    const onlyDestination = destination("only", "wishlist");

    expect(pickRandomWishlistDestination([onlyDestination], "only", () => 0)?.id).toBe("only");
  });
});
