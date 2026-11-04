import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DESTINATION_PHOTO_BUCKET,
  MAX_DESTINATION_PHOTO_BYTES,
  getDestinationPhotoErrorMessage,
  isStoredDestinationPhoto,
  removeDestinationPhoto,
  resolveDestinationPhotoUrl,
  uploadDestinationPhoto,
  validateDestinationPhoto,
} from "./destination-photos";

const supabaseMock = vi.hoisted(() => ({
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  storage: { from: vi.fn() },
}));

vi.mock("./supabase", () => ({ supabase: supabaseMock }));

describe("destination photo storage", () => {
  const userId = "user-123";
  const destinationId = "destination-456";

  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
  });

  function makeDatabaseUpdate({
    owned = true,
    updateError = null,
  }: { owned?: boolean; updateError?: { code: string; message: string } | null } = {}) {
    const maybeSingleOwnership = vi.fn().mockResolvedValue({
      data: owned ? { id: destinationId } : null,
      error: null,
    });
    const ownershipEqUser = vi.fn().mockReturnValue({ maybeSingle: maybeSingleOwnership });
    const ownershipEqId = vi.fn().mockReturnValue({ eq: ownershipEqUser });
    const ownershipSelect = vi.fn().mockReturnValue({ eq: ownershipEqId });

    const maybeSingleUpdate = vi.fn().mockResolvedValue({
      data: updateError ? null : { id: destinationId },
      error: updateError,
    });
    const updateSelect = vi.fn().mockReturnValue({ maybeSingle: maybeSingleUpdate });
    const updateEqUser = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqId = vi.fn().mockReturnValue({ eq: updateEqUser, select: updateSelect });
    const update = vi.fn().mockReturnValue({ eq: updateEqId });
    supabaseMock.from.mockReturnValue({ select: ownershipSelect, update });
    return { update, updateEqId, updateEqUser, ownershipSelect, ownershipEqId, ownershipEqUser };
  }

  function makeBucket(overrides: Record<string, unknown> = {}) {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const createSignedUrl = vi.fn().mockResolvedValue({
      data: { signedUrl: "https://signed.example/photo.jpg" },
      error: null,
    });
    const remove = vi.fn().mockResolvedValue({ error: null });
    const bucket = { upload, createSignedUrl, remove, ...overrides };
    supabaseMock.storage.from.mockReturnValue(bucket);
    return bucket;
  }

  it("accepts JPG, PNG, and WebP files up to 5 MB", () => {
    expect(validateDestinationPhoto({ type: "image/jpeg", size: 1 })).toBeNull();
    expect(validateDestinationPhoto({ type: "image/png", size: MAX_DESTINATION_PHOTO_BYTES })).toBeNull();
    expect(validateDestinationPhoto({ type: "image/webp", size: 100 })).toBeNull();
  });

  it("rejects unsupported and empty files with friendly messages", () => {
    expect(validateDestinationPhoto({ type: "image/gif", size: 100 })).toContain("JPG, PNG, or WebP");
    expect(validateDestinationPhoto({ type: "image/png", size: 0 })).toContain("empty");
  });

  it("rejects files larger than 5 MB", () => {
    expect(validateDestinationPhoto({ type: "image/jpeg", size: MAX_DESTINATION_PHOTO_BYTES + 1 }))
      .toContain("larger than 5 MB");
  });

  it("uploads into the authenticated user's destination folder and stores the path", async () => {
    const {
      update,
      updateEqId,
      updateEqUser,
      ownershipSelect,
      ownershipEqId,
      ownershipEqUser,
    } = makeDatabaseUpdate();
    const bucket = makeBucket();
    const file = { name: "trip.png", type: "image/png", size: 1024 } as File;

    const result = await uploadDestinationPhoto(destinationId, file, null);

    const path = bucket.upload.mock.calls[0][0] as string;
    expect(path).toMatch(/^user-123\/destination-456\/.+\.png$/);
    expect(bucket.upload).toHaveBeenCalledWith(path, file, {
      cacheControl: "3600",
      contentType: "image/png",
      upsert: false,
    });
    expect(supabaseMock.storage.from).toHaveBeenCalledWith(DESTINATION_PHOTO_BUCKET);
    expect(supabaseMock.from).toHaveBeenCalledWith("destinations");
    expect(ownershipSelect).toHaveBeenCalledWith("id");
    expect(ownershipEqId).toHaveBeenCalledWith("id", destinationId);
    expect(ownershipEqUser).toHaveBeenCalledWith("user_id", userId);
    expect(update).toHaveBeenCalledWith({ photo_url: path });
    expect(updateEqId).toHaveBeenCalledWith("id", destinationId);
    expect(updateEqUser).toHaveBeenCalledWith("user_id", userId);
    expect(result).toEqual({ displayUrl: "https://signed.example/photo.jpg", cleanupWarning: false });
  });

  it("replaces an old stored photo and removes its object after saving the new path", async () => {
    const { update } = makeDatabaseUpdate();
    const oldPath = `${userId}/${destinationId}/old.jpg`;
    const bucket = makeBucket();
    const file = { name: "new.webp", type: "image/webp", size: 2048 } as File;

    await uploadDestinationPhoto(destinationId, file, oldPath);

    expect(update).toHaveBeenCalledWith({ photo_url: expect.stringMatching(/\.webp$/) });
    expect(bucket.remove).toHaveBeenCalledWith([oldPath]);
  });

  it("removes a destination photo reference and its stored object", async () => {
    const { update } = makeDatabaseUpdate();
    const bucket = makeBucket();
    const path = `${userId}/${destinationId}/photo.jpg`;

    await removeDestinationPhoto(destinationId, path);

    expect(update).toHaveBeenCalledWith({ photo_url: null });
    expect(bucket.remove).toHaveBeenCalledWith([path]);
  });

  it("does not try to delete external photo links from storage", async () => {
    makeDatabaseUpdate();
    const bucket = makeBucket();

    await removeDestinationPhoto(destinationId, "https://images.example/photo.jpg");

    expect(bucket.remove).not.toHaveBeenCalled();
  });

  it("identifies the exact Storage error stage, code, and message", async () => {
    const database = makeDatabaseUpdate();
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const storageError = { code: "42501", message: "new row violates row-level security policy" };
    const bucket = makeBucket({
      upload: vi.fn().mockResolvedValue({ error: storageError }),
    });
    const file = { name: "trip.jpg", type: "image/jpeg", size: 1024 } as File;

    await expect(uploadDestinationPhoto(destinationId, file, null)).rejects.toMatchObject({
      stage: "storage upload",
      supabaseCode: "42501",
      supabaseMessage: storageError.message,
    });
    expect(diagnostic).toHaveBeenCalledWith("[destination-photo] storage upload failed", {
      code: storageError.code,
      message: storageError.message,
    });
    expect(bucket.upload).toHaveBeenCalledTimes(1);
    expect(database.update).not.toHaveBeenCalled();
  });

  it("does not upload when the authenticated user does not own the destination", async () => {
    const database = makeDatabaseUpdate({ owned: false });
    const bucket = makeBucket();
    const file = { name: "trip.jpg", type: "image/jpeg", size: 1024 } as File;

    await expect(uploadDestinationPhoto(destinationId, file, null)).rejects.toMatchObject({
      stage: "destination ownership check",
      message: "This destination isn’t available in your account. Refresh your list and try again.",
    });
    expect(bucket.upload).not.toHaveBeenCalled();
    expect(database.update).not.toHaveBeenCalled();
  });

  it("distinguishes a destinations.photo_url update error from a Storage error", async () => {
    const updateError = { code: "42501", message: "new row violates row-level security policy" };
    const database = makeDatabaseUpdate({ updateError });
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const bucket = makeBucket();
    const file = { name: "trip.jpg", type: "image/jpeg", size: 1024 } as File;

    await expect(uploadDestinationPhoto(destinationId, file, null)).rejects.toMatchObject({
      stage: "destinations.photo_url update",
      supabaseCode: "42501",
      supabaseMessage: updateError.message,
    });
    expect(bucket.upload).toHaveBeenCalledTimes(1);
    expect(bucket.remove).toHaveBeenCalledWith([bucket.upload.mock.calls[0]?.[0]]);
    expect(database.update).toHaveBeenCalledWith({ photo_url: expect.stringMatching(/\.jpg$/) });
    expect(diagnostic).toHaveBeenCalledWith("[destination-photo] destinations.photo_url update failed", {
      code: updateError.code,
      message: updateError.message,
    });
  });

  it("rejects invalid files before making storage requests", async () => {
    const file = { name: "trip.gif", type: "image/gif", size: 1024 } as File;

    await expect(uploadDestinationPhoto(destinationId, file, null))
      .rejects.toThrow("Choose a JPG, PNG, or WebP image.");
    expect(supabaseMock.storage.from).not.toHaveBeenCalled();
  });

  it("creates signed display URLs for private storage paths and preserves legacy URLs", async () => {
    const bucket = makeBucket();
    const path = `${userId}/${destinationId}/photo.jpg`;

    await expect(resolveDestinationPhotoUrl(path)).resolves.toBe("https://signed.example/photo.jpg");
    await expect(resolveDestinationPhotoUrl("https://images.example/photo.jpg"))
      .resolves.toBe("https://images.example/photo.jpg");
    expect(bucket.createSignedUrl).toHaveBeenCalledWith(path, 60 * 60);
  });

  it("recognizes only stored object paths, not external URLs", () => {
    expect(isStoredDestinationPhoto(`${userId}/${destinationId}/photo.png`)).toBe(true);
    expect(isStoredDestinationPhoto("https://images.example/photo.png")).toBe(false);
    expect(isStoredDestinationPhoto("")).toBe(false);
  });

  it("maps missing-bucket errors to setup instructions", () => {
    expect(getDestinationPhotoErrorMessage({ statusCode: "404", message: "Bucket not found" }))
      .toContain("Run the destination photos migration");
  });
});
