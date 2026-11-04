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

  function makeDatabaseUpdate() {
    const single = vi.fn().mockResolvedValue({ data: { id: destinationId }, error: null });
    const select = vi.fn().mockReturnValue({ single });
    const eq = vi.fn().mockReturnValue({ select });
    const update = vi.fn().mockReturnValue({ eq });
    supabaseMock.from.mockReturnValue({ update });
    return { update, eq, select, single };
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
    const { update, eq } = makeDatabaseUpdate();
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
    expect(update).toHaveBeenCalledWith({ photo_url: path });
    expect(eq).toHaveBeenCalledWith("id", destinationId);
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

  it("surfaces storage permission failures without exposing raw details", async () => {
    const bucket = makeBucket({
      upload: vi.fn().mockResolvedValue({ error: { code: "42501", message: "row-level security policy denied" } }),
    });
    const file = { name: "trip.jpg", type: "image/jpeg", size: 1024 } as File;

    await expect(uploadDestinationPhoto(destinationId, file, null))
      .rejects.toThrow("Check that you’re signed in");
    expect(bucket.upload).toHaveBeenCalledTimes(1);
    expect(supabaseMock.from).not.toHaveBeenCalled();
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
