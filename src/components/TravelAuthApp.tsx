import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  BrowserRouter,
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { getFriendlyAuthError, useAuth } from "../auth/AuthContext";
import DestinationTrackerPage from "./DestinationTrackerPage";

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link className={`brand${inverse ? " brand-inverse" : ""}`} to="/" aria-label="Elsewhere home">
      <span className="brand-mark" aria-hidden="true"><Compass size={19} strokeWidth={1.7} /></span>
      <span>elsewhere<span className="brand-period">.</span></span>
    </Link>
  );
}

function Header() {
  const { user } = useAuth();
  return (
    <header className="site-header">
      <Brand />
      <nav className="header-nav" aria-label="Main navigation">
        <span className="header-note">A little space for what’s next</span>
        {user ? (
          <Link className="nav-pill" to="/destinations">My destinations <ArrowRight size={15} /></Link>
        ) : (
          <>
            <Link className="nav-login" to="/login">Log in</Link>
            <Link className="nav-pill" to="/signup">Create an account <ArrowRight size={15} /></Link>
          </>
        )}
      </nav>
    </header>
  );
}

function LandingPage() {
  const { user } = useAuth();
  return (
    <main className="landing">
      <Header />
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" />YOUR TRAVEL, YOUR STORY</div>
          <h1>A place for the<br />places <em>that stay</em><br />with you.</h1>
          <p className="hero-intro">Keep the places you’re dreaming of close, and the journeys you’ve made even closer.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to={user ? "/welcome" : "/signup"}>
              {user ? "Go to your space" : "Make room for wonder"} <ArrowRight size={17} />
            </Link>
            {!user && <Link className="text-link" to="/login">Already have an account? <span>Log in</span></Link>}
          </div>
          <div className="hero-footnote"><LockKeyhole size={14} /> Just for you. Always.</div>
        </div>
        <div className="hero-art" aria-label="Illustration of a quiet coastal landscape">
          <div className="art-sun" />
          <div className="art-cloud art-cloud-one" />
          <div className="art-cloud art-cloud-two" />
          <div className="art-horizon" />
          <div className="art-hill art-hill-back" />
          <div className="art-hill art-hill-front" />
          <div className="art-water" />
          <div className="art-waterline line-one" />
          <div className="art-waterline line-two" />
          <div className="art-waterline line-three" />
          <div className="art-caption"><span>Somewhere to begin</span><strong>Amalfi Coast, Italy</strong></div>
          <div className="art-index">01 <span>/</span> a world of your own</div>
          <div className="art-note"><MapPin size={14} /> ON YOUR MIND</div>
        </div>
        <div className="hero-side-note">COLLECT MOMENTS, NOT MILES</div>
      </section>
      <section className="quiet-section">
        <div className="quiet-number">01 / A PERSONAL TRAVEL JOURNAL</div>
        <div className="quiet-content">
          <h2>For the trip you’re<br /><em>still talking about.</em></h2>
          <div className="quiet-right">
            <p>And the one you haven’t taken yet. Elsewhere is your private corner of the world: a gentle place to hold onto the feeling of being somewhere new, and make space for where you’ll go next.</p>
            <Link to={user ? "/welcome" : "/signup"} className="underlined-link">{user ? "Return to your space" : "Start your own journal"} <ArrowDownRight size={17} /></Link>
          </div>
        </div>
        <div className="quote-strip">
          <Sparkles size={17} />
          <span>Not a checklist. A collection of places that mean something.</span>
          <span className="quote-mark">“</span>
        </div>
      </section>
      <footer className="landing-footer"><Brand /><span>A quieter way to keep the world close.</span><span>PRIVATE BY NATURE</span></footer>
    </main>
  );
}

