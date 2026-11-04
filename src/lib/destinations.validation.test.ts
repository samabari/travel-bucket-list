import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDestination, updateDestination } from "./destinations";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("./supabase", () => ({ supabase: supabaseMock }));

const validInput = {
  name: "Kyoto",
  country: { kind: "existing" as const, id: "country-jp" },
  status: "wishlist" as const,
  visitDate: null,
  rating: null,
  notes: null,
  photoUrl: null,
};

describe("destination write validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid creation before making a Supabase request", async () => {
    await expect(createDestination({
      ...validInput,
      name: "   ",
      country: { kind: "new", name: "  " },
    })).rejects.toThrow("Add a name for this destination.");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("rejects invalid edits before making a Supabase request", async () => {
    await expect(updateDestination("destination-1", {
      ...validInput,
      visitDate: "2024-02-30",
      rating: Number.POSITIVE_INFINITY,
    })).rejects.toThrow("Enter a valid calendar date.");

    expect(supabaseMock.from).not.toHaveBeenCalled();
  });
});
