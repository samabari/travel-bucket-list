import { describe, expect, it } from "vitest";
import { isValidDateOnly, validateDestinationDraft } from "./destination-validation";

const countryIds = ["country-jp"];

function validDraft() {
  return {
    name: "Kyoto",
    countryChoice: "country-jp",
    newCountry: "",
    visitDate: "2024-04-12",
    rating: "8.5",
    photoUrl: "https://images.example/kyoto.jpg",
  };
}

describe("destination input validation", () => {
  it("rejects blank and whitespace-only required fields", () => {
    const errors = validateDestinationDraft({
      ...validDraft(),
      name: " \t ",
      countryChoice: "",
    }, countryIds);

    expect(errors.name).toBe("Add a name for this destination.");
    expect(errors.countryChoice).toBe("Choose a country from the list.");
  });

  it("requires a non-blank name when adding a new country", () => {
    const errors = validateDestinationDraft({
      ...validDraft(),
      countryChoice: "new",
      newCountry: "   ",
    }, countryIds);

    expect(errors.newCountry).toBe("Enter a country name.");
  });

  it("accepts valid dates and rejects impossible calendar dates", () => {
    expect(isValidDateOnly("2024-02-29")).toBe(true);
    expect(isValidDateOnly("2023-02-29")).toBe(false);
    expect(isValidDateOnly("2024-13-01")).toBe(false);
    expect(isValidDateOnly("04/12/2024")).toBe(false);
  });

  it("rejects non-numeric and non-finite ratings while accepting decimals", () => {
    expect(validateDestinationDraft({ ...validDraft(), rating: "great" }).rating).toBeTruthy();
    expect(validateDestinationDraft({ ...validDraft(), rating: "1e999" }).rating).toBeTruthy();
    expect(validateDestinationDraft({ ...validDraft(), rating: "8.5" }).rating).toBeUndefined();
  });

  it("rejects invalid photo links but accepts stored private photo paths", () => {
    expect(validateDestinationDraft({ ...validDraft(), photoUrl: "javascript:alert(1)" }).photoUrl).toBeTruthy();
    expect(validateDestinationDraft({
      ...validDraft(),
      photoUrl: "user-123/destination-456/photo.jpg",
      photoUrlIsStored: true,
    }).photoUrl).toBeUndefined();
  });

  it("accepts a valid destination with optional fields left blank", () => {
    const errors = validateDestinationDraft({
      ...validDraft(),
      countryChoice: "country-jp",
      visitDate: "",
      rating: "",
      photoUrl: "",
    }, countryIds);

    expect(errors).toEqual({});
  });
});
