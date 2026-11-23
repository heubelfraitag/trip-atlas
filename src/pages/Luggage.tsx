import { CopyButton } from '../components/ConfirmationBits';
import { formatDateMid } from '../lib/format';
import type { LuggageStep, Trip } from '../types/trip';

function StepCard({ step, index }: { step: LuggageStep; index: number }) {
  return (
    <article id={step.id} className="border border-line rounded-2xl bg-paper-soft p-5 sm:p-6 scroll-mt-6">
      <p className="text-xs uppercase tracking-widest text-ink-faint">
        Step {index + 1} · {formatDateMid(step.date)}
      </p>
      <h2 className="font-display text-2xl sm:text-3xl text-ink mt-1 leading-tight">{step.title}</h2>
      <p className="text-sm text-ink-soft mt-1">{step.how}</p>

      {/* The card to hold up at a front desk: big Japanese, meaning underneath. */}
      {step.card && (
        <div className="mt-5 rounded-xl border-2 border-vermillion/40 bg-paper p-4">
          <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">
            {step.card.label}
          </p>
          <div className="mt-2 space-y-1" lang="ja">
            {step.card.ja.map((line, i) => (
              <p key={i} className="text-xl sm:text-2xl text-ink leading-snug">
                {line}
              </p>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-soft leading-relaxed">It says: {step.card.en}</p>
          <div className="mt-3">
            <CopyButton value={step.card.ja.join('\n')} label="Copy 日本語" />
          </div>
        </div>
      )}

      {step.notes && step.notes.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {step.notes.map((n, i) => (
            <li key={i} className="text-sm text-ink-soft flex gap-2">
              <span className="text-vermillion shrink-0">•</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      {(step.mapsUrl || step.sourceUrl) && (
        <div className="mt-4 flex gap-2 flex-wrap">
          {step.mapsUrl && (
            <a
              href={step.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border border-vermillion text-vermillion no-underline hover:bg-vermillion hover:text-paper"
            >
              Open in Maps ↗
            </a>
          )}
          {step.sourceUrl && (
            <a
              href={step.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border border-line text-ink-soft no-underline hover:text-vermillion hover:border-vermillion"
            >
              Yamato's page ↗
            </a>
          )}
        </div>
      )}
    </article>
  );
}

export default function LuggageTab({ trip }: { trip: Trip }) {
  const steps = [...(trip.luggage ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  if (steps.length === 0) return <p className="text-sm text-ink-faint">No luggage plan on file.</p>;
  return (
    <div>
      <p className="text-ink-soft mb-4 text-sm">
        Where the big bags go, step by step. Hotels send them by Yamato courier, about ¥2,000–3,500 a
        bag, arriving the next day.
      </p>
      <ol className="mb-6 border border-line rounded-2xl divide-y divide-line overflow-hidden">
        {steps.map((s, i) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-2.5 no-underline hover:bg-paper-soft"
            >
              <span className="min-w-0">
                <span className="text-ink-faint text-xs mr-2">{i + 1}</span>
                <span className="text-ink text-sm">{s.title}</span>
              </span>
              <span className="text-xs text-ink-faint shrink-0">{formatDateMid(s.date)}</span>
            </a>
          </li>
        ))}
      </ol>
      <div className="space-y-6">
        {steps.map((s, i) => (
          <StepCard key={s.id} step={s} index={i} />
        ))}
      </div>
    </div>
  );
}
