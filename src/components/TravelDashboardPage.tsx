import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Compass,
  Globe2,
  Heart,
  LockKeyhole,
  MapPin,
  Route,
  Sparkles,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDestinationTracker } from "../hooks/useDestinationTracker";
import { calculateDashboardStats } from "../lib/dashboard-stats";
import { pickRandomWishlistDestination } from "../lib/random-destination-picker";
import "./travel-dashboard.css";

function DashboardLoading() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading your travel history" aria-busy="true">
      <div className="dashboard-skeleton-stats">
        {[0, 1, 2, 3].map((item) => <div className="dashboard-skeleton-block dashboard-skeleton-stat" key={item} />)}
      </div>
      <div className="dashboard-skeleton-block dashboard-skeleton-chart" />
    </div>
  );
}

function DashboardTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ dataKey?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-tooltip">
      <strong>{label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey}>{entry.dataKey === "visited" ? "Visited" : "Wishlist"}: {entry.value ?? 0}</span>
      ))}
    </div>
  );
}

export default function TravelDashboardPage() {
  const { destinations, loading, error, reload } = useDestinationTracker();
  const [selectedDestinationId, setSelectedDestinationId] = useState<string | null>(null);
  const stats = useMemo(() => calculateDashboardStats(destinations), [destinations]);
  const selectedDestination = destinations.find((destination) => destination.id === selectedDestinationId) ?? null;
  const hasWishlist = destinations.some((destination) => destination.status === "wishlist");
  const chartData = [
    { category: "Places", visited: stats.visitedDestinations, wishlist: stats.wishlistDestinations },
  ];

  const pickDestination = () => {
    const destination = pickRandomWishlistDestination(destinations, selectedDestinationId);
    setSelectedDestinationId(destination?.id ?? null);
  };

  return (
    <main className="travel-dashboard">
      <div className="dashboard-inner">
        <div className="dashboard-topline">
          <Link className="dashboard-brand" to="/">Elsewhere</Link>
          <span>YOUR TRAVEL, AT A GLANCE</span>
          <nav className="dashboard-nav" aria-label="Travel journal navigation">
            <Link to="/dashboard" aria-current="page">Overview</Link>
            <Link to="/destinations">My destinations</Link>
            <Link to="/starred">Starred</Link>
          </nav>
          <Link className="dashboard-account" to="/welcome">Your space</Link>
        </div>

        <header className="dashboard-intro">
          <div>
            <span className="dashboard-kicker">A RECORD OF EVERYWHERE</span>
            <h1>Your travels,<br /><em>gathered here.</em></h1>
            <p>A little look back at the places you’ve been, alongside the places still finding their way onto your map.</p>
          </div>
          <Link className="dashboard-add-link" to="/destinations">Add a destination <ArrowRight size={15} /></Link>
        </header>

        <div className="dashboard-rule" aria-hidden="true"><Compass className="dashboard-rule-mark" size={15} strokeWidth={1.6} /></div>

        {!loading && !error && (
          <section className="dashboard-picker" aria-labelledby="dashboard-picker-title">
            <div className="dashboard-picker-copy">
              <span className="dashboard-picker-eyebrow"><Sparkles size={13} /> A LITTLE NUDGE FROM ELSEWHERE</span>
              <h2 id="dashboard-picker-title">Let your wish list <em>choose the way.</em></h2>
              <p>A small moment of discovery, picked from the places you’ve been dreaming about.</p>
            </div>
            <div className={`dashboard-picker-stage${selectedDestination ? " has-selection" : ""}`}>
              {!hasWishlist ? (
                <div className="dashboard-picker-empty">
                  <span className="dashboard-picker-mark"><Compass size={19} strokeWidth={1.5} /></span>
                  <div>
                    <strong>No wishes on the map just yet.</strong>
                    <p>Add somewhere you’d love to go, then let chance choose your next story.</p>
                    <Link to="/destinations">Add a wish <ArrowRight size={14} /></Link>
                  </div>
                </div>
              ) : (
                <>
                  {selectedDestination ? (
                    <div className="dashboard-picker-result" aria-live="polite" key={selectedDestination.id}>
                      <span className="dashboard-picker-result-label">YOUR NEXT POSSIBILITY</span>
                      <MapPin size={21} strokeWidth={1.5} aria-hidden="true" />
                      <strong>{selectedDestination.name}</strong>
                      <span>{selectedDestination.countryName}</span>
                    </div>
                  ) : (
                    <div className="dashboard-picker-prompt">
                      <span className="dashboard-picker-orbit" aria-hidden="true"><Compass size={27} strokeWidth={1.25} /></span>
                      <span>There’s a place with your name on it.</span>
                    </div>
                  )}
                  <button className="dashboard-picker-button" type="button" onClick={pickDestination}>
                    {selectedDestination ? "Pick Again" : "Pick My Next Trip!"}
                    <ArrowRight size={15} />
                  </button>
                </>
              )}
            </div>
          </section>
        )}

        {loading ? (
          <DashboardLoading />
        ) : error ? (
          <section className="dashboard-error" role="alert" aria-labelledby="dashboard-error-title">
            <span className="dashboard-empty-icon"><Compass size={20} /></span>
            <h2 id="dashboard-error-title">Your journal is just out of reach.</h2>
            <p>We couldn’t bring your travel history in right now. Your saved places are still yours; please try again in a moment.</p>
            <button className="dashboard-retry" type="button" onClick={() => void reload()}>Try again</button>
          </section>
        ) : destinations.length === 0 ? (
          <section className="dashboard-empty" aria-labelledby="dashboard-empty-title">
            <span className="dashboard-empty-icon"><MapPin size={20} /></span>
            <h2 id="dashboard-empty-title">Your first place is waiting.</h2>
            <p>Start with somewhere you’ve loved, or a place you’re still dreaming about. Your story can begin anywhere.</p>
            <Link className="dashboard-add-link" to="/destinations">Add your first destination <ArrowRight size={15} /></Link>
          </section>
        ) : (
          <>
            <section className="dashboard-stat-grid" aria-label="Travel statistics">
              <article className="dashboard-stat">
                <span className="dashboard-stat-label"><Route size={14} /> Saved places</span>
                <strong className="dashboard-stat-value">{stats.totalDestinations}</strong>
                <span className="dashboard-stat-note">Your collection so far</span>
              </article>
              <article className="dashboard-stat">
                <span className="dashboard-stat-label"><MapPin size={14} /> Visited</span>
                <strong className="dashboard-stat-value">{stats.visitedDestinations}</strong>
                <span className="dashboard-stat-note">Places that stay with you</span>
              </article>
              <article className="dashboard-stat">
                <span className="dashboard-stat-label"><Heart size={14} /> On your list</span>
                <strong className="dashboard-stat-value">{stats.wishlistDestinations}</strong>
                <span className="dashboard-stat-note">Somewhere still calling</span>
              </article>
              <article className="dashboard-stat">
                <span className="dashboard-stat-label"><Globe2 size={14} /> Countries</span>
                <strong className="dashboard-stat-value">{stats.uniqueCountries}</strong>
                <span className="dashboard-stat-note">Across your saved places</span>
              </article>
            </section>

            <section className="dashboard-chart-panel" aria-labelledby="dashboard-chart-title">
              <div className="dashboard-chart-header">
                <div>
                  <span className="dashboard-chart-eyebrow">THE JOURNEY SO FAR</span>
                  <h2 id="dashboard-chart-title">Been there, or someday?</h2>
                </div>
                <p>Saved places by story</p>
              </div>
              <div className="dashboard-chart" role="img" aria-label={`Comparison of your saved destinations: ${stats.visitedDestinations} visited and ${stats.wishlistDestinations} on your wishlist.`}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 12, left: -16, bottom: 2 }} barCategoryGap="56%">
                    <CartesianGrid vertical={false} stroke="#e7e5dd" strokeDasharray="3 5" />
                    <XAxis dataKey="category" axisLine={{ stroke: "#dcdcd3" }} tickLine={false} />
                    <YAxis allowDecimals={false} axisLine={false} tickLine={false} width={34} />
                    <Tooltip content={<DashboardTooltip />} cursor={{ fill: "rgba(220, 231, 232, .28)" }} />
                    <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} />
                    <Bar dataKey="visited" name="Visited" fill="#718f83" maxBarSize={62} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="wishlist" name="Wishlist" fill="#d0b58b" maxBarSize={62} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="dashboard-chart-footnote">
                <span><strong>{stats.visitedDestinations}</strong> visited</span>
                <span><strong>{stats.wishlistDestinations}</strong> still on your mind</span>
              </div>
            </section>
          </>
        )}

        <footer className="dashboard-footer">
          <span>Elsewhere · Your own corner of the world</span>
          <span><LockKeyhole size={12} /> Private by nature</span>
        </footer>
      </div>
    </main>
  );
}
