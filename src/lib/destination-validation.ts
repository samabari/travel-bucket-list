export type DestinationValidationField =
  | "name"
  | "countryChoice"
  | "newCountry"
  | "visitDate"
  | "rating"
  | "photoUrl";

export type DestinationValidationErrors = Partial<
  Record<DestinationValidationField, string>
>;

export interface DestinationValidationValues {
  name: string;
  countryChoice: string;
  newCountry: string;
  visitDate: string | null;
  rating: string | number | null;
  photoUrl: string | null;
  photoUrlIsStored?: boolean;
}

export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isValidNumericValue(value: string | number): boolean {
  if (typeof value === "number") return Number.isFinite(value);

  const normalized = value.trim();
  if (!normalized || !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalized)) {
    return false;
  }

  return Number.isFinite(Number(normalized));
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
}

export function validateDestinationDraft(
  values: DestinationValidationValues,
  availableCountryIds?: readonly string[],
): DestinationValidationErrors {
  const errors: DestinationValidationErrors = {};

  if (!values.name.trim()) {
    errors.name = "Add a name for this destination.";
  }

  if (values.countryChoice === "new") {
    if (!values.newCountry.trim()) {
      errors.newCountry = "Enter a country name.";
    }
  } else if (
    !values.countryChoice.trim()
    || (availableCountryIds && !availableCountryIds.includes(values.countryChoice))
  ) {
    errors.countryChoice = "Choose a country from the list.";
  }

  const visitDate = values.visitDate?.trim() ?? "";
  if (visitDate && !isValidDateOnly(visitDate)) {
    errors.visitDate = "Enter a valid calendar date.";
  }

  const ratingIsEmpty = values.rating === null
    || (typeof values.rating === "string" && !values.rating.trim());
  if (!ratingIsEmpty && !isValidNumericValue(values.rating as string | number)) {
    errors.rating = "Enter a valid number for your rating, or leave it blank.";
  }

  const photoUrl = values.photoUrl?.trim() ?? "";
  if (photoUrl && !values.photoUrlIsStored && !isValidHttpUrl(photoUrl)) {
    errors.photoUrl = "Use a complete photo link beginning with http:// or https://.";
  }

  return errors;
}
