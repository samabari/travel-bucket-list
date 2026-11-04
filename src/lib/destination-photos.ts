import { supabase } from "./supabase";

export const DESTINATION_PHOTO_BUCKET = "destination-photos";
export const MAX_DESTINATION_PHOTO_BYTES = 5 * 1024 * 1024;
export const DESTINATION_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const fileExtensions: Record<(typeof DESTINATION_PHOTO_MIME_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export interface DestinationPhotoMutationResult {
  displayUrl?: string;
  cleanupWarning: boolean;
}

export type DestinationPhotoFailureStage =
  | "authenticated user lookup"
  | "destination ownership check"
  | "storage upload"
  | "private photo URL signing"
  | "destinations.photo_url update"
  | "old photo cleanup"
  | "photo reference removal"
  | "stored photo removal";

export class DestinationPhotoOperationError extends Error {
  constructor(
    readonly stage: DestinationPhotoFailureStage,
    message: string,
    readonly supabaseCode: string | null = null,
    readonly supabaseMessage: string | null = null,
  ) {
    super(message);
    this.name = "DestinationPhotoOperationError";
  }
}

function throwSupabasePhotoError(stage: DestinationPhotoFailureStage, error: unknown): never {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : {};
  const code = typeof record.code === "string" ? record.code : null;
  const message = typeof record.message === "string" ? record.message : "Unknown Supabase error";

  console.error(`[destination-photo] ${stage} failed`, { code, message });
  throw new DestinationPhotoOperationError(
    stage,
    getDestinationPhotoErrorMessage(error),
    code,
    message,
  );
}

function logCleanupError(stage: "old photo cleanup" | "stored photo removal", error: unknown) {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : {};
  console.error(`[destination-photo] ${stage} failed`, {
    code: typeof record.code === "string" ? record.code : null,
    message: typeof record.message === "string" ? record.message : "Unknown Supabase error",
  });
}

export function validateDestinationPhoto(file: Pick<File, "type" | "size">): string | null {
  const type = file.type.toLowerCase();
  if (!DESTINATION_PHOTO_MIME_TYPES.includes(type as (typeof DESTINATION_PHOTO_MIME_TYPES)[number])) {
    return "Choose a JPG, PNG, or WebP image.";
  }
  if (file.size <= 0) {
    return "That image file is empty. Choose another one.";
  }
  if (file.size > MAX_DESTINATION_PHOTO_BYTES) {
    return "That image is larger than 5 MB. Choose a smaller one.";
  }
  return null;
}

export function isStoredDestinationPhoto(value: string | null): value is string {
  if (!value || /^https?:\/\//i.test(value)) return false;
  const parts = value.split("/");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function getDestinationPhotoErrorMessage(error: unknown): string {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown; statusCode?: unknown; status?: unknown }
    : {};
  const code = typeof record.code === "string" ? record.code.toLowerCase() : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  const status = Number(record.statusCode ?? record.status ?? 0);

  if (message.includes("not configured")) {
    return "Photo uploads are unavailable because Supabase is not configured.";
  }
  if (
    code === "42501"
    || status === 401
    || status === 403
    || message.includes("row-level security")
    || message.includes("permission denied")
    || message.includes("not authorized")
  ) {
    return "You don’t have permission to change this destination’s photo. Check that you’re signed in and try again.";
  }
  if (
    code.includes("bucketnotfound")
    || (message.includes("bucket") && message.includes("not found"))
    || status === 404
  ) {
    return "Photo storage is not set up yet. Run the destination photos migration in Supabase.";
  }
  if (code === "pgrst116") {
    return "This destination is no longer available. Refresh your list and try again.";
  }
  return "We couldn’t complete that photo change. Please try again.";
}

function getClient() {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  return supabase;
}

export async function resolveDestinationPhotoUrl(photoValue: string | null): Promise<string | null> {
  if (!photoValue) return null;
  if (/^https?:\/\//i.test(photoValue)) return photoValue;
  if (!isStoredDestinationPhoto(photoValue)) return null;

  const { data, error } = await getClient()
    .storage
    .from(DESTINATION_PHOTO_BUCKET)
    .createSignedUrl(photoValue, 60 * 60);
  if (error) throwSupabasePhotoError("private photo URL signing", error);
  return data.signedUrl;
}

function getStoragePath(userId: string, destinationId: string, file: File): string {
  const extension = fileExtensions[file.type.toLowerCase() as keyof typeof fileExtensions];
  return `${userId}/${destinationId}/${crypto.randomUUID()}.${extension}`;
}

export async function uploadDestinationPhoto(
  destinationId: string,
  file: File,
  previousPhotoValue: string | null,
): Promise<DestinationPhotoMutationResult> {
  const validationError = validateDestinationPhoto(file);
  if (validationError) throw new Error(validationError);

  const client = getClient();
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError || !authData.user?.id) {
    if (authError) throwSupabasePhotoError("authenticated user lookup", authError);
    throw new Error("Sign in again before uploading a destination photo.");
  }

  const userId = authData.user.id;
  const { data: ownedDestination, error: ownershipError } = await client
    .from("destinations")
    .select("id")
    .eq("id", destinationId)
    .eq("user_id", userId)
    .maybeSingle();
  if (ownershipError) throwSupabasePhotoError("destination ownership check", ownershipError);
  if (!ownedDestination) {
    throw new DestinationPhotoOperationError(
      "destination ownership check",
      "This destination isn’t available in your account. Refresh your list and try again.",
    );
  }

  const path = getStoragePath(userId, destinationId, file);
  const bucket = client.storage.from(DESTINATION_PHOTO_BUCKET);
  const { error: uploadError } = await bucket.upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throwSupabasePhotoError("storage upload", uploadError);

  let displayUrl: string;
  try {
    displayUrl = (await resolveDestinationPhotoUrl(path)) ?? "";
    if (!displayUrl) throw new Error("A secure photo preview could not be created.");
  } catch (cause) {
    const { error } = await bucket.remove([path]);
    if (error) logCleanupError("stored photo removal", error);
    throw cause;
  }

  const { data: updatedDestination, error: databaseError } = await client
    .from("destinations")
    .update({ photo_url: path })
    .eq("id", destinationId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (databaseError) {
    const { error } = await bucket.remove([path]);
    if (error) logCleanupError("stored photo removal", error);
    throwSupabasePhotoError("destinations.photo_url update", databaseError);
  }
  if (!updatedDestination) {
    const { error } = await bucket.remove([path]);
    if (error) logCleanupError("stored photo removal", error);
    throw new DestinationPhotoOperationError(
      "destinations.photo_url update",
      "This destination isn’t available in your account. Refresh your list and try again.",
    );
  }

  let cleanupWarning = false;
  if (isStoredDestinationPhoto(previousPhotoValue) && previousPhotoValue !== path) {
    const { error } = await bucket.remove([previousPhotoValue]);
    cleanupWarning = !!error;
    if (error) logCleanupError("old photo cleanup", error);
  }

  return { displayUrl, cleanupWarning };
}

export async function removeDestinationPhoto(
  destinationId: string,
  currentPhotoValue: string | null,
): Promise<DestinationPhotoMutationResult> {
  const client = getClient();
  const { data: updatedDestination, error: databaseError } = await client
    .from("destinations")
    .update({ photo_url: null })
    .eq("id", destinationId)
    .select("id")
    .maybeSingle();
  if (databaseError) throwSupabasePhotoError("photo reference removal", databaseError);
  if (!updatedDestination) {
    throw new DestinationPhotoOperationError(
      "photo reference removal",
      "This destination isn’t available in your account. Refresh your list and try again.",
    );
  }

  let cleanupWarning = false;
  if (isStoredDestinationPhoto(currentPhotoValue)) {
    const { error } = await client.storage
      .from(DESTINATION_PHOTO_BUCKET)
      .remove([currentPhotoValue]);
    cleanupWarning = !!error;
    if (error) logCleanupError("stored photo removal", error);
  }

  return { displayUrl: undefined, cleanupWarning };
}
