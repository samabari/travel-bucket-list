// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DestinationPhotoPanel from "./DestinationPhotoPanel";

describe("DestinationPhotoPanel", () => {
  const createObjectUrl = vi.fn(() => "blob:destination-preview");
  const revokeObjectUrl = vi.fn();
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    if (originalCreateObjectUrl) {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: originalCreateObjectUrl });
    } else {
      delete (URL as unknown as { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    }
    if (originalRevokeObjectUrl) {
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: originalRevokeObjectUrl });
    } else {
      delete (URL as unknown as { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
    }
  });

  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, writable: true, value: createObjectUrl });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, writable: true, value: revokeObjectUrl });
  });

  it("previews a valid image before uploading it", async () => {
    const user = userEvent.setup();
    const image = new File(["photo"], "kyoto.png", { type: "image/png" });
    const onUpload = vi.fn().mockResolvedValue({ displayUrl: "https://signed.example/kyoto.png", cleanupWarning: false });
    const onRemove = vi.fn();
    render(
      <DestinationPhotoPanel
        destinationName="Kyoto"
        currentPhotoUrl={null}
        hasPhoto={false}
        onUpload={onUpload}
        onRemove={onRemove}
      />,
    );

    await user.upload(screen.getByLabelText("Choose a photo for Kyoto"), image);
    await waitFor(() => expect(screen.getByAltText("Kyoto travel memory").getAttribute("src")).toBe("blob:destination-preview"));
    expect(onUpload).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Upload Photo" }));
    await waitFor(() => expect(onUpload).toHaveBeenCalledWith(image));
    expect(screen.getByAltText("Kyoto travel memory").getAttribute("src")).toBe("https://signed.example/kyoto.png");
  });

  it("shows a friendly validation error for unsupported files", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(
      <DestinationPhotoPanel
        destinationName="Kyoto"
        currentPhotoUrl={null}
        hasPhoto={false}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const unsupported = new File(["photo"], "kyoto.gif", { type: "image/gif" });
    await user.upload(screen.getByLabelText("Choose a photo for Kyoto"), unsupported);

    expect(screen.getByRole("alert").textContent).toContain("Choose a JPG, PNG, or WebP image.");
  });

  it("shows a friendly validation error for images larger than 5 MB", async () => {
    const user = userEvent.setup();
    render(
      <DestinationPhotoPanel
        destinationName="Kyoto"
        currentPhotoUrl={null}
        hasPhoto={false}
        onUpload={vi.fn()}
        onRemove={vi.fn()}
      />,
    );

    const tooLarge = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
    await user.upload(screen.getByLabelText("Choose a photo for Kyoto"), tooLarge);

    expect(screen.getByRole("alert").textContent).toContain("larger than 5 MB");
  });

  it("asks before removing the current photo", async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn().mockResolvedValue({ cleanupWarning: false });
    render(
      <DestinationPhotoPanel
        destinationName="Kyoto"
        currentPhotoUrl="https://images.example/kyoto.jpg"
        hasPhoto
        onUpload={vi.fn()}
        onRemove={onRemove}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(onRemove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Keep photo" }));
    expect(onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Remove" }));
    await user.click(screen.getByRole("button", { name: "Yes, remove it" }));
    await waitFor(() => expect(onRemove).toHaveBeenCalledTimes(1));
  });

  it("shows a friendly error when an upload fails", async () => {
    const user = userEvent.setup();
    const image = new File(["photo"], "kyoto.png", { type: "image/png" });
    render(
      <DestinationPhotoPanel
        destinationName="Kyoto"
        currentPhotoUrl={null}
        hasPhoto={false}
        onUpload={vi.fn().mockRejectedValue(new Error("You don’t have permission to change this destination’s photo."))}
        onRemove={vi.fn()}
      />,
    );

    await user.upload(screen.getByLabelText("Choose a photo for Kyoto"), image);
    await user.click(screen.getByRole("button", { name: "Upload Photo" }));

    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("You don’t have permission");
  });
});
