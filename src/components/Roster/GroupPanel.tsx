import React, { useState } from 'react';
import {
  MemberRole,
  PLATFORM_LABEL,
  Platform,
  RosterGroup,
  RosterMember,
  TRACKED_ADMINS,
  TrackedAdmin,
  appointmentRequest,
  coverageFor,
  handleKey,
  isPerson,
  ownersOf,
  roleLabel,
} from '../../constants/communityRoster';
import { GroupFields, useRosterStore } from '../../stores/rosterStore';

// No width in the base: Tailwind emits w-full after w-20, so a select given
// both came out full width and crushed the input beside it. min-w-0 because an
// <input> in a flex row otherwise will not shrink below ~20 characters.
const inputBase =
  'min-w-0 bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.3)] rounded px-2 py-1 text-xs text-white placeholder-[rgba(101,179,174,0.4)] focus:outline-none focus:border-[#65B3AE] transition';
const inputClass = `${inputBase} w-full`;
const buttonBase = 'px-2 py-1 rounded text-[11px] font-semibold transition-all disabled:opacity-40 whitespace-nowrap';
const primaryButton = `${buttonBase} bg-[#65B3AE] text-[#050D20] hover:brightness-110`;
const quietButton = `${buttonBase} text-[#7FD4D0] hover:bg-[rgba(101,179,174,0.15)]`;
const dangerButton = `${buttonBase} text-[#FF6B6B] hover:bg-[rgba(255,107,107,0.12)]`;
const sectionTitle = 'text-[10px] font-bold uppercase tracking-wider text-[#7FD4D0] opacity-60 mb-1.5';

const formatDay = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

const trackedFor = (handle: string): TrackedAdmin | undefined =>
  TRACKED_ADMINS.find((t) => handleKey(t.handle) === handleKey(handle));

interface MemberDraft {
  handle: string;
  role: MemberRole;
  title: string;
  notes: string;
}

const draftOf = (m: RosterMember): MemberDraft => ({
  handle: m.handle,
  role: m.role,
  title: m.title ?? '',
  notes: m.notes ?? '',
});

interface MemberRowProps {
  member: RosterMember;
  readOnly: boolean;
  busy: boolean;
  onSave: (draft: MemberDraft) => Promise<boolean>;
  onRemove: () => void;
}

