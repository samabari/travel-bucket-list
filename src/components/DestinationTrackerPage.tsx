import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Compass,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDestinationTracker } from "../hooks/useDestinationTracker";
import type { Country, Destination, DestinationInput, DestinationStatus } from "../lib/destinations";
import { isStoredDestinationPhoto, type DestinationPhotoMutationResult } from "../lib/destination-photos";
import { filterAndSortDestinations, type DestinationSort, type DestinationStatusFilter } from "../lib/destination-filters";
import {
  validateDestinationDraft,
  type DestinationValidationErrors,
  type DestinationValidationField,
} from "../lib/destination-validation";
import DestinationPhotoPanel from "./DestinationPhotoPanel";
import "./destination-tracker.css";

type DestinationForm = {
  name: string;
  countryChoice: string;
  newCountry: string;
  status: DestinationStatus;
  visitDate: string;
  rating: string;
  notes: string;
  photoUrl: string;
};

const emptyForm: DestinationForm = {
  name: "",
  countryChoice: "",
  newCountry: "",
  status: "wishlist",
  visitDate: "",
  rating: "",
  notes: "",
  photoUrl: "",
};

const defaultDestinationFilters = {
  search: "",
  countryId: "",
  status: "all" as DestinationStatusFilter,
  sort: "newest" as DestinationSort,
};

function asErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

function safePhotoUrl(value: string | null) {
  if (!value) return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? value : "";
  } catch {
    return "";
  }
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(date);
}

