import { useEffect, useRef, useState } from 'react';
import { getActivityNote, setActivityNote } from '../lib/storage';

interface Props {
  slug: string;
  activityId: string;
}

export default function ActivityNotes({ slug, activityId }: Props) {
  const [note, setNote] = useState<string>('');
  const [expanded, setExpanded] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setNote(getActivityNote(slug, activityId));
  }, [slug, activityId]);

  useEffect(() => {
    if (expanded && ref.current) {
      ref.current.focus();
      autosize(ref.current);
    }
  }, [expanded]);

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setNote(v);
    setActivityNote(slug, activityId, v);
    autosize(e.target);
  }

  if (!expanded && !note) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="text-[11px] tracking-wider uppercase text-ink-faint hover:text-vermillion mt-1"
      >
        + Add note
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-line bg-paper px-2 py-1.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] tracking-wider uppercase text-ink-faint font-semibold">
          Note
        </span>
        {expanded && (
          <button
            onClick={() => setExpanded(false)}
            className="text-[10px] text-ink-faint hover:text-vermillion"
          >
            Collapse
          </button>
        )}
      </div>
      {expanded ? (
        <textarea
          ref={ref}
          value={note}
          onChange={handleChange}
          rows={2}
          placeholder="Jot anything — table you sat at, what you ordered, who you ran into..."
          className="w-full resize-none bg-transparent text-sm text-ink leading-snug focus:outline-none placeholder:text-ink-faint"
        />
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="block w-full text-left text-sm text-ink whitespace-pre-wrap leading-snug"
        >
          {note}
        </button>
      )}
    </div>
  );
}
