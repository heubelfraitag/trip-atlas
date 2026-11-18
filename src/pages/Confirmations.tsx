import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { getTrip } from '../data/trips';
import StaysTab from './Stays';
import FlightsTab from './Flights';
import TrainsTab from './Trains';

const TABS = [
  { key: 'stays', label: 'Stays' },
  { key: 'flights', label: 'Flights' },
  { key: 'trains', label: 'Trains' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function Confirmations() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const trip = slug ? getTrip(slug) : undefined;
  if (!trip) return <Navigate to="/" replace />;

  const raw = params.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'stays';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
      <nav className="mb-4 text-xs text-ink-faint">
        <Link to={`/${trip.slug}`} className="hover:text-vermillion no-underline">
          ← {trip.meta.name}
        </Link>
      </nav>

      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest font-semibold text-vermillion">
          Confirmations
        </p>
        <h1 className="font-display text-4xl sm:text-5xl text-ink mt-2 leading-tight">
          Everything you'll be asked for
        </h1>
      </header>

      {trip.meta.privateConfirmationsUrl && (
        <a
          href={trip.meta.privateConfirmationsUrl}
          target="_blank"
          rel="noreferrer"
          className="mb-6 flex items-center justify-between gap-3 border-2 border-vermillion rounded-2xl px-4 py-3 bg-paper-soft no-underline group"
        >
          <span className="min-w-0">
            <span className="block text-[10px] uppercase tracking-widest font-semibold text-vermillion">
              Confirmation numbers &amp; PINs
            </span>
            <span className="block text-sm text-ink mt-0.5">
              On your private page — this site is public, so they're kept off it.
            </span>
          </span>
          <span className="text-vermillion text-xl group-hover:translate-x-1 transition-transform">↗</span>
        </a>
      )}

      <div role="tablist" className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setParams(t.key === 'stays' ? {} : { tab: t.key }, { replace: true })}
              className={`px-4 py-2 -mb-px text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? 'border-vermillion text-vermillion'
                  : 'border-transparent text-ink-faint hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'stays' && <StaysTab trip={trip} />}
      {tab === 'flights' && <FlightsTab trip={trip} />}
      {tab === 'trains' && <TrainsTab trip={trip} />}
    </div>
  );
}