function DestinationCard({
  destination,
  starred,
  starPending,
  starsUnavailable,
  onEdit,
  onViewNotes,
  onDelete,
  onToggleStar,
}: {
  destination: Destination;
  starred: boolean;
  starPending: boolean;
  starsUnavailable: boolean;
  onEdit: (destination: Destination) => void;
  onViewNotes: (destination: Destination) => void;
  onDelete: (destination: Destination) => void;
  onToggleStar: (destinationId: string) => void;
}) {
  const photoUrl = destination.photoDisplayUrl || safePhotoUrl(destination.photoUrl);
  const date = formatDate(destination.visitDate);
  return (
    <article className="destination-card">
      <div className="destination-photo" aria-hidden="true">
        {photoUrl && <img src={photoUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
      </div>
      <div className="destination-card-copy">
        <span className={`destination-status${destination.status === "visited" ? " is-visited" : ""}`}>
          {destination.status === "visited" ? "Been there" : "Want to visit"}
        </span>
        <h3>{destination.name}</h3>
        <p className="destination-country">{destination.countryName}</p>
        {destination.notes && <p className="destination-card-notes">{destination.notes}</p>}
        {(date || destination.rating !== null) && (
          <div className="destination-card-meta">
            {date}
            {date && destination.rating !== null ? " · " : ""}
            {destination.rating !== null ? `Personal rating · ${destination.rating}` : ""}
          </div>
        )}
        <div className="destination-card-actions">
          <button className="destination-icon-button destination-notes-button" type="button" onClick={() => onViewNotes(destination)} aria-label={`Travel notes for ${destination.name}`} title="View or edit travel notes">
            <BookOpen size={14} /><span>Notes</span>
          </button>
          <button
            className={`destination-icon-button destination-star-button${starred ? " is-starred" : ""}`}
            type="button"
            onClick={() => onToggleStar(destination.id)}
            aria-label={`${starred ? "Unstar" : "Star"} ${destination.name}`}
            aria-pressed={starred}
            disabled={starPending || starsUnavailable}
            title={starred ? "Remove from starred destinations" : "Add to starred destinations"}
          >
            <Star size={14} fill={starred ? "currentColor" : "none"} />
            <span>{starPending ? "Saving" : starred ? "Starred" : "Star"}</span>
          </button>
          <button className="destination-icon-button" type="button" onClick={() => onEdit(destination)} aria-label={`Edit ${destination.name}`}>
            <Pencil size={14} /><span>Edit</span>
          </button>
          <button className="destination-icon-button is-delete" type="button" onClick={() => onDelete(destination)} aria-label={`Delete ${destination.name}`}>
            <Trash2 size={14} /><span>Delete</span>
          </button>
        </div>
      </div>
    </article>
  );
}

function TravelNotesDialog({
  destination,
  busy,
  onClose,
  onSave,
  onUploadPhoto,
  onRemovePhoto,
}: {
  destination: Destination;
  busy: boolean;
  onClose: () => void;
  onSave: (destinationId: string, notes: string) => Promise<void>;
  onUploadPhoto: (
    destinationId: string,
    file: File,
    previousPhotoValue: string | null,
  ) => Promise<DestinationPhotoMutationResult>;
  onRemovePhoto: (
    destinationId: string,
    currentPhotoValue: string | null,
  ) => Promise<DestinationPhotoMutationResult>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(destination.notes ?? "");
  const [saveError, setSaveError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    try {
      await onSave(destination.id, draft);
    } catch (cause) {
      setSaveError(asErrorMessage(cause, "We couldn’t save your notes just now. Please try again."));
    }
  }

  function beginEditing() {
    setDraft(destination.notes ?? "");
    setSaveError("");
    setEditing(true);
  }

  return (
    <div className="destination-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="destination-dialog travel-notes-dialog" role="dialog" aria-modal="true" aria-labelledby="travel-notes-title">
        <div className="destination-dialog-head">
          <div>
            <span className="destination-dialog-kicker">A page in your journal</span>
            <h2 id="travel-notes-title">{destination.name}</h2>
            <p className="destination-dialog-intro">{destination.countryName}</p>
          </div>
          <button className="destination-close" type="button" onClick={onClose} aria-label="Close travel notes" disabled={busy}><X size={18} /></button>
        </div>

        <DestinationPhotoPanel
          destinationName={destination.name}
          currentPhotoUrl={(destination.photoDisplayUrl ?? safePhotoUrl(destination.photoUrl)) || null}
          hasPhoto={Boolean(destination.photoUrl)}
          onUpload={(file) => onUploadPhoto(destination.id, file, destination.photoUrl)}
          onRemove={() => onRemovePhoto(destination.id, destination.photoUrl)}
        />

        <section className="travel-notes-section" aria-labelledby="travel-notes-heading">
          <div className="travel-notes-heading">
            <BookOpen size={18} aria-hidden="true" />
            <div>
              <span>YOUR PERSONAL NOTES</span>
              <h3 id="travel-notes-heading">Travel Notes</h3>
            </div>
          </div>

          {editing ? (
            <form className="travel-notes-form" onSubmit={(event) => void submit(event)}>
              <label htmlFor="travel-notes-editor">Write your memories or ideas</label>
              <textarea
                ref={textareaRef}
                id="travel-notes-editor"
                value={draft}
                onChange={(event) => { setDraft(event.target.value); setSaveError(""); }}
                rows={10}
                placeholder="The little details you want to remember, or the things you hope to do next time…"
                disabled={busy}
              />
              {saveError && <p className="travel-notes-error" role="alert">{saveError}</p>}
              <div className="destination-form-actions">
                <button
                  className="destination-cancel-button"
                  type="button"
                  onClick={() => { setDraft(destination.notes ?? ""); setSaveError(""); setEditing(false); }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button className="destination-save-button" type="submit" disabled={busy}>
                  {busy ? "Saving notes…" : "Save Notes"}
                  {!busy && <ArrowRight size={15} />}
                </button>
              </div>
            </form>
          ) : (
            <div className="travel-notes-view">
              {destination.notes?.trim() ? (
                <div className="travel-notes-content">{destination.notes}</div>
              ) : (
                <div className="travel-notes-empty" role="status">
                  <h4>No notes yet.</h4>
                  <p>Keep a memory from this place or jot down what you’d love to do there.</p>
                </div>
              )}
              <button className="travel-notes-edit-button" type="button" onClick={beginEditing}>
                {destination.notes?.trim() ? "Edit Notes" : "Write Notes"}
                <Pencil size={14} />
              </button>
            </div>
          )}
        </section>
      </section>
    </div>
  );
}

function LoadingCollection() {
  return (
    <div aria-label="Loading your destinations" aria-busy="true">
      {[0, 1].map((section) => (
        <section className="destination-skeleton-section" key={section}>
          <div className="destination-skeleton-title" />
          <div className="destination-skeleton-grid">
            {[0, 1].map((card) => (
              <div className="destination-skeleton-card" key={card}>
                <div className="destination-skeleton-image" />
                <div className="destination-skeleton-copy">
                  <div className="destination-skeleton-line short" />
                  <div className="destination-skeleton-line" />
                  <div className="destination-skeleton-line wide" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function DestinationFormDialog({
  countries,
  initial,
  editing,
  busy,
  mutationError,
  onClose,
  onSubmit,
}: {
  countries: Country[];
  initial: DestinationForm;
  editing: boolean;
  busy: boolean;
  mutationError: string;
  onClose: () => void;
  onSubmit: (input: DestinationInput) => Promise<void>;
}) {
  const [form, setForm] = useState(initial);
  const [validationErrors, setValidationErrors] = useState<DestinationValidationErrors>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const countryRef = useRef<HTMLSelectElement>(null);
  const newCountryRef = useRef<HTMLInputElement>(null);
  const visitDateRef = useRef<HTMLInputElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function setField<K extends keyof DestinationForm>(key: K, value: DestinationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationErrors((current) => {
      const next = { ...current };
      const validationKey: DestinationValidationField | undefined =
        key === "name" || key === "countryChoice" || key === "newCountry" || key === "visitDate" || key === "rating" || key === "photoUrl"
          ? key
          : undefined;
      if (validationKey) delete next[validationKey];
      if (key === "countryChoice") delete next.newCountry;
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateDestinationDraft({
      name: form.name,
      countryChoice: form.countryChoice,
      newCountry: form.newCountry,
      visitDate: form.visitDate,
      rating: form.rating,
      photoUrl: form.photoUrl,
      photoUrlIsStored: isStoredDestinationPhoto(form.photoUrl),
    }, countries.map((country) => country.id));
    setValidationErrors(errors);

    const fieldOrder: DestinationValidationField[] = ["name", "countryChoice", "newCountry", "visitDate", "rating", "photoUrl"];
    const firstInvalidField = fieldOrder.find((field) => errors[field]);
    if (firstInvalidField) {
      const fieldRefs = {
        name: nameRef,
        countryChoice: countryRef,
        newCountry: newCountryRef,
        visitDate: visitDateRef,
        rating: ratingRef,
        photoUrl: photoUrlRef,
      };
      fieldRefs[firstInvalidField].current?.focus();
      return;
    }

    const name = form.name.trim();
    const usesNewCountry = form.countryChoice === "new";
    const countryName = form.newCountry.trim();
    const photoUrl = form.photoUrl.trim();
    const rating = form.rating.trim() ? Number(form.rating) : null;
    await onSubmit({
      name,
      country: usesNewCountry
        ? { kind: "new", name: countryName }
        : { kind: "existing", id: form.countryChoice },
      status: form.status,
      visitDate: form.visitDate || null,
      rating,
      notes: form.notes.trim() || null,
      photoUrl: photoUrl || null,
    });
  }

  return (
    <div className="destination-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <section className="destination-dialog" role="dialog" aria-modal="true" aria-labelledby="destination-dialog-title" aria-describedby="destination-dialog-description">
        <div className="destination-dialog-head">
          <div>
            <span className="destination-dialog-kicker">{editing ? "A page in your journal" : "A new page in your journal"}</span>
            <h2 id="destination-dialog-title">{editing ? "Revisit the details." : "Where have you been?"}</h2>
            <p className="destination-dialog-intro" id="destination-dialog-description">
              {editing ? "Keep the details that bring the place back." : "Add somewhere you remember, or somewhere you’re still dreaming about."}
            </p>
          </div>
          <button className="destination-close" type="button" onClick={onClose} aria-label="Close form" disabled={busy}><X size={18} /></button>
        </div>
        <form className="destination-form" onSubmit={submit} noValidate>
          <div className="destination-field is-full">
            <label htmlFor="destination-name">Place name <span aria-hidden="true">*</span></label>
            <input ref={nameRef} id="destination-name" name="name" required maxLength={120} placeholder="A city, coastline, little village…" value={form.name} onChange={(event) => setField("name", event.target.value)} aria-invalid={Boolean(validationErrors.name)} aria-describedby={validationErrors.name ? "destination-name-error" : undefined} />
            {validationErrors.name && <p className="destination-field-error" id="destination-name-error" role="alert">{validationErrors.name}</p>}
          </div>
          <div className="destination-field is-full">
            <label htmlFor="destination-country">Country <span aria-hidden="true">*</span></label>
            <select ref={countryRef} id="destination-country" name="country" value={form.countryChoice} required onChange={(event) => setField("countryChoice", event.target.value)} aria-invalid={Boolean(validationErrors.countryChoice)} aria-describedby={validationErrors.countryChoice ? "destination-country-error" : undefined}>
              <option value="">Choose a country</option>
              {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
              <option value="new">Add a new country…</option>
            </select>
            {validationErrors.countryChoice && <p className="destination-field-error" id="destination-country-error" role="alert">{validationErrors.countryChoice}</p>}
            {form.countryChoice === "new" && (
              <>
                <input
                  ref={newCountryRef}
                  id="destination-new-country"
                  aria-label="New country name"
                  name="newCountry"
                  required
                  maxLength={100}
                  placeholder="Country name"
                  value={form.newCountry}
                  onChange={(event) => setField("newCountry", event.target.value)}
                  aria-invalid={Boolean(validationErrors.newCountry)}
                  aria-describedby={validationErrors.newCountry ? "destination-new-country-error" : undefined}
                />
                {validationErrors.newCountry && <p className="destination-field-error" id="destination-new-country-error" role="alert">{validationErrors.newCountry}</p>}
              </>
            )}
          </div>
          <fieldset className="destination-field destination-fieldset is-full">
            <legend>What’s the story? <span aria-hidden="true">*</span></legend>
            <div className="destination-status-options">
              <div className="destination-status-option">
                <input id="destination-wishlist" type="radio" name="status" value="wishlist" checked={form.status === "wishlist"} onChange={() => setField("status", "wishlist")} />
                <label htmlFor="destination-wishlist">Want to visit</label>
              </div>
              <div className="destination-status-option">
                <input id="destination-visited" type="radio" name="status" value="visited" checked={form.status === "visited"} onChange={() => setField("status", "visited")} />
                <label htmlFor="destination-visited">Been there</label>
              </div>
            </div>
          </fieldset>
          <div className="destination-field">
            <label htmlFor="destination-date">When did you go?</label>
            <input ref={visitDateRef} id="destination-date" name="visitDate" type="date" value={form.visitDate} onChange={(event) => setField("visitDate", event.target.value)} aria-invalid={Boolean(validationErrors.visitDate)} aria-describedby={validationErrors.visitDate ? "destination-date-error" : undefined} />
            {validationErrors.visitDate && <p className="destination-field-error" id="destination-date-error" role="alert">{validationErrors.visitDate}</p>}
          </div>
          <div className="destination-field">
            <label htmlFor="destination-rating">Personal rating</label>
            <input ref={ratingRef} id="destination-rating" name="rating" type="number" step="any" inputMode="decimal" placeholder="Optional" value={form.rating} onChange={(event) => setField("rating", event.target.value)} aria-invalid={Boolean(validationErrors.rating)} aria-describedby={validationErrors.rating ? "destination-rating-error" : undefined} />
            {validationErrors.rating && <p className="destination-field-error" id="destination-rating-error" role="alert">{validationErrors.rating}</p>}
          </div>
          <div className="destination-field is-full">
            <label htmlFor="destination-notes">A few words to remember it by</label>
            <textarea id="destination-notes" name="notes" maxLength={2000} placeholder="The light, the food, the feeling of getting there…" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </div>
          <div className="destination-field is-full">
            {isStoredDestinationPhoto(form.photoUrl) ? (
              <>
                <label>Photo link</label>
                <span className="destination-photo-hint">This place has a private uploaded photo. View or replace it in Travel Notes.</span>
              </>
            ) : (
              <>
                <label htmlFor="destination-photo">Photo link</label>
                <input ref={photoUrlRef} id="destination-photo" name="photoUrl" type="url" inputMode="url" placeholder="https://…" value={form.photoUrl} onChange={(event) => setField("photoUrl", event.target.value)} aria-invalid={Boolean(validationErrors.photoUrl)} aria-describedby={`destination-photo-hint${validationErrors.photoUrl ? " destination-photo-error" : ""}`} />
                <span className="destination-photo-hint" id="destination-photo-hint">A link to an image is optional. Use a full http or https address.</span>
                {validationErrors.photoUrl && <p className="destination-field-error" id="destination-photo-error" role="alert">{validationErrors.photoUrl}</p>}
              </>
            )}
          </div>
          {mutationError && <p className="destination-form-error" role="alert">{mutationError}</p>}
          <div className="destination-form-actions">
            <button className="destination-cancel-button" type="button" onClick={onClose} disabled={busy}>Keep looking</button>
            <button className="destination-save-button" type="submit" disabled={busy}>
              {busy ? "Saving your place…" : editing ? "Save changes" : "Add to my places"}
              {!busy && <ArrowRight size={15} />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function DestinationTrackerPage() {
  const {
    countries,
    destinations,
    loading,
    error,
    reload,
    create,
    update,
    saveNotes,
    uploadPhoto,
    removePhoto,
    remove,
    starredDestinationIds,
    starsLoading,
    starsError,
    pendingStarIds,
    reloadStars,
    toggleStar,
  } = useDestinationTracker();
  const { pathname, state } = useLocation();
  const navigate = useNavigate();
  const starredOnly = pathname === "/starred";
  const openCreateFromDashboard = typeof state === "object"
    && state !== null
    && "openCreateDestination" in state
    && state.openCreateDestination === true;
  const [formTarget, setFormTarget] = useState<Destination | null | undefined>(undefined);
  const [notesTarget, setNotesTarget] = useState<Destination | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [notesBusy, setNotesBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [filters, setFilters] = useState(defaultDestinationFilters);
  const errorFocusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pathname !== "/destinations" || !openCreateFromDashboard) return;
    setActionError("");
    setFormTarget(null);
    navigate(pathname, { replace: true, state: null });
  }, [navigate, openCreateFromDashboard, pathname]);

  useEffect(() => {
    if (actionError) errorFocusRef.current?.focus();
  }, [actionError]);

  useEffect(() => {
    if (formTarget === undefined && !notesTarget && !deleteTarget) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !mutationBusy) {
        setFormTarget(undefined);
        if (!notesBusy) setNotesTarget(null);
        setDeleteTarget(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formTarget, notesTarget, deleteTarget, mutationBusy, notesBusy]);

  function openCreate() {
    setActionError("");
    setFormTarget(null);
  }

  function openEdit(destination: Destination) {
    setActionError("");
    setFormTarget(destination);
  }

  function getFormInitial(destination: Destination | null): DestinationForm {
    if (!destination) return { ...emptyForm };
    return {
      name: destination.name,
      countryChoice: destination.countryId,
      newCountry: "",
      status: destination.status,
      visitDate: destination.visitDate ?? "",
      rating: destination.rating === null ? "" : String(destination.rating),
      notes: destination.notes ?? "",
      photoUrl: destination.photoUrl ?? "",
    };
  }

  async function submitDestination(input: DestinationInput) {
    setMutationBusy(true);
    setActionError("");
    try {
      if (formTarget) await update(formTarget.id, input);
      else await create(input);
      setFormTarget(undefined);
    } catch (cause) {
      setActionError(asErrorMessage(cause, "We couldn’t save that place just now. Please try again."));
    } finally {
      setMutationBusy(false);
    }
  }

  async function submitTravelNotes(destinationId: string, notes: string) {
    setNotesBusy(true);
    try {
      await saveNotes(destinationId, notes);
      setNotesTarget(null);
    } finally {
      setNotesBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setMutationBusy(true);
    setActionError("");
    try {
      await remove(deleteTarget.id);
      setDeleteTarget(null);
    } catch (cause) {
      setActionError(asErrorMessage(cause, "We couldn’t remove that place just now. Please try again."));
    } finally {
      setMutationBusy(false);
    }
  }

  const visibleDestinations = starredOnly
    ? destinations.filter((destination) => starredDestinationIds.has(destination.id))
    : filterAndSortDestinations(destinations, filters);
  const visited = visibleDestinations.filter((destination) => destination.status === "visited");
  const wishlist = visibleDestinations.filter((destination) => destination.status === "wishlist");
  const filtersAreActive = Boolean(filters.search.trim() || filters.countryId || filters.status !== "all" || filters.sort !== "newest");
  const activeNotesDestination = notesTarget
    ? destinations.find((destination) => destination.id === notesTarget.id) ?? notesTarget
    : null;

  function clearFilters() {
    setFilters({ ...defaultDestinationFilters });
  }

  function renderSection(title: string, eyebrow: string, entries: Destination[], emptyTitle: string, emptyCopy: string, isWishlist: boolean) {
    return (
      <section className="destination-section" aria-label={title}>
        <div className="destination-section-head">
          <h2>{title}</h2>
          <span>{eyebrow}</span>
        </div>
        {entries.length ? (
          <div className="destination-grid">
            {entries.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                starred={starredDestinationIds.has(destination.id)}
                starPending={pendingStarIds.has(destination.id)}
                starsUnavailable={starsLoading || !!starsError}
                onEdit={openEdit}
                onViewNotes={setNotesTarget}
                onDelete={setDeleteTarget}
                onToggleStar={(id) => { void toggleStar(id); }}
              />
            ))}
          </div>
        ) : (
          <div className="destination-empty">
            <span className="destination-empty-mark" aria-hidden="true">{isWishlist ? <Compass size={20} /> : <MapPin size={20} />}</span>
            <h3>{emptyTitle}</h3>
            <p>{emptyCopy}</p>
            {isWishlist && <button type="button" onClick={openCreate}>Keep a place in mind</button>}
          </div>
        )}
      </section>
    );
  }

  return (
    <main className="destination-page">
      <div className="destination-inner">
        <div className="destination-topline">
          <Link className="destination-home-link" to="/">Elsewhere</Link>
          <span className="destination-topline-title"><Compass size={14} /> A PERSONAL TRAVEL JOURNAL</span>
          <nav className="destination-page-nav" aria-label="Destination collections">
            <Link to="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>Overview</Link>
            <Link to="/destinations" aria-current={!starredOnly ? "page" : undefined}>My destinations</Link>
            <Link to="/starred" aria-current={starredOnly ? "page" : undefined}>Starred destinations</Link>
          </nav>
          <Link className="destination-account-link" to="/welcome">Your space</Link>
          <span className="destination-privacy"><LockKeyhole size={12} /> JUST FOR YOU</span>
        </div>
        <header className="destination-intro">
          <div>
            <span className="destination-kicker">{starredOnly ? "THE PLACES YOU KEEP CLOSE" : "YOUR PLACES, YOUR PACE"}</span>
            <h1>{starredOnly ? <>Worth keeping<br /><em>close.</em></> : <>A world of<br /><em>your own.</em></>}</h1>
            <p>{starredOnly ? "A small collection of places you want to find again, whenever the world feels far away." : "Keep the places that stay with you, and leave a little room for the ones still calling."}</p>
          </div>
          {starredOnly ? (
            <Link className="destination-add-button destination-browse-button" to="/destinations">
              Browse destinations <ArrowRight size={15} />
            </Link>
          ) : (
            <button className="destination-add-button" type="button" onClick={openCreate}>
              <Plus size={16} /> Add a place
            </button>
          )}
        </header>
        <div className="destination-rule"><ImageIcon size={15} /><span>Collect moments, not miles</span></div>

        {!starredOnly && (
          <section className="destination-filters" aria-label="Find a destination">
            <div className="destination-filters-heading">
              <div>
                <span className="destination-filter-eyebrow">YOUR JOURNAL</span>
                <h2>Find a place</h2>
              </div>
              <span className="destination-result-count">
                {visibleDestinations.length} {visibleDestinations.length === 1 ? "place" : "places"}
              </span>
            </div>
            <div className="destination-filter-controls">
              <label className="destination-search-field">
                <Search size={16} aria-hidden="true" />
                <span className="sr-only">Search destination names</span>
                <input
                  type="search"
                  value={filters.search}
                  placeholder="Search places"
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                />
              </label>
              <label className="destination-filter-select">
                <span>Country</span>
                <select
                  aria-label="Filter by country"
                  value={filters.countryId}
                  onChange={(event) => setFilters((current) => ({ ...current, countryId: event.target.value }))}
                >
                  <option value="">Everywhere</option>
                  {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
                </select>
              </label>
              <label className="destination-filter-select">
                <span>Status</span>
                <select
                  aria-label="Filter by visit status"
                  value={filters.status}
                  onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DestinationStatusFilter }))}
                >
                  <option value="all">All</option>
                  <option value="visited">Visited</option>
                  <option value="wishlist">Wishlist</option>
                </select>
              </label>
              <label className="destination-filter-select destination-sort-select">
                <span>Sort by</span>
                <select
                  aria-label="Sort destinations"
                  value={filters.sort}
                  onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as DestinationSort }))}
                >
                  <option value="newest">Most recently added</option>
                  <option value="oldest">Oldest added</option>
                  <option value="name-asc">Name (A–Z)</option>
                  <option value="name-desc">Name (Z–A)</option>
                </select>
              </label>
              {filtersAreActive && (
                <button className="destination-clear-filters" type="button" onClick={clearFilters}>
                  <RotateCcw size={13} /> Clear Filters
                </button>
              )}
            </div>
          </section>
        )}

        {(error || actionError) && (
          <div className="destination-page-error" role="alert" tabIndex={-1} ref={errorFocusRef}>
            <AlertCircle size={17} />
            <div>{actionError || error}</div>
            {error && !actionError && <button type="button" onClick={() => void reload()}>Try again</button>}
            {actionError && <button type="button" onClick={() => setActionError("")}>Dismiss</button>}
          </div>
        )}

        {starsError && (
          <div className="destination-page-error destination-star-error" role="alert">
            <AlertCircle size={17} />
            <div>{starsError}</div>
            <button type="button" onClick={() => void reloadStars()}>Try again</button>
          </div>
        )}

        {loading || (starredOnly && starsLoading) ? (
          <LoadingCollection />
        ) : error ? (
          null
        ) : starredOnly && starsError ? (
          null
        ) : starredOnly && visibleDestinations.length === 0 ? (
          <section className="destination-section" aria-labelledby="starred-empty-title">
            <div className="destination-empty destination-star-empty">
              <span className="destination-empty-mark"><Star size={20} /></span>
              <h3 id="starred-empty-title">Nothing starred just yet.</h3>
              <p>When a place feels worth keeping close, star it from your destinations and it will be waiting here.</p>
              <Link to="/destinations">Browse my destinations</Link>
            </div>
          </section>
        ) : (
          <>
            {!starredOnly && filtersAreActive && visibleDestinations.length === 0 ? (
              <section className="destination-section" aria-live="polite">
                <div className="destination-empty destination-filter-empty">
                  <span className="destination-empty-mark"><Search size={19} /></span>
                  <h3>No places found this time.</h3>
                  <p>Try another name or widen your filters. Your saved places are still right where you left them.</p>
                  <button type="button" onClick={clearFilters}>Clear Filters</button>
                </div>
              </section>
            ) : (
              <>
                {renderSection("Been there", starredOnly ? "STARRED MEMORIES" : "PLACES THAT STAY", visited, starredOnly ? "No visited places starred." : "The first page is waiting.", starredOnly ? "Star a visited place and it will find a home here." : "When somewhere leaves a mark, save it here so you can find your way back.", false)}
                {renderSection("Want to visit", starredOnly ? "STARRED POSSIBILITIES" : "PLACES TO COME", wishlist, starredOnly ? "No future trips starred." : "Somewhere on your mind?", starredOnly ? "Keep a dream destination close by starring it from your list." : "Save the places you’re dreaming about, and keep them close until the day you go.", !starredOnly)}
              </>
            )}
          </>
        )}
        <footer className="destination-footer">
          <span>Elsewhere · Your own corner of the world</span>
          <span><LockKeyhole size={12} /> Private by nature</span>
        </footer>
      </div>

      {formTarget !== undefined && (
        <DestinationFormDialog
          key={formTarget?.id ?? "new-destination"}
          countries={countries}
          initial={getFormInitial(formTarget)}
          editing={!!formTarget}
          busy={mutationBusy}
          mutationError={actionError}
          onClose={() => { if (!mutationBusy) { setFormTarget(undefined); setActionError(""); } }}
          onSubmit={submitDestination}
        />
      )}

      {activeNotesDestination && (
        <TravelNotesDialog
          destination={activeNotesDestination}
          busy={notesBusy}
          onClose={() => { if (!notesBusy) setNotesTarget(null); }}
          onSave={submitTravelNotes}
          onUploadPhoto={uploadPhoto}
          onRemovePhoto={removePhoto}
        />
      )}

      {deleteTarget && (
        <div className="destination-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !mutationBusy) setDeleteTarget(null); }}>
          <section className="destination-confirm" role="alertdialog" aria-modal="true" aria-labelledby="destination-delete-title" aria-describedby="destination-delete-description">
            <div className="destination-dialog-head">
              <div>
                <span className="destination-dialog-kicker">A thoughtful pause</span>
                <h2 id="destination-delete-title">Let this place go?</h2>
              </div>
              <button className="destination-close" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close confirmation" disabled={mutationBusy}><X size={18} /></button>
            </div>
            <p className="destination-confirm-copy" id="destination-delete-description">
              <strong>{deleteTarget.name}</strong> will be removed from your journal. This can’t be undone.
            </p>
            <div className="destination-confirm-actions">
              <button className="destination-cancel-button" type="button" onClick={() => setDeleteTarget(null)} disabled={mutationBusy}>Keep this place</button>
              <button className="destination-delete-button" type="button" onClick={() => void confirmDelete()} disabled={mutationBusy}>
                {mutationBusy ? "Removing…" : "Remove place"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
