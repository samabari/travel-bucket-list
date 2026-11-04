import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowRight,
  Compass,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useDestinationTracker } from "../hooks/useDestinationTracker";
import type { Country, Destination, DestinationInput, DestinationStatus } from "../lib/destinations";
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
  onEdit,
  onDelete,
}: {
  destination: Destination;
  onEdit: (destination: Destination) => void;
  onDelete: (destination: Destination) => void;
}) {
  const photoUrl = safePhotoUrl(destination.photoUrl);
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
  const [validationError, setValidationError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const error = validationError || mutationError;

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  function setField<K extends keyof DestinationForm>(key: K, value: DestinationForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setValidationError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError("");
    const name = form.name.trim();
    const usesNewCountry = form.countryChoice === "new";
    const countryName = form.newCountry.trim();
    if (!name) {
      setValidationError("Give this place a name before saving.");
      nameRef.current?.focus();
      return;
    }
    if ((!usesNewCountry && !form.countryChoice) || (usesNewCountry && !countryName)) {
      setValidationError("Choose a country, or add a new one.");
      document.getElementById(usesNewCountry ? "destination-new-country" : "destination-country")?.focus();
      return;
    }
    const photoUrl = form.photoUrl.trim();
    if (photoUrl) {
      const validUrl = safePhotoUrl(photoUrl);
      if (!validUrl) {
        setValidationError("Enter a complete photo link beginning with http:// or https://.");
        document.getElementById("destination-photo")?.focus();
        return;
      }
    }
    const rating = form.rating.trim() ? Number(form.rating) : null;
    if (rating !== null && !Number.isFinite(rating)) {
      setValidationError("Enter a valid number for your rating, or leave it blank.");
      document.getElementById("destination-rating")?.focus();
      return;
    }
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
            <input ref={nameRef} id="destination-name" name="name" required maxLength={120} placeholder="A city, coastline, little village…" value={form.name} onChange={(event) => setField("name", event.target.value)} />
          </div>
          <div className="destination-field is-full">
            <label htmlFor="destination-country">Country <span aria-hidden="true">*</span></label>
            <select id="destination-country" name="country" value={form.countryChoice} required onChange={(event) => setField("countryChoice", event.target.value)}>
              <option value="">Choose a country</option>
              {countries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
              <option value="new">Add a new country…</option>
            </select>
            {form.countryChoice === "new" && (
              <input
                id="destination-new-country"
                aria-label="New country name"
                name="newCountry"
                required
                maxLength={100}
                placeholder="Country name"
                value={form.newCountry}
                onChange={(event) => setField("newCountry", event.target.value)}
              />
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
            <input id="destination-date" name="visitDate" type="date" value={form.visitDate} onChange={(event) => setField("visitDate", event.target.value)} />
          </div>
          <div className="destination-field">
            <label htmlFor="destination-rating">Personal rating</label>
            <input id="destination-rating" name="rating" type="number" step="any" inputMode="decimal" placeholder="Optional" value={form.rating} onChange={(event) => setField("rating", event.target.value)} />
          </div>
          <div className="destination-field is-full">
            <label htmlFor="destination-notes">A few words to remember it by</label>
            <textarea id="destination-notes" name="notes" maxLength={2000} placeholder="The light, the food, the feeling of getting there…" value={form.notes} onChange={(event) => setField("notes", event.target.value)} />
          </div>
          <div className="destination-field is-full">
            <label htmlFor="destination-photo">Photo link</label>
            <input id="destination-photo" name="photoUrl" type="url" inputMode="url" placeholder="https://…" value={form.photoUrl} onChange={(event) => setField("photoUrl", event.target.value)} aria-describedby="destination-photo-hint" />
            <span className="destination-photo-hint" id="destination-photo-hint">A link to an image is optional. Use a full http or https address.</span>
          </div>
          {error && <p className="destination-form-error" role="alert">{error}</p>}
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
  const { countries, destinations, loading, error, reload, create, update, remove } = useDestinationTracker();
  const [formTarget, setFormTarget] = useState<Destination | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const errorFocusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (actionError) errorFocusRef.current?.focus();
  }, [actionError]);

  useEffect(() => {
    if (formTarget === undefined && !deleteTarget) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !mutationBusy) {
        setFormTarget(undefined);
        setDeleteTarget(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [formTarget, deleteTarget, mutationBusy]);

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

  const visited = destinations.filter((destination) => destination.status === "visited");
  const wishlist = destinations.filter((destination) => destination.status === "wishlist");

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
              <DestinationCard key={destination.id} destination={destination} onEdit={openEdit} onDelete={setDeleteTarget} />
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
          <Link className="destination-account-link" to="/welcome">Your space</Link>
          <span className="destination-privacy"><LockKeyhole size={12} /> JUST FOR YOU</span>
        </div>
        <header className="destination-intro">
          <div>
            <span className="destination-kicker">YOUR PLACES, YOUR PACE</span>
            <h1>A world of<br /><em>your own.</em></h1>
            <p>Keep the places that stay with you, and leave a little room for the ones still calling.</p>
          </div>
          <button className="destination-add-button" type="button" onClick={openCreate}>
            <Plus size={16} /> Add a place
          </button>
        </header>
        <div className="destination-rule"><ImageIcon size={15} /><span>Collect moments, not miles</span></div>

        {(error || actionError) && (
          <div className="destination-page-error" role="alert" tabIndex={-1} ref={errorFocusRef}>
            <AlertCircle size={17} />
            <div>{actionError || error}</div>
            {error && !actionError && <button type="button" onClick={() => void reload()}>Try again</button>}
            {actionError && <button type="button" onClick={() => setActionError("")}>Dismiss</button>}
          </div>
        )}

        {loading ? (
          <LoadingCollection />
        ) : error && destinations.length === 0 ? (
          null
        ) : (
          <>
            {renderSection("Been there", "PLACES THAT STAY", visited, "The first page is waiting.", "When somewhere leaves a mark, save it here so you can find your way back.", false)}
            {renderSection("Want to visit", "PLACES TO COME", wishlist, "Somewhere on your mind?", "Save the places you’re dreaming about, and keep them close until the day you go.", true)}
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
