import { CopyButton, PrivateNumberLink, Row } from '../components/ConfirmationBits';
import { formatDateMid, formatTime12 } from '../lib/format';
import type { FlightBooking, FlightSegment, Trip } from '../types/trip';

function SegmentRow({ seg }: { seg: FlightSegment }) {
  return (
    <div className="rounded-xl bg-paper border border-line p-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="font-mono text-lg text-ink">
          {seg.flight}
          <span className="font-sans text-xs text-ink-faint ml-2">
            {seg.operatedBy ?? seg.airline}
          </span>
        </p>
        <p className="text-xs text-ink-soft">{formatDateMid(seg.date)}</p>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div>
          <p className="font-display text-3xl text-ink leading-none">{seg.from}</p>
          <p className="text-sm text-ink mt-1">{formatTime12(seg.depart)}</p>
          {seg.fromTerminal && <p className="text-xs text-ink-faint">{seg.fromTerminal}</p>}
        </div>
        <span className="text-vermillion text-xl" aria-hidden>
          →
        </span>
        <div className="text-right">
          <p className="font-display text-3xl text-ink leading-none">{seg.to}</p>
          <p className="text-sm text-ink mt-1">
            {formatTime12(seg.arrive)}
            {seg.arriveDate && seg.arriveDate !== seg.date && (
              <span className="text-xs text-gold ml-1">{formatDateMid(seg.arriveDate)}</span>
            )}
          </p>
          {seg.toTerminal && <p className="text-xs text-ink-faint">{seg.toTerminal}</p>}
        </div>
      </div>

      {(seg.seats || seg.cabin) && (
        <p className="mt-3 text-sm text-ink-soft">
          {seg.cabin && <span className="mr-2">{seg.cabin}</span>}
          {seg.seats && <span>Seats {seg.seats}</span>}
        </p>
      )}
    </div>
  );
}

function FlightCard({ booking, privateUrl }: { booking: FlightBooking; privateUrl?: string }) {
  const first = booking.segments[0];
  return (
    <article id={booking.id} className="border border-line rounded-2xl bg-paper-soft p-5 sm:p-6 scroll-mt-6">
      <p className="text-xs uppercase tracking-widest text-ink-faint">
        {booking.label}
        {first ? ` · ${formatDateMid(first.date)}` : ''}
      </p>
      <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1 leading-tight">
        {booking.segments.map((s) => s.from).join(' → ')} →{' '}
        {booking.segments[booking.segments.length - 1]?.to}
      </h2>

      <div className="mt-5">
        {booking.bookingRef ? (
          <div className="rounded-xl border-2 border-vermillion/40 bg-paper p-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">
                Booking reference{booking.platform ? ` · ${booking.platform}` : ''}
              </p>
              <p className="font-mono text-2xl sm:text-3xl text-ink tracking-wider mt-0.5">
                {booking.bookingRef}
              </p>
            </div>
            <CopyButton value={booking.bookingRef} />
          </div>
        ) : (
          <PrivateNumberLink
            url={privateUrl}
            label={`Booking reference${booking.platform ? ` · ${booking.platform}` : ''}`}
          />
        )}
      </div>

      <div className="mt-5 space-y-3">
        {booking.segments.map((s) => (
          <SegmentRow key={`${s.flight}-${s.date}`} seg={s} />
        ))}
      </div>

      <dl className="mt-5">
        {booking.partnerRef && <Row label="Partner ref">{booking.partnerRef}</Row>}
        {booking.passengers && booking.passengers.length > 0 && (
          <Row label="Passengers">
            <span className="flex flex-col">
              {booking.passengers.map((p) => (
                <span key={p}>{p}</span>
              ))}
            </span>
          </Row>
        )}
        {booking.ticketNumbers && booking.ticketNumbers.length > 0 && (
          <Row label="Tickets">{booking.ticketNumbers.join(' · ')}</Row>
        )}
        {booking.baggage && <Row label="Baggage">{booking.baggage}</Row>}
        {booking.checkIn && <Row label="Check-in">{booking.checkIn}</Row>}
        {booking.phone && (
          <Row label="Phone">
            <a href={`tel:${booking.phone.replace(/[^+\d]/g, '')}`} className="text-vermillion">
              {booking.phone}
            </a>
          </Row>
        )}
        {booking.confirmationLocation && <Row label="Email is in">{booking.confirmationLocation}</Row>}
        {booking.manageUrl && (
          <Row label="Manage">
            <a href={booking.manageUrl} target="_blank" rel="noreferrer" className="text-vermillion">
              Open booking ↗
            </a>
          </Row>
        )}
      </dl>

      {booking.warnings && booking.warnings.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">
            Watch out for
          </p>
          <ul className="mt-2 space-y-1.5">
            {booking.warnings.map((w, i) => (
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

export default function FlightsTab({ trip }: { trip: Trip }) {
  const flights = [...(trip.flights ?? [])].sort((a, b) =>
    (a.segments[0]?.date ?? '').localeCompare(b.segments[0]?.date ?? '')
  );
  if (flights.length === 0) {
    return <p className="text-sm text-ink-faint">No flights on file.</p>;
  }
  return (
    <div className="space-y-6">
      {flights.map((f) => (
        <FlightCard key={f.id} booking={f} privateUrl={trip.meta.privateConfirmationsUrl} />
      ))}
    </div>
  );
}
