import { supabase } from "./supabase";

export type DestinationStatus = "visited" | "wishlist";

export interface Country {
  id: string;
  name: string;
}

export interface Destination {
  id: string;
  countryId: string;
  countryName: string;
  name: string;
  status: DestinationStatus;
  visitDate: string | null;
  rating: number | null;
  notes: string | null;
  photoUrl: string | null;
  createdAt: string;
}

export type CountryChoice =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string };

export interface DestinationInput {
  name: string;
  country: CountryChoice;
  status: DestinationStatus;
  visitDate: string | null;
  rating: number | null;
  notes: string | null;
  photoUrl: string | null;
}

interface DestinationRow {
  id: string;
  country_id: string;
  name: string;
  status: DestinationStatus;
  visit_date: string | null;
  rating: number | string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured. Add your project URL and public key in Replit Secrets.");
  }
  return supabase;
}

export function getDestinationErrorMessage(error: unknown): string {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : {};
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";

  if (code === "42P01" || code === "PGRST205" || message.includes("schema cache")) {
    return "The destination tables are not set up yet. Run the countries and destinations migration in Supabase.";
  }
  if (code === "23505") {
    return "That country already exists in your list. Select it instead of adding it again.";
  }
  if (code === "23503") {
    return "That country is no longer available. Refresh the page and choose one of your countries.";
  }
  if (code === "42501" || message.includes("row-level security")) {
    return "Supabase could not save this record for your account. Check that you are signed in and the table policies are installed.";
  }
  if (code === "PGRST116") {
    return "This destination is no longer available. Refresh your list and try again.";
  }
  return "We couldn't complete that destination update. Please try again.";
}

function throwFriendly(error: unknown): never {
  throw new Error(getDestinationErrorMessage(error));
}

export function getStarErrorMessage(error: unknown): string {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : {};
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";

  if (code === "42P01" || code === "PGRST205" || message.includes("schema cache")) {
    return "Starred destinations are not set up yet. Run the stars migration in Supabase.";
  }
  if (code === "42501" || message.includes("row-level security")) {
    return "Supabase could not update your stars. Check that you are signed in and the stars policies are installed.";
  }
  if (code === "23503") {
    return "That destination is no longer available. Refresh your list and try again.";
  }
  return "We couldn't update your starred destinations. Please try again.";
}

function throwStarError(error: unknown): never {
  throw new Error(getStarErrorMessage(error));
}

export async function listCountries(): Promise<Country[]> {
  const { data, error } = await getClient()
    .from("countries")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throwFriendly(error);
  return (data ?? []) as Country[];
}

export async function listDestinations(): Promise<Destination[]> {
  const client = getClient();
  const [countryResult, destinationResult] = await Promise.all([
    client.from("countries").select("id, name").order("name", { ascending: true }),
    client
      .from("destinations")
      .select("id, country_id, name, status, visit_date, rating, notes, photo_url, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (countryResult.error) throwFriendly(countryResult.error);
  if (destinationResult.error) throwFriendly(destinationResult.error);

  const countries = (countryResult.data ?? []) as Country[];
  const countryNames = new Map(countries.map((country) => [country.id, country.name]));
  const rows = (destinationResult.data ?? []) as DestinationRow[];

  return rows.map((row) => ({
    id: row.id,
    countryId: row.country_id,
    countryName: countryNames.get(row.country_id) ?? "Country unavailable",
    name: row.name,
    status: row.status,
    visitDate: row.visit_date,
    rating: row.rating === null ? null : Number(row.rating),
    notes: row.notes,
    photoUrl: row.photo_url,
    createdAt: row.created_at,
  }));
}

export async function listStarredDestinationIds(): Promise<string[]> {
  const { data, error } = await getClient()
    .from("stars")
    .select("destination_id");
  if (error) throwStarError(error);
  return (data ?? []).map((row) => row.destination_id as string);
}

export async function addStar(destinationId: string): Promise<void> {
  const { error } = await getClient()
    .from("stars")
    .insert({ destination_id: destinationId });
  // The database unique constraint makes an already-existing star idempotent.
  if (error && error.code === "23505") return;
  if (error) throwStarError(error);
}

export async function removeStar(destinationId: string): Promise<void> {
  const { error } = await getClient()
    .from("stars")
    .delete()
    .eq("destination_id", destinationId);
  if (error) throwStarError(error);
}

async function resolveCountry(choice: CountryChoice): Promise<string> {
  if (choice.kind === "existing") return choice.id;

  const name = choice.name.trim();
  if (!name) throw new Error("Enter a country name.");

  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const existingCountries = await listCountries();
  const existing = existingCountries.find((country) => normalize(country.name) === normalize(name));
  if (existing) return existing.id;

  const { data, error } = await getClient()
    .from("countries")
    .insert({ name })
    .select("id, name")
    .single();

  if (!error && data) return (data as Country).id;

  // A concurrent create may have inserted the same case-insensitive country name.
  if (error && error.code === "23505") {
    const refreshed = await listCountries();
    const matchingCountry = refreshed.find((country) => normalize(country.name) === normalize(name));
    if (matchingCountry) return matchingCountry.id;
  }
  throwFriendly(error);
}

function toDatabaseValues(input: DestinationInput, countryId: string) {
  return {
    name: input.name.trim(),
    country_id: countryId,
    status: input.status,
    visit_date: input.visitDate || null,
    rating: input.rating,
    notes: input.notes?.trim() || null,
    photo_url: input.photoUrl?.trim() || null,
  };
}

export async function createDestination(input: DestinationInput): Promise<void> {
  const countryId = await resolveCountry(input.country);
  const { error } = await getClient()
    .from("destinations")
    .insert(toDatabaseValues(input, countryId));
  if (error) throwFriendly(error);
}

export async function updateDestination(id: string, input: DestinationInput): Promise<void> {
  const countryId = await resolveCountry(input.country);
  const { error } = await getClient()
    .from("destinations")
    .update(toDatabaseValues(input, countryId))
    .eq("id", id)
    .select("id")
    .single();
  if (error) throwFriendly(error);
}

export async function updateDestinationNotes(id: string, notes: string): Promise<void> {
  const normalizedNotes = notes.trim() ? notes : null;
  const { error } = await getClient()
    .from("destinations")
    .update({ notes: normalizedNotes })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throwFriendly(error);
}

export async function deleteDestination(id: string): Promise<void> {
  const { error } = await getClient()
    .from("destinations")
    .delete()
    .eq("id", id)
    .select("id")
    .single();
  if (error) throwFriendly(error);
}
