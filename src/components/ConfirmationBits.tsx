import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/* Shared building blocks for the Confirmations page (Stays + Flights tabs). */

export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Fallback for browsers that block the async clipboard API.
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border border-line text-ink-soft hover:text-vermillion hover:border-vermillion transition-colors"
    >
      {copied ? 'Copied ✓' : label}
    </button>
  );
}

/** A confidential value (PIN) hidden until tapped. */
export function SecretValue({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono text-lg text-ink tracking-wider">
        {shown ? value : '•'.repeat(value.length)}
      </span>
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="text-[11px] uppercase tracking-wider font-semibold px-2 py-1 rounded-md border border-line text-ink-soft hover:text-vermillion hover:border-vermillion"
      >
        {shown ? 'Hide' : 'Show'}
      </button>
      {shown && <CopyButton value={value} />}
    </span>
  );
}

export function QrBlock({ payload, label }: { payload: string; label?: string }) {
  const [svg, setSvg] = useState<string>('');
  useEffect(() => {
    let alive = true;
    QRCode.toString(payload, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })
      .then((s) => alive && setSvg(s))
      .catch(() => alive && setSvg(''));
    return () => {
      alive = false;
    };
  }, [payload]);
  if (!svg) return null;
  return (
    <figure className="shrink-0 w-36">
      {/* QR codes must stay dark-on-white to scan, regardless of theme. */}
      <div
        className="bg-white rounded-xl p-2 border border-line [&>svg]:w-full [&>svg]:h-auto"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {label && (
        <figcaption className="mt-1.5 text-[10px] text-ink-faint text-center leading-tight">
          {label}
        </figcaption>
      )}
    </figure>
  );
}

export function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 py-2 border-t border-line first:border-t-0">
      <dt className="text-[11px] uppercase tracking-wider text-ink-faint pt-0.5">{label}</dt>
      <dd className="text-sm text-ink min-w-0 break-words">{children}</dd>
    </div>
  );
}


/** Stands in for a confirmation number that is deliberately kept off the public site. */
export function PrivateNumberLink({ url, label }: { url?: string; label: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-vermillion/40 bg-paper p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest text-vermillion font-semibold">{label}</p>
        <p className="text-sm text-ink-soft mt-0.5">Kept on your private page, not on this public site.</p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] uppercase tracking-wider font-semibold px-3 py-2 rounded-md border border-vermillion text-vermillion no-underline hover:bg-vermillion hover:text-paper"
        >
          Open ↗
        </a>
      )}
    </div>
  );
}
