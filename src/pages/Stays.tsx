import { CopyButton, PrivateNumberLink, Row, SecretValue } from '../components/ConfirmationBits';
import { formatDateMid } from '../lib/format';
import type { Hotel, Trip } from '../types/trip';

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(`${checkIn}T00:00:00Z`).getTime();
  const b = new Date(`${checkOut}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

function PaidPill({ paid }: { paid: boolean | undefined }) {
  if (paid === true)
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        Paid
      </span>
    );
  if (paid === false)
    return (
      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300">
        Not yet charged
      </span>
    );
  return (
    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-line text-ink-faint">
      Payment unconfirmed
    </span>
  );
}

function StayCard({ hotel, index, privateUrl }: { hotel: Hotel; index: number; privateUrl?: string }) {
  const s = hotel.stay ?? {};
  const nights = nightsBetween(hotel.checkIn, hotel.checkOut);
  const displayName = s.propertyName ?? hotel.name;

  return (
    <article
      id={hotel.id}
      className="border border-line rounded-2xl bg-paper-soft p-5 sm:p-6 scroll-mt-6"
    >
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-faint">
            Stay {index + 1} · {nights} night{nights === 1 ? '' : 's'}
            {s.city ? ` · ${s.city}` : ''}
          </p>
          <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1 leading-tight">
            {displayName}
          </h2>
          {s.alternateNote && (
            <p className="text-xs text-gold mt-1 italic">{s.alternateNote}</p>
          )}
          <p className="text-sm text-ink-soft mt-1.5">
            {formatDateMid(hotel.checkIn)}
            {s.checkInTime ? ` · in ${s.checkInTime}` : ''}
            <span className="text-ink-faint"> → </span>
            {formatDateMid(hotel.checkOut)}
            {s.checkOutTime ? ` · out ${s.checkOutTime}` : ''}
          </p>
        </div>
        <PaidPill paid={s.paid} />
      </header>

      {/* The number you hand over at the desk — biggest thing on the card. */}
      {s.confirmation ? (
        <div className="mt-5 rounded-xl border-2 border-vermillion/40 bg-paper p-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">
              Confirmation{s.platform ? ` · ${s.platform}` : ''}
            </p>
            <p className="font-mono text-2xl sm:text-3xl text-ink tracking-wider mt-0.5 break-all">
              {s.confirmation}
            </p>
          </div>
          <CopyButton value={s.confirmation} />
        </div>
      ) : (
        <div className="mt-5">
          <PrivateNumberLink url={privateUrl} label={`Confirmation${s.platform ? ` · ${s.platform}` : ''}`} />
        </div>
      )}

      <dl className="mt-5">
        {s.tripId && (
          <Row label="Trip ID">
            <span className="inline-flex items-center gap-2 flex-wrap">
              <span className="font-mono">{s.tripId}</span>
              <CopyButton value={s.tripId} />
            </span>
          </Row>
        )}
        {s.pin && (
          <Row label="PIN · private">
            <SecretValue value={s.pin} />
          </Row>
        )}
        {s.guestName && <Row label="Under name">{s.guestName}</Row>}
        {s.membership && <Row label="Member #">{s.membership}</Row>}
        {s.meals && <Row label="Meals">{s.meals}</Row>}
        {s.payment && <Row label="Payment">{s.payment}</Row>}
        {s.cancelBy && <Row label="Cancel by">{s.cancelBy}</Row>}
        {s.email && (
          <Row label="Email">
            <span className="inline-flex items-center gap-2 flex-wrap">
              <span className="break-all select-all">{s.email}</span>
              <CopyButton value={s.email} />
            </span>
          </Row>
        )}
        {s.confirmationLocation && <Row label="Email is in">{s.confirmationLocation}</Row>}
        {s.manageUrl && (
          <Row label="Manage">
            <a href={s.manageUrl} target="_blank" rel="noreferrer" className="text-vermillion">
              Open booking ↗
            </a>
          </Row>
        )}
      </dl>

      {/* Getting there — Japanese address first so it can be shown to a driver. */}
      {(s.addressJa || (s.addressEn ?? hotel.address)) && (
        <div className="mt-5 rounded-xl bg-paper p-4 border border-line">
          <p className="text-[10px] uppercase tracking-widest text-ink-faint">
            Getting there · show the driver
          </p>
          {s.addressJa && (
            <p className="text-xl sm:text-2xl text-ink mt-1 leading-snug" lang="ja">
              {s.addressJa}
            </p>
          )}
          {(s.addressEn ?? hotel.address) && (
            <p className="text-sm text-ink-soft mt-1">{s.addressEn ?? hotel.address}</p>
          )}
          {s.phone && (
            <p className="mt-3 text-sm text-ink">
              <span className="text-[10px] uppercase tracking-widest text-ink-faint mr-2">
                Phone · taxi nav
              </span>
              <a href={`tel:${s.phone.replace(/[^+\d]/g, '')}`} className="font-mono text-vermillion">
                {s.phone}
              </a>
            </p>
          )}
          {s.phoneNote && <p className="mt-2 text-xs text-ink-soft leading-relaxed">{s.phoneNote}</p>}
          <div className="mt-3 flex gap-2 flex-wrap">
            {s.mapsUrl && (
              <a
                href={s.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border border-vermillion text-vermillion no-underline hover:bg-vermillion hover:text-paper"
              >
                Open in Maps ↗
              </a>
            )}
            {s.addressJa && <CopyButton value={s.addressJa} label="Copy 日本語" />}
            {(s.addressEn ?? hotel.address) && (
              <CopyButton value={(s.addressEn ?? hotel.address)!} label="Copy English" />
            )}
            {s.phone && <CopyButton value={s.phone} label="Copy phone" />}
          </div>
        </div>
      )}

      {s.warnings && s.warnings.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">
            Watch out for
          </p>
          <ul className="mt-2 space-y-1.5">
            {s.warnings.map((w, i) => (
              <li key={i} className="text-sm text-ink-soft flex gap-2">
                <span className="text-vermillion shrink-0">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export default function StaysTab({ trip }: { trip: Trip }) {
  const hotels = [...trip.hotels].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const totalNights = hotels.reduce((n, h) => n + nightsBetween(h.checkIn, h.checkOut), 0);
  const deadlines = hotels.filter((h) => h.stay?.cancelBy && h.stay.paid !== true);

  return (
    <div>
      <p className="text-ink-soft mb-4 text-sm">
        {hotels.length} stays · {totalNights} nights · in order of check-in
      </p>

      {/* Jump list — tap to scroll to a stay. */}
      <ol className="mb-6 border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {hotels.map((h, i) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 no-underline hover:bg-paper-soft"
            >
              <span className="min-w-0">
                <span className="text-ink-faint text-xs mr-2">{i + 1}</span>
                <span className="text-ink text-sm">{h.stay?.propertyName ?? h.name}</span>
              </span>
              <span className="text-xs text-ink-faint shrink-0">
                {formatDateMid(h.checkIn)} → {formatDateMid(h.checkOut)}
              </span>
            </a>
          </li>
        ))}
      </ol>

      {deadlines.length > 0 && (
        <div className="mb-6 border-2 border-vermillion rounded-2xl p-4 bg-paper-soft">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-vermillion">
            Open decisions
          </p>
          <ul className="mt-2 space-y-1.5">
            {deadlines.map((h) => (
              <li key={h.id} className="text-sm text-ink">
                <a href={`#${h.id}`} className="font-semibold no-underline text-ink hover:text-vermillion">
                  {h.stay?.propertyName ?? h.name}
                </a>
                <span className="text-ink-soft"> — {h.stay?.cancelBy}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        {hotels.map((h, i) => (
          <StayCard key={h.id} hotel={h} index={i} privateUrl={trip.meta.privateConfirmationsUrl} />
        ))}
      </div>

      <p className="mt-10 text-xs text-ink-faint">
        In a taxi, show the driver the 日本語 address, or hand over the hotel's phone number: many
        Japanese taxi navigation systems can find a destination by its phone number. "Open in Maps" is
        for your own walking and train directions.
      </p>
    </div>
  );
}
