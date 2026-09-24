import React, { useEffect, useMemo, useState } from 'react';
import {
  Coverage,
  PLATFORM_LABEL,
  Platform,
  RosterGroup,
  RosterMember,
  TRACKED_ADMINS,
  TrackedAdmin,
  TrackedId,
  appointmentRequest,
  coverageFor,
  handleKey,
  hasAdminList,
  isPerson,
  membersOf,
  ownersOf,
  roleLabel,
} from '../../constants/communityRoster';
import { ROSTER_BASELINE } from '../../data/communityRosterBaseline';
import { useRosterStore } from '../../stores/rosterStore';
import GroupPanel from './GroupPanel';

type Filter = 'all' | 'gaps' | TrackedId;

interface Row {
  group: RosterGroup;
  members: RosterMember[];
  owners: RosterMember[];
  bots: RosterMember[];
  adminCount: number;
  recorded: boolean;
  coverage: Coverage[];
}

const isGap = (c: Coverage): boolean => c.kind === 'missing' || c.kind === 'requested';

const pillBase = 'px-2.5 py-1 rounded-md text-xs font-semibold transition-all whitespace-nowrap';

const CoverageCell: React.FC<{ coverage: Coverage; tracked: TrackedAdmin }> = ({ coverage, tracked }) => {
  const chip = 'inline-block max-w-full truncate px-1.5 py-[2px] rounded text-[10px] font-semibold';
  switch (coverage.kind) {
    case 'admin':
      return (
        <span
          className={chip}
          style={{
            background: `${tracked.color}1F`,
            color: tracked.color,
            border: `1px solid ${tracked.color}40`,
          }}
          title={`${tracked.handle} is ${roleLabel(coverage.member)} here`}
        >
          {roleLabel(coverage.member)}
        </span>
      );
    case 'requested':
      return (
        <span
          className={`${chip} text-[#FBBF24] border border-dashed border-[rgba(251,191,36,0.6)]`}
          title={`The owner has been asked to appoint ${tracked.handle}`}
        >
          asked
        </span>
      );
    case 'missing':
      return (
        <span
          className={`${chip} text-[#FF6B6B] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.35)]`}
          title={`${tracked.handle} is not an admin here`}
        >
          missing
        </span>
      );
    case 'unknown':
      return (
        <span className="text-xs text-[#7FD4D0] opacity-35" title="No admin list recorded for this group">
          ?
        </span>
      );
  }
};

