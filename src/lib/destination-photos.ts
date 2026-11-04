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
  if (error) throw new Error(getDestinationPhotoErrorMessage(error));
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
    throw new Error("Sign in again before uploading a destination photo.");
  }

  const path = getStoragePath(authData.user.id, destinationId, file);
  const bucket = client.storage.from(DESTINATION_PHOTO_BUCKET);
  const { error: uploadError } = await bucket.upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw new Error(getDestinationPhotoErrorMessage(uploadError));

  let displayUrl: string;
  try {
    displayUrl = (await resolveDestinationPhotoUrl(path)) ?? "";
    if (!displayUrl) throw new Error("A secure photo preview could not be created.");
  } catch (cause) {
    await bucket.remove([path]);
    throw cause;
  }

  const { error: databaseError } = await client
    .from("destinations")
    .update({ photo_url: path })
    .eq("id", destinationId)
    .select("id")
    .single();
  if (databaseError) {
    await bucket.remove([path]);
    throw new Error(getDestinationPhotoErrorMessage(databaseError));
  }

  let cleanupWarning = false;
  if (isStoredDestinationPhoto(previousPhotoValue) && previousPhotoValue !== path) {
    const { error } = await bucket.remove([previousPhotoValue]);
    cleanupWarning = !!error;
  }

  return { displayUrl, cleanupWarning };
}

export async function removeDestinationPhoto(
  destinationId: string,
  currentPhotoValue: string | null,
): Promise<DestinationPhotoMutationResult> {
  const client = getClient();
  const { error: databaseError } = await client
    .from("destinations")
    .update({ photo_url: null })
    .eq("id", destinationId)
    .select("id")
    .single();
  if (databaseError) throw new Error(getDestinationPhotoErrorMessage(databaseError));

  let cleanupWarning = false;
  if (isStoredDestinationPhoto(currentPhotoValue)) {
    const { error } = await client.storage
      .from(DESTINATION_PHOTO_BUCKET)
      .remove([currentPhotoValue]);
    cleanupWarning = !!error;
  }

  return { displayUrl: undefined, cleanupWarning };
}
