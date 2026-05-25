import { useEffect, useState } from 'react';

export default function OfflineBadge() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (online) return null;
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[2000] px-3 py-1 rounded-full bg-ink text-paper text-[10px] font-semibold tracking-widest uppercase shadow-card">
      Offline · cached itinerary
    </div>
  );
}