function AuthFrame({ children, mode }: { children: ReactNode; mode: "login" | "signup" }) {
  return (
    <main className="auth-shell">
      <div className="auth-visual">
        <div className="auth-visual-top"><Brand inverse /><span>YOUR OWN LITTLE ELSEWHERE</span></div>
        <div className="visual-landscape" aria-hidden="true">
          <div className="visual-moon" />
          <div className="visual-ridge ridge-far" />
          <div className="visual-ridge ridge-near" />
          <div className="visual-lake" />
          <div className="visual-reflection" />
        </div>
        <div className="visual-quote">
          <span className="visual-kicker">{mode === "signup" ? "A NOTE TO YOUR FUTURE SELF" : "GOOD TO HAVE YOU BACK"}</span>
           <p>
             {mode === "signup" ? (
               <>The world is wide.<br />Keep a little of it for yourself.</>
             ) : (
               <>Some places never really<br />leave you, do they?</>
             )}
           </p>
          <span className="visual-byline">{mode === "signup" ? "YOUR JOURNAL STARTS HERE" : "PICK UP WHERE YOU LEFT OFF"}</span>
        </div>
        <div className="visual-bottom"><span>PRIVATE. PERSONAL. YOURS.</span><span>ELSEWHERE JOURNAL · EST. TODAY</span></div>
      </div>
      <section className="auth-panel">
        <div className="auth-mobile-brand"><Brand /></div>
        <div className="auth-content">{children}</div>
        <div className="auth-footer"><LockKeyhole size={13} /> Your travel journal is yours alone.</div>
      </section>
    </main>
  );
}

function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const { configured, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      document.getElementById("auth-email")?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("That email address doesn’t look quite right. Check it and try again.");
      document.getElementById("auth-email")?.focus();
      return;
    }
    if (!password) {
      setError("Please enter a password.");
      document.getElementById("auth-password")?.focus();
      return;
    }
    if (signup && password.length < 8) {
      setError("Choose a password with at least 8 characters.");
      document.getElementById("auth-password")?.focus();
      return;
    }
    if (signup && !confirmPassword) {
      setError("Please enter your password one more time.");
      document.getElementById("auth-confirm")?.focus();
      return;
    }
    if (signup && password !== confirmPassword) {
      setError("Those passwords don’t match yet. Give it another try.");
      document.getElementById("auth-confirm")?.focus();
      return;
    }
    if (!configured) {
      setError("Account access isn’t set up yet. Add your Supabase project URL and anon key in Replit Secrets, then try again.");
      return;
    }
    setBusy(true);
    try {
      if (signup) {
        const result = await signUp(cleanEmail, password);
        if (result.confirmationRequired) {
          setSuccess("Your account is nearly ready. Check your inbox for a confirmation link, then come back to log in.");
        } else {
          navigate("/welcome", { replace: true });
        }
      } else {
        await signIn(cleanEmail, password);
        const from = (location.state as { from?: string } | null)?.from;
        navigate(from || "/welcome", { replace: true });
      }
    } catch (cause) {
      setError(getFriendlyAuthError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthFrame mode={mode}>
      <Link className="back-link" to="/"><ArrowLeft size={15} /> Back to Elsewhere</Link>
      <div className="auth-heading">
        <span className="eyebrow"><span className="eyebrow-line" />{signup ? "A NEW PAGE" : "WELCOME BACK"}</span>
        <h1>{signup ? <>Make yourself<br /><em>at home.</em></> : <>Come on<br /><em>in again.</em></>}</h1>
        <p>{signup ? "A private place for all the places you love." : "Your places are right where you left them."}</p>
      </div>
      {!configured && (
        <div className="notice notice-setup" role="status">
          <strong>A little setup first</strong>
          <span>Connect Supabase by adding your project URL and anon key in Replit Secrets. Your account will be ready once it’s connected.</span>
        </div>
      )}
      {success && (
        <div className="notice notice-success" role="status">
          <span className="notice-icon"><Check size={16} /></span>
          <span>{success}</span>
        </div>
      )}
      <form className="auth-form" onSubmit={submit} noValidate>
        <label htmlFor="auth-email">Email address</label>
        <div className="input-wrap"><Mail size={17} /><input id="auth-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} aria-describedby={error ? "form-error" : undefined} /></div>
        <div className="password-label-row">
          <label htmlFor="auth-password">Password</label>
          {!signup && <span>At least 8 characters</span>}
        </div>
        <div className="input-wrap"><LockKeyhole size={17} /><input id="auth-password" type="password" autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "Create a password" : "Your password"} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby={error ? "form-error" : undefined} /></div>
        {signup && (
          <>
            <label htmlFor="auth-confirm">Confirm password</label>
            <div className="input-wrap"><LockKeyhole size={17} /><input id="auth-confirm" type="password" autoComplete="new-password" placeholder="Type it once more" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} aria-describedby={error ? "form-error" : undefined} /></div>
          </>
        )}
        {error && <p className="form-error" id="form-error" role="alert">{error}</p>}
        <button className="button button-primary auth-submit" type="submit" disabled={busy}>
          {busy ? <><LoaderCircle size={17} className="loading-icon" /> {signup ? "Making your space…" : "Opening your journal…"}</> : <>{signup ? "Create your account" : "Log in to Elsewhere"} <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="auth-switch">
        {signup ? "Already have a space?" : "New to Elsewhere?"}{" "}
        <Link to={signup ? "/login" : "/signup"}>{signup ? "Log in" : "Create an account"}</Link>
      </p>
    </AuthFrame>
  );
}

