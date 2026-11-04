// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import DestinationTrackerPage from "./DestinationTrackerPage";
import type { Destination } from "../lib/destinations";

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
  saveNotes: vi.fn(),
  uploadPhoto: vi.fn(),
  removePhoto: vi.fn(),
  remove: vi.fn(),
  toggleStar: vi.fn(),
}));

vi.mock("../hooks/useDestinationTracker", () => ({
  useDestinationTracker: () => tracker,
}));

function renderPage(path = "/destinations", state?: Record<string, boolean>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <DestinationTrackerPage />
    </MemoryRouter>,
  );
}

function makeDestination(
  id: string,
  name: string,
  countryId: string,
  countryName: string,
  status: "visited" | "wishlist",
  createdAt: string,
): Destination {
  return {
    id,
    name,
    countryId,
    countryName,
    status,
    visitDate: null,
    rating: null,
    notes: null,
    photoUrl: null,
    createdAt,
  };
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
    tracker.saveNotes.mockResolvedValue(undefined);
    tracker.uploadPhoto.mockResolvedValue({ displayUrl: "https://signed.example/photo.jpg", cleanupWarning: false });
    tracker.removePhoto.mockResolvedValue({ displayUrl: undefined, cleanupWarning: false });
    vi.clearAllMocks();
  });

  it("opens the existing add form when launched from the dashboard", () => {
    renderPage("/destinations", { openCreateDestination: true });

    expect(screen.getByRole("dialog", { name: "Where have you been?" })).toBeTruthy();
    expect(screen.getByLabelText(/place name/i)).toBeTruthy();
  });

  it("creates a destination with a new country and optional details", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /add a place/i }));
    await user.type(screen.getByLabelText(/place name/i), "Kyoto");
    await user.selectOptions(within(screen.getByRole("dialog")).getByLabelText(/country/i), "new");
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

  it("shows field errors and preserves blank create values without saving", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /add a place/i }));
    const nameInput = screen.getByLabelText(/place name/i) as HTMLInputElement;
    await user.type(nameInput, "   ");
    await user.selectOptions(within(screen.getByRole("dialog")).getByLabelText(/^Country/), "new");
    const newCountryInput = screen.getByLabelText("New country name") as HTMLInputElement;
    await user.type(newCountryInput, "   ");
    await user.click(screen.getByRole("button", { name: /add to my places/i }));

    expect(tracker.create).not.toHaveBeenCalled();
    expect(screen.getByText("Add a name for this destination.")).toBeTruthy();
    expect(screen.getByText("Enter a country name.")).toBeTruthy();
    expect(nameInput.value).toBe("   ");
    expect(newCountryInput.value).toBe("   ");
    expect(nameInput.getAttribute("aria-invalid")).toBe("true");
    expect(newCountryInput.getAttribute("aria-invalid")).toBe("true");
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

  it("blocks invalid edits and keeps the entered values in the form", async () => {
    const user = userEvent.setup();
    tracker.destinations = [{
      id: "destination-1",
      countryId: "country-jp",
      countryName: "Japan",
      name: "Kyoto",
      status: "wishlist",
      visitDate: null,
      rating: 4,
      notes: null,
      photoUrl: null,
      createdAt: "2025-03-01T12:00:00Z",
    }];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Edit Kyoto" }));
    const nameInput = screen.getByLabelText(/place name/i) as HTMLInputElement;
    const countryInput = within(screen.getByRole("dialog")).getByLabelText(/^Country/) as HTMLSelectElement;
    await user.clear(nameInput);
    await user.type(nameInput, "  ");
    await user.selectOptions(countryInput, "");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(tracker.update).not.toHaveBeenCalled();
    expect(screen.getByText("Add a name for this destination.")).toBeTruthy();
    expect(screen.getByText("Choose a country from the list.")).toBeTruthy();
    expect(nameInput.value).toBe("  ");
    expect(countryInput.value).toBe("");
  });

  it("saves new travel notes without submitting the destination form", async () => {
    const user = userEvent.setup();
    tracker.destinations = [makeDestination("destination-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z")];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Travel notes for Kyoto" }));
    expect(screen.getByRole("heading", { name: "No notes yet." })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Write Notes" }));
    await user.type(screen.getByLabelText("Write your memories or ideas"), "Morning walk through Gion.");
    await user.click(screen.getByRole("button", { name: "Save Notes" }));

    await waitFor(() => expect(tracker.saveNotes).toHaveBeenCalledWith("destination-1", "Morning walk through Gion."));
    expect(tracker.update).not.toHaveBeenCalled();
  });

  it("loads existing notes for editing and saves the revised text", async () => {
    const user = userEvent.setup();
    const destination = makeDestination("destination-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z");
    destination.notes = "Quiet morning streets.";
    tracker.destinations = [destination];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Travel notes for Kyoto" }));
    expect(within(screen.getByRole("dialog")).getByText("Quiet morning streets.")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Edit Notes" }));
    const notes = screen.getByLabelText("Write your memories or ideas") as HTMLTextAreaElement;
    await user.clear(notes);
    await user.type(notes, "Tea near the river.");
    await user.click(screen.getByRole("button", { name: "Save Notes" }));

    await waitFor(() => expect(tracker.saveNotes).toHaveBeenCalledWith("destination-1", "Tea near the river."));
    expect(tracker.update).not.toHaveBeenCalled();
  });

  it("preserves paragraphs and line breaks while editing notes", async () => {
    const user = userEvent.setup();
    tracker.destinations = [makeDestination("destination-1", "Kyoto", "country-jp", "Japan", "wishlist", "2025-03-01T12:00:00Z")];
    const multiline = "Visit the quiet gardens.\n\nTry the tea house near the river.";
    renderPage();

    await user.click(screen.getByRole("button", { name: "Travel notes for Kyoto" }));
    await user.click(screen.getByRole("button", { name: "Write Notes" }));
    const notes = screen.getByLabelText("Write your memories or ideas") as HTMLTextAreaElement;
    await user.type(notes, multiline);

    expect(notes.value).toBe(multiline);
    await user.click(screen.getByRole("button", { name: "Save Notes" }));
    await waitFor(() => expect(tracker.saveNotes).toHaveBeenCalledWith("destination-1", multiline));
  });

  it("allows empty notes and shows a friendly empty state", async () => {
    const user = userEvent.setup();
    tracker.destinations = [makeDestination("destination-1", "Kyoto", "country-jp", "Japan", "wishlist", "2025-03-01T12:00:00Z")];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Travel notes for Kyoto" }));
    expect(screen.getByRole("heading", { name: "No notes yet." })).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Write Notes" }));
    await user.click(screen.getByRole("button", { name: "Save Notes" }));

    await waitFor(() => expect(tracker.saveNotes).toHaveBeenCalledWith("destination-1", ""));
  });

  it("shows uploaded photos in the destination detail view", async () => {
    const user = userEvent.setup();
    const destination = makeDestination("destination-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z");
    destination.photoUrl = "user-123/destination-1/photo.jpg";
    destination.photoDisplayUrl = "https://signed.example/photo.jpg";
    tracker.destinations = [destination];
    renderPage();

    await user.click(screen.getByRole("button", { name: "Travel notes for Kyoto" }));

    const photo = screen.getByAltText("Kyoto travel memory") as HTMLImageElement;
    expect(photo.src).toBe("https://signed.example/photo.jpg");
    expect(screen.getByRole("heading", { name: "Destination photo" })).toBeTruthy();
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

  it("searches destination names through the My Destinations controls", async () => {
    const user = userEvent.setup();
    tracker.destinations = [
      makeDestination("d-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z"),
      makeDestination("d-2", "Lisbon", "country-pt", "Portugal", "wishlist", "2025-03-02T12:00:00Z"),
    ];
    tracker.countries = [
      { id: "country-jp", name: "Japan" },
      { id: "country-pt", name: "Portugal" },
    ];
    renderPage();

    await user.type(screen.getByRole("searchbox", { name: "Search destination names" }), "lis");

    expect(screen.getByRole("heading", { name: "Lisbon", level: 3 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Kyoto", level: 3 })).toBeNull();
  });

  it("combines country, status, and name search controls", async () => {
    const user = userEvent.setup();
    tracker.destinations = [
      makeDestination("d-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z"),
      makeDestination("d-2", "Tokyo", "country-jp", "Japan", "wishlist", "2025-03-02T12:00:00Z"),
      makeDestination("d-3", "Lisbon", "country-pt", "Portugal", "wishlist", "2025-03-03T12:00:00Z"),
    ];
    tracker.countries = [
      { id: "country-jp", name: "Japan" },
      { id: "country-pt", name: "Portugal" },
    ];
    renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by country" }), "country-jp");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by visit status" }), "wishlist");
    await user.type(screen.getByRole("searchbox", { name: "Search destination names" }), "tok");

    expect(screen.getByRole("heading", { name: "Tokyo", level: 3 })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Kyoto", level: 3 })).toBeNull();
    expect(screen.queryByRole("heading", { name: "Lisbon", level: 3 })).toBeNull();
  });

  it("sorts the displayed destinations using the selected sort mode", async () => {
    const user = userEvent.setup();
    tracker.destinations = [
      makeDestination("d-1", "Tokyo", "country-jp", "Japan", "visited", "2025-03-03T12:00:00Z"),
      makeDestination("d-2", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z"),
      makeDestination("d-3", "Osaka", "country-jp", "Japan", "visited", "2025-03-02T12:00:00Z"),
    ];
    renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort destinations" }), "name-asc");

    const visibleNames = Array.from(document.querySelectorAll(".destination-grid h3"))
      .map((heading) => heading.textContent);
    expect(visibleNames).toEqual(["Kyoto", "Osaka", "Tokyo"]);
  });

  it("clears all controls back to the default destination list", async () => {
    const user = userEvent.setup();
    tracker.destinations = [
      makeDestination("d-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z"),
      makeDestination("d-2", "Tokyo", "country-jp", "Japan", "wishlist", "2025-03-02T12:00:00Z"),
    ];
    tracker.countries = [{ id: "country-jp", name: "Japan" }];
    renderPage();

    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by country" }), "country-jp");
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter by visit status" }), "visited");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort destinations" }), "name-asc");
    await user.type(screen.getByRole("searchbox", { name: "Search destination names" }), "kyo");
    await user.click(screen.getByRole("button", { name: /clear filters/i }));

    expect((screen.getByRole("searchbox", { name: "Search destination names" }) as HTMLInputElement).value).toBe("");
    expect((screen.getByRole("combobox", { name: "Filter by country" }) as HTMLSelectElement).value).toBe("");
    expect((screen.getByRole("combobox", { name: "Filter by visit status" }) as HTMLSelectElement).value).toBe("all");
    expect((screen.getByRole("combobox", { name: "Sort destinations" }) as HTMLSelectElement).value).toBe("newest");
    expect(screen.getByRole("heading", { name: "Tokyo", level: 3 })).toBeTruthy();
  });

  it("shows a helpful message when no destinations match", async () => {
    const user = userEvent.setup();
    tracker.destinations = [
      makeDestination("d-1", "Kyoto", "country-jp", "Japan", "visited", "2025-03-01T12:00:00Z"),
    ];
    renderPage();

    await user.type(screen.getByRole("searchbox", { name: "Search destination names" }), "Reykjavik");

    expect(screen.getByRole("heading", { name: "No places found this time." })).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Kyoto", level: 3 })).toBeNull();
  });
});
