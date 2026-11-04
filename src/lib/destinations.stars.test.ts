import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addStar,
  getStarErrorMessage,
  listStarredDestinationIds,
  removeStar,
} from "./destinations";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("./supabase", () => ({ supabase: supabaseMock }));

describe("star persistence service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads starred destination IDs from Supabase", async () => {
    const select = vi.fn().mockResolvedValue({
      data: [{ destination_id: "destination-1" }, { destination_id: "destination-2" }],
      error: null,
    });
    supabaseMock.from.mockReturnValue({ select });

    await expect(listStarredDestinationIds()).resolves.toEqual(["destination-1", "destination-2"]);
    expect(supabaseMock.from).toHaveBeenCalledWith("stars");
    expect(select).toHaveBeenCalledWith("destination_id");
  });

  it("inserts a star without sending a user ID", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    supabaseMock.from.mockReturnValue({ insert });

    await addStar("destination-1");

    expect(supabaseMock.from).toHaveBeenCalledWith("stars");
    expect(insert).toHaveBeenCalledWith({ destination_id: "destination-1" });
  });

  it("treats a duplicate-star conflict as an idempotent success", async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: "23505" } });
    supabaseMock.from.mockReturnValue({ insert });

    await expect(addStar("destination-1")).resolves.toBeUndefined();
  });

  it("removes the matching destination star through Supabase", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const deleteQuery = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ delete: deleteQuery });

    await removeStar("destination-1");

    expect(supabaseMock.from).toHaveBeenCalledWith("stars");
    expect(deleteQuery).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith("destination_id", "destination-1");
  });

  it("gives clear setup guidance for a missing stars table", () => {
    expect(getStarErrorMessage({ code: "PGRST205" })).toContain("Run the stars migration in Supabase");
  });

  it("explains row-level security failures without exposing database details", () => {
    expect(getStarErrorMessage({ code: "42501", message: "row-level security policy" }))
      .toContain("Check that you are signed in");
  });
});