const CommunityRoster: React.FC = () => {
  const { groups, members, source, error, fetchRoster, loadBaseline, clearError } = useRosterStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [platform, setPlatform] = useState<'all' | Platform>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Refetched each time the view opens: nothing pushes another steward's
  // edits here, so opening the view is when it catches up.
  useEffect(() => {
    void fetchRoster();
  }, [fetchRoster]);

  const readOnly = source !== 'live';

  const rows: Row[] = useMemo(
    () =>
      groups.map((group) => {
        const groupMembers = membersOf(members, group.id);
        return {
          group,
          members: groupMembers,
          owners: ownersOf(groupMembers),
          bots: groupMembers.filter((m) => m.role === 'bot'),
          adminCount: groupMembers.filter((m) => isPerson(m) && m.status === 'active').length,
          recorded: hasAdminList(groupMembers),
          coverage: TRACKED_ADMINS.map((t) => coverageFor(groupMembers, t)),
        };
      }),
    [groups, members],
  );

  const recordedCount = rows.filter((r) => r.recorded).length;
  const gapCount = rows.filter((r) => r.coverage.some(isGap)).length;
  const stats = TRACKED_ADMINS.map((tracked, i) => ({
    tracked,
    admin: rows.filter((r) => r.coverage[i].kind === 'admin').length,
    asked: rows.filter((r) => r.coverage[i].kind === 'requested').length,
    missing: rows.filter((r) => r.coverage[i].kind === 'missing').length,
  }));
  const platforms = Array.from(new Set(groups.map((g) => g.platform)));

  const needle = query.trim().toLowerCase();
  const handleNeedle = handleKey(needle);
  const matchesIn = (row: Row): RosterMember[] =>
    needle
      ? row.members.filter(
          (m) =>
            (handleNeedle && handleKey(m.handle).includes(handleNeedle)) ||
            (m.title ?? '').toLowerCase().includes(needle),
        )
      : [];

  const visible = rows.filter((row) => {
    if (platform !== 'all' && row.group.platform !== platform) return false;
    if (filter === 'gaps' && !row.coverage.some(isGap)) return false;
    if (filter !== 'all' && filter !== 'gaps') {
      const i = TRACKED_ADMINS.findIndex((t) => t.id === filter);
      if (!isGap(row.coverage[i])) return false;
    }
    if (!needle) return true;
    return row.group.name.toLowerCase().includes(needle) || matchesIn(row).length > 0;
  });

  const selected = rows.find((r) => r.group.id === selectedId) ?? null;
  const panelOpen = creating || selected !== null;
  const columns = panelOpen
    ? 'minmax(170px,1.6fr) minmax(110px,1fr) repeat(4, minmax(78px,0.8fr))'
    : 'minmax(190px,1.6fr) minmax(120px,1fr) repeat(4, minmax(84px,0.8fr)) minmax(130px,1.1fr) 88px';

  const openGroup = (id: string) => {
    setCreating(false);
    setSelectedId(id);
  };

  const copyAsk = async (row: Row) => {
    const missing = TRACKED_ADMINS.filter((_, i) => isGap(row.coverage[i]));
    try {
      await navigator.clipboard.writeText(appointmentRequest(row.group, row.owners, missing));
      setCopiedId(row.group.id);
      setTimeout(() => setCopiedId((id) => (id === row.group.id ? null : id)), 1500);
    } catch {
      // The panel shows the same message in a text box it can be copied from.
      openGroup(row.group.id);
    }
  };

  const baselineEntries = ROSTER_BASELINE.reduce((n, g) => n + g.members.length, 0);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(101,179,174,0.15)] flex-shrink-0 flex-wrap">
        <span className="text-[#65B3AE] font-bold text-sm tracking-wide">COMMUNITY ADMINS</span>
        {source === 'live' && (
          <span className="text-[11px] text-[#7FD4D0] opacity-60">
            {groups.length} groups · shared with every steward
          </span>
        )}
        {source === 'baseline' && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-[rgba(251,191,36,0.12)] text-[#FBBF24]">
            PDF copy · read-only
          </span>
        )}

        <div className="flex-1" />

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a group, @handle or title"
          className="w-56 bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.3)] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[rgba(101,179,174,0.4)] focus:outline-none focus:border-[#65B3AE]"
        />

        {platforms.length > 1 && (
          <div className="flex gap-1 p-0.5 rounded-lg bg-[rgba(101,179,174,0.08)]">
            {(['all', ...platforms] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`${pillBase} ${
                  platform === p
                    ? 'bg-[#65B3AE] text-[#050D20]'
                    : 'text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)]'
                }`}
              >
                {p === 'all' ? 'All' : PLATFORM_LABEL[p]}
              </button>
            ))}
          </div>
        )}

        {!readOnly && (
          <button
            onClick={() => {
              setSelectedId(null);
              setCreating(true);
            }}
            className={`${pillBase} bg-[#65B3AE] text-[#050D20] hover:brightness-110`}
            title="Add a Telegram group or Discord server"
          >
            + Group
          </button>
        )}
        <button
          onClick={() => void fetchRoster()}
          className={`${pillBase} text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)]`}
          title="Reload the list, including other stewards' changes"
        >
          ↻
        </button>
      </div>

      {/* Coverage filters */}
      {rows.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[rgba(101,179,174,0.1)] flex-shrink-0 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`${pillBase} ${
              filter === 'all' ? 'bg-[rgba(101,179,174,0.25)] text-white' : 'text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.12)]'
            }`}
          >
            All groups {rows.length}
          </button>
          <button
            onClick={() => setFilter(filter === 'gaps' ? 'all' : 'gaps')}
            className={`${pillBase} ${
              filter === 'gaps' ? 'bg-[rgba(255,107,107,0.2)] text-[#FF6B6B]' : 'text-[#FF6B6B] hover:bg-[rgba(255,107,107,0.1)]'
            }`}
            title="Groups where at least one of our stewards is not admin yet"
          >
            Needs an admin {gapCount}
          </button>
          <span className="w-px h-4 bg-[rgba(101,179,174,0.2)]" />
          {stats.map(({ tracked, admin, asked, missing }) => (
            <button
              key={tracked.id}
              onClick={() => setFilter(filter === tracked.id ? 'all' : tracked.id)}
              className={`${pillBase} flex items-center gap-1.5`}
              style={{
                background: filter === tracked.id ? `${tracked.color}33` : `${tracked.color}12`,
                border: `1px solid ${filter === tracked.id ? tracked.color : `${tracked.color}40`}`,
              }}
              title={`${tracked.handle} is admin in ${admin} of the ${recordedCount} groups with a recorded admin list${
                asked ? `, asked for in ${asked}` : ''
              }. Click to show only the groups where they are not admin yet.`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: tracked.color }} />
              <span style={{ color: tracked.color }}>{tracked.label}</span>
              <span className="text-[#E6F4F3] tabular-nums">
                {admin}/{recordedCount}
              </span>
              {missing > 0 && <span className="text-[#FF6B6B] tabular-nums">−{missing}</span>}
              {asked > 0 && <span className="text-[#FBBF24] tabular-nums">· {asked} asked</span>}
            </button>
          ))}
        </div>
      )}

      {source === 'baseline' && (
        <div className="px-4 py-2 text-[11px] leading-snug text-[#FBBF24] bg-[rgba(251,191,36,0.07)] border-b border-[rgba(251,191,36,0.2)] flex-shrink-0">
          This is the PDF list, shown read-only because the shared tables don't exist yet. To edit it and share it
          with the other stewards, run <code className="text-[#E6F4F3]">src/utils/supabase-community-roster.sql</code>{' '}
          once in the Supabase SQL Editor, then reopen this view and press <b>Load the PDF list</b>.
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-2 text-[11px] text-[#FF6B6B] bg-[rgba(255,107,107,0.08)] border-b border-[rgba(255,107,107,0.25)] flex-shrink-0">
          <span className="flex-1">{error}</span>
          <button onClick={clearError} className="px-2 hover:text-white" title="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 overflow-auto">
          {source === 'loading' && rows.length === 0 && (
            <div className="p-6 text-sm text-[#7FD4D0] opacity-60">Loading the admin list…</div>
          )}

          {source === 'error' && rows.length === 0 && (
            <div className="p-6 text-sm text-[#7FD4D0]">
              Couldn't load the admin list.{' '}
              <button onClick={() => void fetchRoster()} className="text-[#65B3AE] underline">
                Try again
              </button>
            </div>
          )}

          {source === 'live' && rows.length === 0 && (
            <div className="p-6 max-w-lg space-y-3">
              <div className="text-sm text-[#E6F4F3] font-semibold">No groups recorded yet.</div>
              <div className="text-xs text-[#7FD4D0] opacity-70 leading-relaxed">
                Start from the admin list PDF ({ROSTER_BASELINE.length} Telegram groups, {baselineEntries} admins and
                bots), then correct it here as things change. Or add groups one by one with + Group.
              </div>
              <button
                disabled={seeding}
                onClick={async () => {
                  setSeeding(true);
                  await loadBaseline();
                  setSeeding(false);
                }}
                className={`${pillBase} bg-[#65B3AE] text-[#050D20] hover:brightness-110 disabled:opacity-50`}
              >
                {seeding ? 'Loading…' : 'Load the PDF list'}
              </button>
            </div>
          )}

          {rows.length > 0 && (
            <div className="min-w-fit">
              {/* Header */}
              <div
                className="grid sticky top-0 z-10 bg-[#081426] border-b border-[rgba(101,179,174,0.15)]"
                style={{ gridTemplateColumns: columns }}
              >
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7FD4D0] opacity-60">
                  Group
                </div>
                <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7FD4D0] opacity-60">
                  Owner
                </div>
                {TRACKED_ADMINS.map((t) => (
                  <div
                    key={t.id}
                    className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-center"
                    style={{ color: t.color }}
                    title={t.handle}
                  >
                    {t.label}
                  </div>
                ))}
                {!panelOpen && (
                  <>
                    <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-[#7FD4D0] opacity-60">
                      Bots
                    </div>
                    <div />
                  </>
                )}
              </div>

              {visible.length === 0 && (
                <div className="px-4 py-6 text-xs text-[#7FD4D0] opacity-60">Nothing matches.</div>
              )}

              {visible.map((row) => {
                const matches = matchesIn(row);
                const isSelected = row.group.id === selectedId;
                const askable = row.recorded && row.coverage.some(isGap);
                return (
                  <div
                    key={row.group.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openGroup(row.group.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openGroup(row.group.id);
                      }
                    }}
                    className={`grid items-center cursor-pointer border-b border-[rgba(101,179,174,0.06)] transition-colors focus:outline-none focus-visible:bg-[rgba(101,179,174,0.1)] ${
                      isSelected ? 'bg-[rgba(101,179,174,0.12)]' : 'hover:bg-[rgba(101,179,174,0.05)]'
                    }`}
                    style={{ gridTemplateColumns: columns }}
                  >
                    <div className="px-4 py-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-semibold text-[#E6F4F3] truncate">{row.group.name}</span>
                        {row.group.url && (
                          <a
                            href={row.group.url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-[#65B3AE] hover:text-white flex-shrink-0"
                            title={`Open ${row.group.url}`}
                          >
                            ↗
                          </a>
                        )}
                        {row.group.notes && (
                          <span className="text-[10px] text-[#FBBF24] flex-shrink-0" title={row.group.notes}>
                            ⚠
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#7FD4D0] opacity-50">
                        {platforms.length > 1 && `${PLATFORM_LABEL[row.group.platform]} · `}
                        {row.recorded ? `${row.adminCount} admins` : 'admin list not recorded'}
                      </div>
                      {matches.length > 0 && (
                        <div className="text-[10px] text-[#65B3AE] truncate">
                          {matches.map((m) => `${m.handle} (${roleLabel(m)})`).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="px-2 py-2 text-[11px] text-[#FBBF24] truncate min-w-0">
                      {row.owners.length > 0 ? (
                        row.owners.map((o) => o.handle).join(', ')
                      ) : (
                        <span className="text-[#7FD4D0] opacity-35">—</span>
                      )}
                    </div>

                    {TRACKED_ADMINS.map((t, i) => (
                      <div key={t.id} className="px-2 py-2 text-center min-w-0">
                        <CoverageCell coverage={row.coverage[i]} tracked={t} />
                      </div>
                    ))}

                    {!panelOpen && (
                      <>
                        <div className="px-2 py-2 flex gap-1 flex-wrap min-w-0">
                          {row.bots.slice(0, 3).map((b) => (
                            <span
                              key={b.id}
                              className="text-[10px] px-1.5 py-[1px] rounded bg-[rgba(157,78,221,0.14)] text-[#C9A2F0] truncate max-w-[110px]"
                              title={b.title ? `${b.handle} — ${b.title}` : b.handle}
                            >
                              {b.handle}
                            </span>
                          ))}
                          {row.bots.length > 3 && (
                            <span className="text-[10px] text-[#7FD4D0] opacity-60">+{row.bots.length - 3}</span>
                          )}
                        </div>
                        <div className="px-2 py-2 text-right">
                          {askable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void copyAsk(row);
                              }}
                              className="px-2 py-1 rounded text-[10px] font-semibold text-[#7FD4D0] border border-[rgba(101,179,174,0.3)] hover:bg-[rgba(101,179,174,0.15)] whitespace-nowrap"
                              title="Copy a message asking the owner to appoint the stewards who are missing"
                            >
                              {copiedId === row.group.id ? 'Copied ✓' : 'Copy ask'}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {panelOpen && (
          <GroupPanel
            key={selected?.group.id ?? 'new'}
            group={selected?.group ?? null}
            members={selected?.members ?? []}
            readOnly={readOnly}
            onClose={() => {
              setSelectedId(null);
              setCreating(false);
            }}
            onCreated={(group) => openGroup(group.id)}
          />
        )}
      </div>

      {/* Legend */}
      {rows.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[rgba(101,179,174,0.15)] flex-shrink-0 flex-wrap text-[10px] text-[#7FD4D0]">
          <span className="opacity-60">
            <span className="text-[#E6F4F3]">mod / admin / owner</span> = their title in the group
          </span>
          <span className="opacity-60">
            <span className="text-[#FBBF24]">asked</span> = owner asked to appoint
          </span>
          <span className="opacity-60">
            <span className="text-[#FF6B6B]">missing</span> = not admin
          </span>
          <span className="opacity-60">? = no admin list recorded ({rows.length - recordedCount} groups)</span>
          <span className="opacity-40 ml-auto">Click a group to edit its admins and bots.</span>
        </div>
      )}
    </div>
  );
};

export default CommunityRoster;
