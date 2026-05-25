import { useEffect, useMemo, useState } from 'react';
import type { Activity, Trip } from '../types/trip';
import CategoryBadge from './CategoryBadge';
import OpenInMapsButton from './OpenInMapsButton';
import AddIdeaModal from './AddIdeaModal';
import { cityColor } from '../lib/maps';
import { formatCurrency } from '../lib/format';
import {
  deleteUserIdea,
  getUserIdeas,
  importUserIdeas,
  type UserIdea,
} from '../lib/storage';
import { buildShareUrl, decodeIdeasFromUrl, encodeIdeasForUrl } from '../lib/shareIdeas';

interface Props {
  trip: Trip;
}

interface DisplayIdea {
  source: 'json' | 'user';
  id: string;
  city: string;
  title: string;
  category: Activity['category'];
  description?: string;
  address?: string;
  link?: string;
  bookingUrl?: string;
  lat?: number;
  lng?: number;
  costPerPerson?: number;
  currency?: string;
  raw?: UserIdea;
}

export default function WishlistSection({ trip }: Props) {
  const [openCity, setOpenCity] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserIdea | null>(null);
  const [userIdeas, setUserIdeas] = useState<UserIdea[]>([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  function reload() {
    setUserIdeas(getUserIdeas(trip.slug));
  }

  useEffect(() => {
    reload();
  }, [trip.slug]);

  // Check the URL once for a ?ideas= payload (shared from a partner's device).
  useEffect(() => {
    const u = new URL(window.location.href);
    const payload = u.searchParams.get('ideas');
    if (!payload) return;
    const decoded = decodeIdeasFromUrl(payload);
    if (decoded.length === 0) {
      setImportStatus("Couldn't read that share link.");
      return;
    }
    const ok = window.confirm(`Import ${decoded.length} idea${decoded.length === 1 ? '' : 's'} shared with you?`);
    if (ok) {
      const incoming: UserIdea[] = decoded.map((d) => ({
        ...d,
        id: 'ui-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        createdAt: new Date().toISOString(),
      }));
      const added = importUserIdeas(trip.slug, incoming);
      setImportStatus(`Added ${added} new idea${added === 1 ? '' : 's'} (${decoded.length - added} were duplicates).`);
      reload();
    }
    // remove ?ideas param so refresh doesn't re-prompt
    u.searchParams.delete('ideas');
    window.history.replaceState({}, '', u.toString());
  }, [trip.slug]);

  const grouped = useMemo<Record<string, DisplayIdea[]>>(() => {
    const m: Record<string, DisplayIdea[]> = {};
    for (const c of trip.meta.cities) m[c] = [];

    // JSON-defined ideas
    for (const a of trip.wishlist ?? []) {
      const c = a.city ?? 'Other';
      if (!m[c]) m[c] = [];
      m[c].push({
        source: 'json',
        id: a.id,
        city: c,
        title: a.title,
        category: a.category,
        description: a.description,
        address: a.address,
        bookingUrl: a.bookingUrl,
        lat: a.lat,
        lng: a.lng,
        costPerPerson: a.costPerPerson,
        currency: a.currency,
      });
    }

    // User-added ideas
    for (const ui of userIdeas) {
      const c = ui.city || 'Other';
      if (!m[c]) m[c] = [];
      m[c].push({
        source: 'user',
        id: ui.id,
        city: c,
        title: ui.title,
        category: ui.category,
        description: ui.description,
        address: ui.address,
        link: ui.link,
        lat: ui.lat,
        lng: ui.lng,
        raw: ui,
      });
    }
    return m;
  }, [trip.wishlist, trip.meta.cities, userIdeas]);

  const totalIdeas = Object.values(grouped).reduce((s, list) => s + list.length, 0);

  function handleAdd() {
    setEditing(null);
    setModalOpen(true);
  }
  function handleEdit(ui: UserIdea) {
    setEditing(ui);
    setModalOpen(true);
  }
  function handleDelete(id: string) {
    if (!window.confirm('Delete this idea?')) return;
    deleteUserIdea(trip.slug, id);
    reload();
  }
  async function handleShare() {
    if (userIdeas.length === 0) {
      setImportStatus('Add some ideas first, then share.');
      setTimeout(() => setImportStatus(null), 2000);
      return;
    }
    const url = buildShareUrl(trip.slug, encodeIdeasForUrl(userIdeas));
    const shareData: ShareData = {
      title: `${trip.meta.name} — ideas`,
      text: `${userIdeas.length} ideas to consider`,
      url,
    };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(shareData);
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      window.prompt('Copy this URL and send to your partner:', url);
    }
  }

  return (
    <section>
      <div className="flex items-baseline justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl text-ink">Considering</h2>
          <p className="text-xs text-ink-faint">
            {totalIdeas} {totalIdeas === 1 ? 'idea' : 'ideas'} · saved on this device
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleShare}
            className="rounded-md bg-paper-deep text-ink px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase hover:bg-gold-soft hover:text-paper transition-colors"
            title="Share ideas list with someone else's device"
          >
            {shareCopied ? '✓ Link copied' : '↗ Share'}
          </button>
          <button
            onClick={handleAdd}
            className="rounded-md bg-vermillion text-paper px-3 py-1.5 text-[11px] font-semibold tracking-wider uppercase hover:bg-vermillion-soft transition-colors"
          >
            + Add idea
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="mb-3 text-xs px-3 py-2 rounded-md bg-paper-deep text-ink-soft">
          {importStatus}
        </div>
      )}

      <div className="space-y-3">
        {trip.meta.cities.map((city) => {
          const ideas = grouped[city] || [];
          const isOpen = openCity === city;
          const color = cityColor(city);
          return (
            <div
              key={city}
              className="rounded-xl border border-line bg-paper-soft overflow-hidden"
              style={{ borderLeftWidth: 4, borderLeftColor: color }}
            >
              <button
                onClick={() => setOpenCity(isOpen ? null : city)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] tracking-widest uppercase font-semibold"
                    style={{ color }}
                  >
                    {city}
                  </span>
                  <span className="text-xs text-ink-faint">
                    {ideas.length === 0
                      ? 'no ideas yet — tap + Add idea'
                      : `${ideas.length} ${ideas.length === 1 ? 'idea' : 'ideas'}`}
                  </span>
                </div>
                <span className="text-ink-faint text-xs">{isOpen ? '−' : '+'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4">
                  {ideas.length === 0 ? (
                    <div className="text-xs text-ink-faint italic">
                      Nothing here yet. Hit + Add idea above (or up at the top of this section).
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {ideas.map((idea) => (
                        <li
                          key={idea.id}
                          className="rounded-lg bg-paper border border-line p-3"
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <CategoryBadge category={idea.category} />
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-ink/10 text-ink-soft italic">
                                  Idea
                                </span>
                                {idea.source === 'user' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium tracking-wider uppercase bg-gold/15 text-gold">
                                    yours
                                  </span>
                                )}
                              </div>
                              <h4 className="font-display text-base text-ink leading-snug">
                                {idea.title}
                              </h4>
                              {idea.description && (
                                <p className="text-xs text-ink-soft mt-1 leading-snug">
                                  {idea.description}
                                </p>
                              )}
                              {idea.address && (
                                <p className="text-[11px] text-ink-faint mt-1">{idea.address}</p>
                              )}
                              {typeof idea.costPerPerson === 'number' && (
                                <p className="text-[11px] text-ink-faint mt-0.5">
                                  ~{formatCurrency(idea.costPerPerson, idea.currency ?? trip.meta.currency)} pp
                                </p>
                              )}
                              {idea.lat == null && (
                                <p className="text-[11px] text-gold mt-1 italic">
                                  no coords — won't pin on map yet
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {idea.lat != null && idea.lng != null && (
                              <OpenInMapsButton lat={idea.lat} lng={idea.lng} name={idea.title} />
                            )}
                            {(idea.link || idea.bookingUrl) && (
                              <a
                                href={idea.link || idea.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-md bg-paper-deep text-ink px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase no-underline hover:bg-gold-soft hover:text-paper transition-colors"
                              >
                                Link ↗
                              </a>
                            )}
                            {idea.source === 'user' && idea.raw && (
                              <>
                                <button
                                  onClick={() => handleEdit(idea.raw!)}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-paper-deep text-ink px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase hover:bg-gold-soft hover:text-paper transition-colors"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(idea.id)}
                                  className="inline-flex items-center gap-1.5 rounded-md text-ink-faint hover:text-vermillion px-2.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AddIdeaModal
        trip={trip}
        open={modalOpen}
        initial={editing}
        onClose={() => setModalOpen(false)}
        onSaved={reload}
      />
    </section>
  );
}
