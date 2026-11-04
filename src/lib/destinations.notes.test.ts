import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateDestinationNotes } from "./destinations";

const supabaseMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("./supabase", () => ({ supabase: supabaseMock }));

describe("destination travel notes persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeUpdateChain() {
    const single = vi.fn().mockResolvedValue({ data: { id: "destination-1" }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ update });
    return { update, eq, select, single };
  }

  it("updates only the notes column on the matching destination", async () => {
    const { update, eq, select } = makeUpdateChain();
    const multiline = "A quiet walk before breakfast.\n\nReturn for the spring gardens.";

    await updateDestinationNotes("destination-1", multiline);

    expect(supabaseMock.from).toHaveBeenCalledWith("destinations");
    expect(update).toHaveBeenCalledWith({ notes: multiline });
    expect(eq).toHaveBeenCalledWith("id", "destination-1");
    expect(select).toHaveBeenCalledWith("id");
  });

  it("stores blank notes as null while preserving nonblank text", async () => {
    const { update } = makeUpdateChain();

    await updateDestinationNotes("destination-1", "  \n  ");

    expect(update).toHaveBeenCalledWith({ notes: null });
  });
});
