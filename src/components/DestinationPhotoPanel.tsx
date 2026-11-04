import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { validateDestinationPhoto } from "../lib/destination-photos";
import "./destination-photo-panel.css";

export interface DestinationPhotoPanelProps {
  destinationName: string;
  currentPhotoUrl: string | null;
  hasPhoto: boolean;
  onUpload: (file: File) => Promise<{ displayUrl?: string; cleanupWarning: boolean }>;
  onRemove: () => Promise<{ displayUrl?: string; cleanupWarning: boolean }>;
}

type PhotoOverride = { kind: "url"; url: string } | { kind: "removed" } | null;

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message.trim()
    ? cause.message
    : fallback;
}

export default function DestinationPhotoPanel({
  destinationName,
  currentPhotoUrl,
  hasPhoto,
  onUpload,
  onRemove,
}: DestinationPhotoPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [savedPreviewFile, setSavedPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [override, setOverride] = useState<PhotoOverride>(null);
  const [validationError, setValidationError] = useState("");
  const [actionError, setActionError] = useState("");
  const [cleanupWarning, setCleanupWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmingRemoval, setConfirmingRemoval] = useState(false);

  const previewFile = selectedFile ?? savedPreviewFile;

  useEffect(() => {
    if (!previewFile) {
      setPreviewUrl("");
      return;
    }
    const objectUrl = URL.createObjectURL(previewFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [previewFile]);

  useEffect(() => {
    setOverride(null);
  }, [currentPhotoUrl, hasPhoto]);

  const currentIsVisible = override?.kind === "url" || (!override && hasPhoto);
  const effectiveUrl = override?.kind === "url"
    ? override.url
    : override?.kind === "removed"
      ? null
      : currentPhotoUrl;
  const displayUrl = previewUrl || effectiveUrl;
  const hasVisiblePhoto = Boolean(previewFile || currentIsVisible);
  function chooseFile(file?: File) {
    if (!file) return;
    setValidationError("");
    setActionError("");
    setCleanupWarning(false);
    setConfirmingRemoval(false);
    const validation = validateDestinationPhoto(file);
    if (validation) {
      setSelectedFile(null);
      setValidationError(validation);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSelectedFile(file);
  }

  function cancelSelection() {
    setSelectedFile(null);
    setValidationError("");
    setActionError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function uploadSelection() {
    if (!selectedFile || busy) return;
    setBusy(true);
    setActionError("");
    setValidationError("");
    setCleanupWarning(false);
    try {
      const result = await onUpload(selectedFile);
      const committedUrl = result.displayUrl || previewUrl || currentPhotoUrl || "";
      setOverride(committedUrl ? { kind: "url", url: committedUrl } : null);
      setSelectedFile(null);
      setSavedPreviewFile(result.displayUrl ? null : selectedFile);
      setConfirmingRemoval(false);
      setCleanupWarning(result.cleanupWarning);
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setActionError(errorMessage(cause, "We couldn’t save this photo. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    if (busy) return;
    setBusy(true);
    setActionError("");
    setCleanupWarning(false);
    try {
      const result = await onRemove();
      setOverride({ kind: "removed" });
      setSelectedFile(null);
      setSavedPreviewFile(null);
      setConfirmingRemoval(false);
      setCleanupWarning(result.cleanupWarning);
      if (inputRef.current) inputRef.current.value = "";
    } catch (cause) {
      setActionError(errorMessage(cause, "We couldn’t remove this photo. Please try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="destination-photo-panel" aria-labelledby="dpp-title">
      <div className="dpp-heading">
        <div className="dpp-heading-copy">
          <span className="dpp-heading-mark" aria-hidden="true"><ImagePlus size={17} /></span>
          <div>
            <span className="dpp-eyebrow">A moment from the map</span>
            <h3 id="dpp-title">Destination photo</h3>
          </div>
        </div>
        <span className="dpp-format-note">JPG, PNG, or WebP<br />Up to 5 MB</span>
      </div>

      <div className={`dpp-preview${displayUrl ? " has-image" : ""}`} aria-label={displayUrl ? `Photo preview for ${destinationName}` : "Illustrated photo placeholder"}>
        {displayUrl && (
          <img
            className="dpp-preview-image"
            src={displayUrl}
            alt={`${destinationName} travel memory`}
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
        )}
        {displayUrl && <span className="dpp-preview-shade" aria-hidden="true" />}
        <div className="dpp-preview-label">
          <span>{destinationName}</span>
          <small>{selectedFile ? "Preview" : displayUrl ? "In your journal" : "A place to remember"}</small>
        </div>
      </div>
      <p className="dpp-stage-caption">
        {selectedFile
          ? "A little preview before it finds a place in your journal."
          : hasVisiblePhoto
            ? "Keep the view that brings this place back."
            : "Add a photo to give this page a view of its own."}
      </p>

      <input
        ref={inputRef}
        className="dpp-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        aria-label={`Choose a photo for ${destinationName}`}
        disabled={busy}
        onChange={(event) => chooseFile(event.currentTarget.files?.[0])}
      />

      <div className="dpp-actions">
        {selectedFile ? (
          <>
            <button className="dpp-primary" type="button" onClick={() => void uploadSelection()} disabled={busy}>
              {busy ? <LoaderCircle size={14} /> : <Upload size={14} />}
              {busy ? "Saving photo…" : "Upload Photo"}
            </button>
            <button className="dpp-secondary" type="button" onClick={cancelSelection} disabled={busy}>
              <X size={14} /> Cancel
            </button>
            {!busy && <span className="dpp-busy-note" aria-live="polite">{selectedFile.name}</span>}
          </>
        ) : (
          <>
            <button
              className="dpp-primary"
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <ImagePlus size={14} /> {hasVisiblePhoto ? "Replace photo" : "Choose a photo"}
            </button>
            {hasVisiblePhoto && (
              <button
                className="dpp-remove"
                type="button"
                onClick={() => { setConfirmingRemoval(true); setActionError(""); }}
                disabled={busy}
              >
                <Trash2 size={14} /> Remove
              </button>
            )}
          </>
        )}
      </div>

      {validationError && <p className="dpp-validation" role="alert"><AlertCircle size={14} />{validationError}</p>}
      {actionError && <p className="dpp-error" role="alert"><AlertCircle size={14} />{actionError}</p>}
      {cleanupWarning && <p className="dpp-notice" role="status">The photo was updated, but an older stored copy could not be cleared.</p>}

      {confirmingRemoval && !selectedFile && (
        <div className="dpp-confirmation" role="alertdialog" aria-labelledby="dpp-remove-title" aria-describedby="dpp-remove-copy">
          <h4 id="dpp-remove-title">Remove this photo?</h4>
          <p id="dpp-remove-copy">It will no longer appear with {destinationName}. This won’t change your notes or other details.</p>
          <div className="dpp-confirmation-actions">
            <button className="dpp-cancel" type="button" onClick={() => setConfirmingRemoval(false)} disabled={busy}>Keep photo</button>
            <button className="dpp-confirm-remove" type="button" onClick={() => void removePhoto()} disabled={busy}>
              {busy ? <LoaderCircle size={14} /> : <Check size={14} />}
              {busy ? "Removing…" : "Yes, remove it"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
