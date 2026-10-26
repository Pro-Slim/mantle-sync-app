import React, { useCallback, useEffect, useState } from 'react';

// mStocks Arena is Hadukem's app. Synch only reads its public numbers and links
// out; every control action stays in the Arena's own admin panel.
const ARENA = {
  stats: 'https://mstocks-arena.vercel.app/api/public/stats',
  admin: 'https://mstocks-arena.vercel.app/admin',
  web: 'https://mstocks-arena.vercel.app/',
  telegram: 'https://t.me/mStocksArenaBot',
};

// The endpoint caches for 60 s, so polling faster only rereads the same answer.
const REFRESH_MS = 60_000;

interface Season {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
}

interface ArenaStats {
  updatedAt: string | null;
  season: Season | null;
  players: { total: number; activeToday: number };
  today: { checkins: number; quizCompleted: number; hlPredictions: number };
  games: [string, string][];
}

const GAME_LABEL: Record<string, string> = {
  checkin: 'Daily check-in',
  quiz: 'Daily quiz',
  higherLower: 'Higher or Lower',
};

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

const parseStats = (raw: unknown): ArenaStats => {
  const root = obj(raw);
  const season = obj(root.season);
  const players = obj(root.players);
  const today = obj(root.today);
  return {
    updatedAt: str(root.updatedAt),
    season: str(season.id)
      ? {
          id: str(season.id)!,
          name: str(season.name) ?? str(season.id)!,
          startsAt: str(season.startsAt),
          endsAt: str(season.endsAt),
        }
      : null,
    players: { total: num(players.total), activeToday: num(players.activeToday) },
    today: {
      checkins: num(today.checkins),
      quizCompleted: num(today.quizCompleted),
      hlPredictions: num(today.hlPredictions),
    },
    games: Object.entries(obj(root.games)).filter((e): e is [string, string] => typeof e[1] === 'string'),
  };
};

const formatDay = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

const seasonDay = (startsAt: string | null): number | null => {
  if (!startsAt) return null;
  const days = Math.floor((Date.now() - new Date(startsAt).getTime()) / 86_400_000) + 1;
  return days > 0 ? days : null;
};

const pillBase = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap';

const Tile: React.FC<{ label: string; value: number | undefined; hint: string }> = ({ label, value, hint }) => (
  <div
    className="rounded-xl px-4 py-3 bg-[rgba(101,179,174,0.06)] border border-[rgba(101,179,174,0.15)]"
    title={hint}
  >
    <div className="text-[11px] uppercase tracking-wide text-[#7FD4D0] opacity-70">{label}</div>
    <div className="mt-1 text-2xl font-bold text-[#E6F4F3] tabular-nums">{value === undefined ? '—' : value.toLocaleString('en-US')}</div>
  </div>
);

const LinkCard: React.FC<{ href: string; title: string; detail: string }> = ({ href, title, detail }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="block rounded-xl px-4 py-3 bg-[rgba(101,179,174,0.06)] border border-[rgba(101,179,174,0.15)] transition-all hover:bg-[rgba(101,179,174,0.14)] hover:border-[#65B3AE]"
  >
    <div className="text-sm font-semibold text-[#E6F4F3]">{title} ↗</div>
    <div className="mt-0.5 text-[11px] text-[#7FD4D0] opacity-70 leading-snug">{detail}</div>
  </a>
);

