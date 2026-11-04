// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DestinationTrackerPage from "./DestinationTrackerPage";

const tracker = vi.hoisted(() => ({
  countries: [] as { id: string; name: string }[],
  destinations: [] as {
    id: string;
    countryId: string;
    countryName: string;
    name: string;
    status: "visited" | "wishlist";
    visitDate: string | null;
    rating: number | null;
    notes: string | null;
    photoUrl: string | null;
    createdAt: string;
  }[],
  loading: false,
  error: "",
  starredDestinationIds: new Set<string>(),
  starsLoading: false,
  starsError: "",
  pendingStarIds: new Set<string>(),
  reload: vi.fn(),
  reloadStars: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toggleStar: vi.fn(),
}));

vi.mock("../hooks/useDestinationTracker", () => ({
  useDestinationTracker: () => tracker,
}));

function renderPage(path = "/destinations") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DestinationTrackerPage />
    </MemoryRouter>,
  );
}

describe("DestinationTrackerPage", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    tracker.countries = [{ id: "country-jp", name: "Japan" }];
    tracker.destinations = [];
    tracker.loading = false;
    tracker.error = "";
    tracker.starredDestinationIds = new Set();
    tracker.starsLoading = false;
    tracker.starsError = "";
    tracker.pendingStarIds = new Set();
    vi.clearAllMocks();
  });

  it("creates a destination with a new country and optional details", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /add a place/i }));
    await user.type(screen.getByLabelText(/place name/i), "Kyoto");
    await user.selectOptions(screen.getByLabelText(/country/i), "new");
    await user.type(screen.getByLabelText(/new country name/i), "Japan");
    await user.click(screen.getByRole("radio", { name: /been there/i }));
    await user.type(screen.getByLabelText(/when did you go/i), "2024-04-12");
    await user.type(screen.getByLabelText(/personal rating/i), "8.5");
    await user.type(screen.getByLabelText(/a few words to remember it by/i), "Quiet morning streets.");
    await user.type(screen.getByLabelText(/photo link/i), "https://images.example/kyoto.jpg");
    await user.click(screen.getByRole("button", { name: /add to my places/i }));

    await waitFor(() => expect(tracker.create).toHaveBeenCalledWith({
      name: "Kyoto",
      country: { kind: "new", name: "Japan" },
      status: "visited",
      visitDate: "2024-04-12",
      rating: 8.5,
      notes: "Quiet morning streets.",
      photoUrl: "https://images.example/kyoto.jpg",
    }));
  });

  it("edits an existing destination", async () => {
    const user = userEvent.setup();
    tracker.destinations = [{
      id: "destination-1",
      countryId: "country-jp",
      countryName: "Japan",
      name: "Kyoto",
      status: "wishlist",
      visitDate: null,
      rating: null,
      notes: null,
      photoUrl: null,
      createdAt: "2025-03-01T12:00:00Z",
    }];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Kyoto" }));
    const nameInput = screen.getByLabelText(/place name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Kyoto, Japan");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(tracker.update).toHaveBeenCalledWith("destination-1", {
      name: "Kyoto, Japan",
      country: { kind: "existing", id: "country-jp" },
      status: "wishlist",
      visitDate: null,
      rating: null,
      notes: null,
      photoUrl: null,
    }));
  });

  it("requires confirmation before deleting a destination", async () => {
    const user = userEvent.setup();
    tracker.destinations = [{
      id: "destination-1",
      countryId: "country-jp",
      countryName: "Japan",
      name: "Kyoto",
      status: "visited",
      visitDate: null,
      rating: null,
      notes: null,
      photoUrl: null,
      createdAt: "2025-03-01T12:00:00Z",
    }];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete Kyoto" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(tracker.remove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /remove place/i }));
    await waitFor(() => expect(tracker.remove).toHaveBeenCalledWith("destination-1"));
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    tracker.destinations = [{
      id: "destination-1",
      countryId: "country-jp",
      countryName: "Japan",
      name: "Kyoto",
      status: "visited",
      visitDate: null,
      rating: null,
      notes: null,
      photoUrl: null,
      createdAt: "2025-03-01T12:00:00Z",
    }];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Delete Kyoto" }));
    await user.click(screen.getByRole("button", { name: /keep this place/i }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(tracker.remove).not.toHaveBeenCalled();
  });

  it("shows a friendly empty state when there are no saved destinations", () => {
    renderPage();
    expect(screen.getByText("The first page is waiting.")).toBeTruthy();
    expect(screen.getByText("Somewhere on your mind?")).toBeTruthy();
  });

  it("shows database setup guidance when destination tables are missing", () => {
    tracker.error = "The destination tables are not set up yet. Run the countries and destinations migration in Supabase.";
    renderPage();

    expect(screen.getByRole("alert").textContent).toContain("Run the countries and destinations migration");
  });

  it("toggles a destination star from its card", async () => {
    const user = userEvent.setup();
    tracker.destinations = [{
      id: "destination-1",
      countryId: "country-jp",
      countryName: "Japan",
      name: "Kyoto",
      status: "visited",
      visitDate: null,
      rating: null,
      notes: null,
      photoUrl: null,
      createdAt: "2025-03-01T12:00:00Z",
    }];
    renderPage();

    const starButton = screen.getByRole("button", { name: "Star Kyoto" });
    expect(starButton.getAttribute("aria-pressed")).toBe("false");
    await user.click(starButton);

    expect(tracker.toggleStar).toHaveBeenCalledWith("destination-1");
  });

  it("shows only starred destinations in the starred view", () => {
    tracker.destinations = [
      {
        id: "destination-1",
        countryId: "country-jp",
        countryName: "Japan",
        name: "Kyoto",
        status: "visited",
        visitDate: null,
        rating: null,
        notes: null,
        photoUrl: null,
        createdAt: "2025-03-01T12:00:00Z",
      },
      {
        id: "destination-2",
        countryId: "country-jp",
        countryName: "Japan",
        name: "Osaka",
        status: "wishlist",
        visitDate: null,
        rating: null,
        notes: null,
        photoUrl: null,
        createdAt: "2025-03-02T12:00:00Z",
      },
    ];
    tracker.starredDestinationIds = new Set(["destination-1"]);
    renderPage("/starred");

    expect(screen.getByRole("heading", { name: "Kyoto", level: 3 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Osaka", level: 3 })).toBeNull();
  });

  it("shows a dedicated empty state when there are no starred places", () => {
    renderPage("/starred");
    expect(screen.getByRole("heading", { name: "Nothing starred just yet." })).toBeTruthy();
    expect(screen.getByRole("link", { name: /browse my destinations/i })).toBeTruthy();
  });

  it("does not mistake a stars migration error for an empty starred list", () => {
    tracker.starsError = "Starred destinations are not set up yet. Run the stars migration in Supabase.";
    renderPage("/starred");

    expect(screen.getByRole("alert").textContent).toContain("Run the stars migration");
    expect(screen.queryByRole("heading", { name: "Nothing starred just yet." })).toBeNull();
  });
});
