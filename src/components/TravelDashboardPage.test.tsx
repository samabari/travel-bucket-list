// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { Destination } from "../lib/destinations";
import TravelDashboardPage from "./TravelDashboardPage";

const tracker = vi.hoisted(() => ({
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
  reload: vi.fn(),
}));

vi.mock("../hooks/useDestinationTracker", () => ({
  useDestinationTracker: () => tracker,
}));

function makeDestination(id: string, countryId: string, status: Destination["status"]): Destination {
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

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <TravelDashboardPage />
    </MemoryRouter>,
  );
}

describe("TravelDashboardPage", () => {
  beforeEach(() => {
    tracker.destinations = [
      makeDestination("1", "JP", "visited"),
      makeDestination("2", "JP", "visited"),
      makeDestination("3", "PT", "visited"),
      makeDestination("4", "IT", "wishlist"),
      makeDestination("5", "IT", "wishlist"),
    ];
    tracker.loading = false;
    tracker.error = "";
    tracker.reload.mockReset();
  });

  afterEach(cleanup);

  it("shows accurate statistics and a labeled visited-versus-wishlist chart", () => {
    renderPage();

    const statistics = screen.getByRole("region", { name: "Travel statistics" });
    expect(within(statistics).getByText("5")).toBeTruthy();
    const visitedStat = within(statistics).getByText("Visited", { exact: true }).closest("article");
    expect(visitedStat && within(visitedStat).getByText("3")).toBeTruthy();
    const countriesStat = within(statistics).getByText("Countries", { exact: true }).closest("article");
    expect(countriesStat && within(countriesStat).getByText("3")).toBeTruthy();
    expect(
      screen.getByRole("img", {
        name: "Comparison of your saved destinations: 3 visited and 2 on your wishlist.",
      }),
    ).toBeTruthy();
  });

  it("shows an inviting empty state when there are no destinations", () => {
    tracker.destinations = [];
    renderPage();

    expect(screen.getByRole("heading", { name: "Your first place is waiting." })).toBeTruthy();
    expect(screen.getByRole("link", { name: /add your first destination/i }).getAttribute("href")).toBe("/destinations");
  });

  it("shows loading and retryable error states", async () => {
    tracker.loading = true;
    const { rerender } = renderPage();
    expect(screen.getByLabelText("Loading your travel history")).toBeTruthy();

    tracker.loading = false;
    tracker.error = "Could not load destinations.";
    rerender(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <TravelDashboardPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(tracker.reload).toHaveBeenCalledTimes(1);
  });
});