function WelcomePage() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function leave() {
    setBusy(true);
    setError("");
    try {
      await signOut();
      navigate("/", { replace: true });
    } catch (cause) {
      setError(getFriendlyAuthError(cause));
      setBusy(false);
    }
  }
  const firstName = (profile?.email || user?.email || "").split("@")[0];
  return (
    <main className="welcome-page">
      <Header />
      <section className="welcome-card">
        <div className="welcome-stamp"><Compass size={25} strokeWidth={1.5} /></div>
        <span className="eyebrow"><span className="eyebrow-line" />YOUR SPACE, YOUR PACE</span>
        <h1>Welcome to<br /><em>Elsewhere{firstName ? `, ${firstName}` : ""}.</em></h1>
        <p>Your private travel journal is ready. A place to keep the moments that matter, and make a little room for the ones still ahead.</p>
        <div className="welcome-rule"><span /><MapPin size={15} /><span /></div>
        <div className="welcome-email"><span>SIGNED IN AS</span><strong>{profile?.email || user?.email}</strong></div>
        <Link className="button button-primary welcome-destinations-link" to="/destinations">
          Open my destinations <ArrowRight size={16} />
        </Link>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="text-link logout-button" type="button" onClick={leave} disabled={busy}>{busy ? "Signing out…" : "Sign out"} <ArrowRight size={15} /></button>
      </section>
      <footer className="landing-footer"><Brand /><span>A quieter way to keep the world close.</span><span>PRIVATE BY NATURE</span></footer>
    </main>
  );
}

function RouteViews() {
  const { loading, user } = useAuth();
  if (loading) {
    return <main className="loading-screen" aria-label="Loading your account"><div className="loading-mark"><Compass size={24} /></div><div className="loading-line" /><span>Finding your place…</span></main>;
  }
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/signup" element={user ? <Navigate to="/welcome" replace /> : <AuthPage mode="signup" />} />
      <Route path="/login" element={user ? <Navigate to="/welcome" replace /> : <AuthPage mode="login" />} />
      <Route path="/welcome" element={user ? <WelcomePage /> : <Navigate to="/login" replace state={{ from: "/welcome" }} />} />
      <Route path="/destinations" element={user ? <DestinationTrackerPage /> : <Navigate to="/login" replace state={{ from: "/destinations" }} />} />
      <Route path="/starred" element={user ? <DestinationTrackerPage /> : <Navigate to="/login" replace state={{ from: "/starred" }} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function TravelAuthApp() {
  return <BrowserRouter><RouteViews /></BrowserRouter>;
}
