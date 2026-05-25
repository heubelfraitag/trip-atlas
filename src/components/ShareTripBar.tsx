import { useState } from 'react';
import type { Trip } from '../types/trip';
import { buildICS, downloadICS } from '../lib/ics';

interface Props {
  trip: Trip;
}

export default function ShareTripBar({ trip }: Props) {
  const [copied, setCopied] = useState(false);
  const subscribeHttps = `${window.location.origin}${import.meta.env.BASE_URL}calendar/${trip.slug}.ics`;
  const subscribeWebcal = subscribeHttps.replace(/^https?:/, 'webcal:');
  const shareUrl = window.location.href;

  async function handleShare() {
    const data = {
      title: trip.meta.name,
      text: trip.meta.subtitle || trip.meta.name,
      url: shareUrl,
    };
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(data);
        return;
      } catch {
        /* user cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — fall through */
    }
  }

  function handleDownloadIcs() {
    const ics = buildICS(trip);
    downloadICS(`${trip.slug}.ics`, ics);
  }

  return (
    <div className="flex flex-wrap gap-2 text-xs">
      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 rounded-md bg-ink text-paper px-3 py-1.5 font-semibold tracking-wider uppercase hover:bg-ink-soft transition-colors"
      >
        {copied ? '✓ Link copied' : 'Share trip'}
      </button>
      <button
        onClick={handleDownloadIcs}
        className="inline-flex items-center gap-1.5 rounded-md bg-paper-deep text-ink px-3 py-1.5 font-semibold tracking-wider uppercase hover:bg-gold-soft hover:text-paper transition-colors"
      >
        ↓ Calendar (.ics)
      </button>
      <a
        href={subscribeWebcal}
        className="inline-flex items-center gap-1.5 rounded-md bg-paper-deep text-ink px-3 py-1.5 font-semibold tracking-wider uppercase no-underline hover:bg-gold-soft hover:text-paper transition-colors"
        title="Subscribe — auto-updates as the trip changes"
      >
        ↻ Subscribe
      </a>
    </div>
  );
}