const MemberRow: React.FC<MemberRowProps> = ({ member, readOnly, busy, onSave, onRemove }) => {
  const [draft, setDraft] = useState<MemberDraft | null>(null);
  const tracked = trackedFor(member.handle);
  const isBot = member.role === 'bot';

  if (draft) {
    return (
      <div className="rounded-lg p-2 space-y-1.5 bg-[rgba(101,179,174,0.06)] border border-[rgba(101,179,174,0.2)]">
        <div className="flex gap-1.5">
          <input
            className={inputClass}
            value={draft.handle}
            onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
            placeholder={isBot ? 'Bot name' : '@handle'}
            autoFocus
          />
          {!isBot && (
            <select
              className={`${inputBase} w-24 flex-shrink-0`}
              value={draft.role}
              onChange={(e) => setDraft({ ...draft, role: e.target.value as MemberRole })}
            >
              <option value="owner">owner</option>
              <option value="admin">admin</option>
            </select>
          )}
        </div>
        <input
          className={inputClass}
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder={isBot ? 'What it does, e.g. anti-spam' : 'Title shown in the group, e.g. mod'}
        />
        <input
          className={inputClass}
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          placeholder="Notes (optional)"
        />
        <div className="flex justify-end gap-1">
          <button className={quietButton} onClick={() => setDraft(null)} disabled={busy}>
            Cancel
          </button>
          <button
            className={primaryButton}
            disabled={busy || !draft.handle.trim()}
            onClick={async () => {
              if (await onSave(draft)) setDraft(null);
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group/row flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-[rgba(101,179,174,0.06)]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className="text-xs font-semibold truncate"
            style={{ color: tracked?.color ?? '#E6F4F3' }}
            title={tracked ? `${tracked.label} — one of the tracked stewards` : undefined}
          >
            {member.handle}
          </span>
          <span
            className={`text-[10px] px-1.5 py-[1px] rounded ${
              member.role === 'owner'
                ? 'bg-[rgba(251,191,36,0.15)] text-[#FBBF24]'
                : 'bg-[rgba(101,179,174,0.12)] text-[#7FD4D0]'
            }`}
          >
            {roleLabel(member)}
          </span>
        </div>
        {member.notes && (
          <div className="text-[10px] text-[#FBBF24] opacity-80 mt-0.5 leading-snug">⚠ {member.notes}</div>
        )}
      </div>
      {!readOnly && (
        <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 focus-within:opacity-100 transition-opacity [@media(hover:none)]:opacity-100">
          <button className={quietButton} onClick={() => setDraft(draftOf(member))} disabled={busy} title="Edit">
            ✎
          </button>
          <button className={dangerButton} onClick={onRemove} disabled={busy} title="Remove">
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

interface AddMemberFormProps {
  kind: 'person' | 'bot';
  busy: boolean;
  onAdd: (draft: MemberDraft) => Promise<boolean>;
}

const AddMemberForm: React.FC<AddMemberFormProps> = ({ kind, busy, onAdd }) => {
  const blank: MemberDraft = { handle: '', role: kind === 'bot' ? 'bot' : 'admin', title: '', notes: '' };
  const [draft, setDraft] = useState<MemberDraft>(blank);

  const submit = async () => {
    if (!draft.handle.trim()) return;
    if (await onAdd(draft)) setDraft(blank);
  };

  return (
    <form
      className="flex gap-1.5 mt-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <input
        className={inputClass}
        value={draft.handle}
        onChange={(e) => setDraft({ ...draft, handle: e.target.value })}
        placeholder={kind === 'bot' ? 'Bot name' : '@handle'}
      />
      {kind === 'person' && (
        <select
          className={`${inputBase} w-20 flex-shrink-0`}
          value={draft.role}
          onChange={(e) => setDraft({ ...draft, role: e.target.value as MemberRole })}
        >
          <option value="admin">admin</option>
          <option value="owner">owner</option>
        </select>
      )}
      <input
        className={inputClass}
        value={draft.title}
        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        placeholder={kind === 'bot' ? 'What it does' : 'Title, e.g. mod'}
      />
      <button type="submit" className={primaryButton} disabled={busy || !draft.handle.trim()}>
        Add
      </button>
    </form>
  );
};

interface GroupPanelProps {
  group: RosterGroup | null;
  members: RosterMember[];
  readOnly: boolean;
  onClose: () => void;
  onCreated: (group: RosterGroup) => void;
}

const GroupPanel: React.FC<GroupPanelProps> = ({ group, members, readOnly, onClose, onCreated }) => {
  const { saveGroup, deleteGroup, addMember, updateMember, deleteMember } = useRosterStore();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [groupDraft, setGroupDraft] = useState<GroupFields | null>(
    group ? null : { name: '', platform: 'telegram', url: '', notes: '' },
  );

  const run = async <T,>(action: () => Promise<T>): Promise<T> => {
    setBusy(true);
    setLocalError(null);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  };

  const people = members
    .filter((m) => isPerson(m) && m.status === 'active')
    .sort((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'));
  const bots = members.filter((m) => m.role === 'bot');
  const owners = ownersOf(members);
  const coverage = TRACKED_ADMINS.map((t) => ({ tracked: t, coverage: coverageFor(members, t) }));
  const notYetAdmin = coverage.filter((c) => c.coverage.kind !== 'admin').map((c) => c.tracked);
  const notAsked = coverage.filter((c) => c.coverage.kind === 'missing' || c.coverage.kind === 'unknown');
  const request = group && notYetAdmin.length > 0 ? appointmentRequest(group, owners, notYetAdmin) : null;

  const saveMember = async (member: RosterMember, draft: MemberDraft): Promise<boolean> => {
    const clash = members.find(
      (m) => m.id !== member.id && handleKey(m.handle) === handleKey(draft.handle),
    );
    if (clash) {
      setLocalError(`${clash.handle} is already listed in this group.`);
      return false;
    }
    const saved = await run(() =>
      updateMember(member.id, {
        handle: draft.handle,
        role: draft.role,
        title: draft.title,
        notes: draft.notes,
      }),
    );
    return saved !== null;
  };

  // Adding somebody who is waiting on a request appoints them rather than
  // tripping the one-row-per-handle rule with a second row.
  const addToGroup = async (draft: MemberDraft): Promise<boolean> => {
    if (!group) return false;
    const existing = members.find((m) => handleKey(m.handle) === handleKey(draft.handle));
    if (existing?.status === 'requested' && draft.role !== 'bot') {
      const saved = await run(() =>
        updateMember(existing.id, { status: 'active', role: draft.role, title: draft.title }),
      );
      return saved !== null;
    }
    if (existing) {
      setLocalError(`${existing.handle} is already listed in this group.`);
      return false;
    }
    const added = await run(() =>
      addMember(group.id, {
        handle: draft.handle,
        role: draft.role,
        title: draft.title,
        status: 'active',
        notes: draft.notes,
      }),
    );
    return added !== null;
  };

  const removeMember = (member: RosterMember) => {
    const what = member.role === 'bot' ? 'bot' : 'admin';
    if (!confirm(`Remove ${what} ${member.handle} from ${group?.name}?`)) return;
    void run(() => deleteMember(member.id));
  };

  const copyRequest = async () => {
    if (!request) return;
    try {
      await navigator.clipboard.writeText(request);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setLocalError('Copy was blocked by the browser. Select the message and copy it by hand.');
    }
  };

  const submitGroup = async () => {
    if (!groupDraft || !groupDraft.name.trim()) return;
    const saved = await run(() => saveGroup(group?.id ?? null, groupDraft));
    if (!saved) return;
    setGroupDraft(null);
    if (!group) onCreated(saved);
  };

  const removeGroup = async () => {
    if (!group) return;
    const entries = members.length > 0 ? ` and its ${members.length} entries` : '';
    if (!confirm(`Delete ${group.name}${entries}? This cannot be undone.`)) return;
    if (await run(() => deleteGroup(group.id))) onClose();
  };

  return (
    <aside className="w-[360px] max-w-full flex-shrink-0 h-full overflow-y-auto overflow-x-hidden border-l border-[rgba(101,179,174,0.15)] bg-[rgba(5,13,32,0.55)]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start gap-2 px-4 py-3 border-b border-[rgba(101,179,174,0.15)] bg-[#081426]">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-[#E6F4F3] truncate">{group?.name ?? 'New group'}</div>
          {group && (
            <div className="flex items-center gap-2 text-[11px] text-[#7FD4D0] opacity-70">
              <span>{PLATFORM_LABEL[group.platform]}</span>
              {group.url && (
                <a
                  href={group.url}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate hover:text-[#65B3AE] hover:underline"
                >
                  {group.url.replace(/^https?:\/\//, '')} ↗
                </a>
              )}
            </div>
          )}
        </div>
        {group && !readOnly && !groupDraft && (
          <button
            className={quietButton}
            onClick={() =>
              setGroupDraft({
                name: group.name,
                platform: group.platform,
                url: group.url ?? '',
                notes: group.notes ?? '',
              })
            }
          >
            Edit
          </button>
        )}
        <button className={quietButton} onClick={onClose} title="Close">
          ✕
        </button>
      </div>

      <div className="px-4 py-3 space-y-4">
        {localError && (
          <div className="text-[11px] text-[#FF6B6B] bg-[rgba(255,107,107,0.08)] border border-[rgba(255,107,107,0.3)] rounded px-2 py-1.5">
            {localError}
          </div>
        )}

        {/* Group details form */}
        {groupDraft && (
          <form
            className="space-y-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitGroup();
            }}
          >
            <div className={sectionTitle}>{group ? 'Edit group' : 'Add a group'}</div>
            <input
              className={inputClass}
              value={groupDraft.name}
              onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
              placeholder="Group name, e.g. Mantle Korea"
              autoFocus
            />
            <div className="flex gap-1.5">
              <select
                className={`${inputBase} w-28 flex-shrink-0`}
                value={groupDraft.platform}
                onChange={(e) => setGroupDraft({ ...groupDraft, platform: e.target.value as Platform })}
              >
                <option value="telegram">Telegram</option>
                <option value="discord">Discord</option>
              </select>
              <input
                className={inputClass}
                value={groupDraft.url ?? ''}
                onChange={(e) => setGroupDraft({ ...groupDraft, url: e.target.value })}
                placeholder="Link, e.g. https://t.me/..."
              />
            </div>
            <textarea
              className={`${inputClass} h-16 resize-none`}
              value={groupDraft.notes ?? ''}
              onChange={(e) => setGroupDraft({ ...groupDraft, notes: e.target.value })}
              placeholder="Notes (optional)"
            />
            <div className="flex items-center gap-1">
              {group && (
                <button type="button" className={dangerButton} onClick={removeGroup} disabled={busy}>
                  Delete group
                </button>
              )}
              <div className="flex-1" />
              <button
                type="button"
                className={quietButton}
                disabled={busy}
                onClick={() => (group ? setGroupDraft(null) : onClose())}
              >
                Cancel
              </button>
              <button type="submit" className={primaryButton} disabled={busy || !groupDraft.name.trim()}>
                {group ? 'Save' : 'Add group'}
              </button>
            </div>
          </form>
        )}

        {group && (
          <>
            {group.notes && !groupDraft && (
              <div className="text-[11px] leading-snug text-[#FBBF24] bg-[rgba(251,191,36,0.07)] border border-[rgba(251,191,36,0.25)] rounded px-2 py-1.5">
                ⚠ {group.notes}
              </div>
            )}

            {/* Tracked stewards */}
            <section>
              <div className={sectionTitle}>Our stewards here</div>
              <div className="space-y-0.5">
                {coverage.map(({ tracked, coverage: c }) => (
                  <div key={tracked.id} className="flex items-center gap-2 py-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tracked.color }} />
                    <span className="text-xs font-bold w-[4.5rem] flex-shrink-0" style={{ color: tracked.color }}>
                      {tracked.label}
                    </span>
                    <span className="flex-1 min-w-0 text-[11px] truncate">
                      {c.kind === 'admin' && <span className="text-[#E6F4F3]">{roleLabel(c.member)}</span>}
                      {c.kind === 'requested' && (
                        <span className="text-[#FBBF24]">asked {formatDay(c.member.createdAt)}</span>
                      )}
                      {c.kind === 'missing' && <span className="text-[#FF6B6B]">not admin</span>}
                      {c.kind === 'unknown' && (
                        <span className="text-[#7FD4D0] opacity-50">not recorded</span>
                      )}
                    </span>
                    {!readOnly && c.kind === 'requested' && (
                      <>
                        <button
                          className={primaryButton}
                          disabled={busy}
                          onClick={() => void run(() => updateMember(c.member.id, { status: 'active' }))}
                          title={`${tracked.handle} has been made admin`}
                        >
                          Appointed
                        </button>
                        <button
                          className={quietButton}
                          disabled={busy}
                          onClick={() => void run(() => deleteMember(c.member.id))}
                          title="Withdraw the request"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {!readOnly && (c.kind === 'missing' || c.kind === 'unknown') && (
                      <>
                        <button
                          className={quietButton}
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              addMember(group.id, {
                                handle: tracked.handle,
                                role: 'admin',
                                title: null,
                                status: 'requested',
                                notes: null,
                              }),
                            )
                          }
                          title="You have asked the group owner to appoint them"
                        >
                          Mark asked
                        </button>
                        <button
                          className={quietButton}
                          disabled={busy}
                          onClick={() =>
                            void run(() =>
                              addMember(group.id, {
                                handle: tracked.handle,
                                role: 'admin',
                                title: null,
                                status: 'active',
                                notes: null,
                              }),
                            )
                          }
                          title="They are already admin here; the list was wrong"
                        >
                          Is admin
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {request && (
                <div className="mt-2 space-y-1.5">
                  <div className="text-[10px] text-[#7FD4D0] opacity-60">
                    {owners.length > 0
                      ? `Message for ${owners.map((o) => o.handle).join(', ')}:`
                      : 'No owner recorded — message for whoever runs the group:'}
                  </div>
                  <textarea readOnly value={request} className={`${inputClass} h-20 resize-none`} />
                  <div className="flex justify-end gap-1">
                    {!readOnly && notAsked.length > 0 && (
                      <button
                        className={quietButton}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            for (const { tracked } of notAsked) {
                              await addMember(group.id, {
                                handle: tracked.handle,
                                role: 'admin',
                                title: null,
                                status: 'requested',
                                notes: null,
                              });
                            }
                          })
                        }
                      >
                        Mark all asked
                      </button>
                    )}
                    <button className={primaryButton} onClick={copyRequest}>
                      {copied ? 'Copied ✓' : 'Copy message'}
                    </button>
                  </div>
                </div>
              )}
            </section>

            {/* Admins */}
            <section>
              <div className={sectionTitle}>Owner & admins ({people.length})</div>
              {people.length === 0 && (
                <div className="text-[11px] text-[#7FD4D0] opacity-50 px-2">
                  No admin list recorded for this group yet.
                </div>
              )}
              {people.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  readOnly={readOnly}
                  busy={busy}
                  onSave={(draft) => saveMember(m, draft)}
                  onRemove={() => removeMember(m)}
                />
              ))}
              {!readOnly && <AddMemberForm kind="person" busy={busy} onAdd={addToGroup} />}
            </section>

            {/* Bots */}
            <section>
              <div className={sectionTitle}>Bots ({bots.length})</div>
              {bots.length === 0 && (
                <div className="text-[11px] text-[#7FD4D0] opacity-50 px-2">No bots recorded.</div>
              )}
              {bots.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  readOnly={readOnly}
                  busy={busy}
                  onSave={(draft) => saveMember(m, draft)}
                  onRemove={() => removeMember(m)}
                />
              ))}
              {!readOnly && <AddMemberForm kind="bot" busy={busy} onAdd={addToGroup} />}
            </section>

            {group.updatedAt && (
              <div className="text-[10px] text-[#7FD4D0] opacity-40">
                Group details last changed {formatDay(group.updatedAt)}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default GroupPanel;