const MStocksArena: React.FC = () => {
  const [stats, setStats] = useState<ArenaStats | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(ARENA.stats);
      if (!res.ok) throw new Error(String(res.status));
      setStats(parseStats(await res.json()));
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const copyArena = async () => {
    try {
      await navigator.clipboard.writeText('/arena');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const day = seasonDay(stats?.season?.startsAt ?? null);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(101,179,174,0.15)] flex-shrink-0 flex-wrap ribbon-lane">
        <span className="text-[#65B3AE] font-bold text-sm tracking-wide">MSTOCKS ARENA</span>
        <span className="text-[11px] text-[#7FD4D0] opacity-60">
          Hadukem's mini-app · read-only here, run from the Arena admin
        </span>
        <div className="hidden sm:block flex-1" />
        {stats?.updatedAt && (
          <span className="text-[11px] text-[#7FD4D0] opacity-60 tabular-nums">
            Updated{' '}
            {new Date(stats.updatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}{' '}
            UTC
          </span>
        )}
        <button
          onClick={() => void load()}
          disabled={loading}
          className={`${pillBase} text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)] disabled:opacity-50`}
          title="Reload the numbers (they refresh on their own every minute)"
        >
          ↻
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-[#FF6B6B] bg-[rgba(255,107,107,0.08)] border-b border-[rgba(255,107,107,0.25)] flex-shrink-0">
          <span className="flex-1">
            Couldn't reach mStocks Arena{stats ? ', showing the last numbers we got' : ''}. The links below still work.
          </span>
          <button onClick={() => void load()} className="px-2 hover:text-white">
            Try again
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto p-4 space-y-5">
        <section className="flex items-center gap-3 flex-wrap">
          <span className="text-lg font-bold text-[#E6F4F3]">{stats?.season?.name ?? (stats ? 'No season running' : loading ? 'Loading…' : 'Season unknown')}</span>
          {stats?.season && (
            <span className="text-xs text-[#7FD4D0] opacity-80 tabular-nums">
              {formatDay(stats.season.startsAt)} → {stats.season.endsAt ? formatDay(stats.season.endsAt) : 'open-ended'}
              {day !== null && ` · day ${day}`}
            </span>
          )}
          {stats &&
            stats.games.map(([game, state]) => {
              const active = state === 'active';
              return (
                <span
                  key={game}
                  className={`${pillBase} border ${
                    active
                      ? 'text-[#65B3AE] bg-[rgba(101,179,174,0.1)] border-[rgba(101,179,174,0.35)]'
                      : 'text-[#FBBF24] bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.4)]'
                  }`}
                  title={active ? 'Running' : `Set to ${state} in the Arena admin`}
                >
                  {GAME_LABEL[game] ?? game} · {state}
                </span>
              );
            })}
        </section>

        <section>
          <div className="text-[11px] uppercase tracking-wide text-[#65B3AE] font-semibold mb-2">Today (UTC)</div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <Tile label="Players" value={stats?.players.total} hint="Everyone who has played since the Arena opened" />
            <Tile label="Active today" value={stats?.players.activeToday} hint="Players who did anything today, UTC" />
            <Tile label="Check-ins" value={stats?.today.checkins} hint="Daily check-ins today, UTC" />
            <Tile label="Quizzes done" value={stats?.today.quizCompleted} hint="Daily quizzes finished today, UTC" />
            <Tile label="Higher or Lower" value={stats?.today.hlPredictions} hint="Higher or Lower predictions today, UTC" />
          </div>
        </section>

        <section>
          <div className="text-[11px] uppercase tracking-wide text-[#65B3AE] font-semibold mb-2">Open the Arena</div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <LinkCard href={ARENA.admin} title="Admin panel" detail="Players, moderation, games and seasons. Signs in with Discord." />
            <LinkCard href={ARENA.web} title="Web app" detail="The Arena as players see it." />
            <LinkCard href={ARENA.telegram} title="Telegram bot" detail="@mStocksArenaBot, the Telegram Mini App." />
            <button
              onClick={() => void copyArena()}
              className="flex flex-col items-start justify-start text-left rounded-xl px-4 py-3 bg-[rgba(101,179,174,0.06)] border border-[rgba(101,179,174,0.15)] transition-all hover:bg-[rgba(101,179,174,0.14)] hover:border-[#65B3AE]"
              title="Copy /arena to paste in Discord"
            >
              <div className="text-sm font-semibold text-[#E6F4F3]">{copied ? 'Copied /arena ✓' : 'Discord: /arena'}</div>
              <div className="mt-0.5 text-[11px] text-[#7FD4D0] opacity-70 leading-snug">
                Type it in Mantle's Discord to open the Arena there.
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MStocksArena;
