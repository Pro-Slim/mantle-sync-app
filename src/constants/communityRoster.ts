import { STEWARDS, StewardId } from './stewards';

export type Platform = 'telegram' | 'discord';
export type MemberRole = 'owner' | 'admin' | 'bot';
export type MemberStatus = 'active' | 'requested';

export interface RosterGroup {
  id: string;
  name: string;
  platform: Platform;
  url: string | null;
  notes: string | null;
  sortOrder: number;
  updatedAt: string | null;
}

// A member is an owner, an admin (whatever custom title Telegram shows beside
// the name -- "mod", "Mantle Team", "Firekeeper" -- is `title`), or a bot.
// `requested` marks a tracked steward the group owner has been ASKED to appoint:
// kept on the same row so appointing them later is an edit, not a second record.
export interface RosterMember {
  id: string;
  groupId: string;
  handle: string;
  role: MemberRole;
  title: string | null;
  status: MemberStatus;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export type TrackedId = StewardId | 'MINH';

export interface TrackedAdmin {
  id: TrackedId;
  label: string;
  handle: string;
  color: string;
}

const stewardColor = (id: StewardId): string =>
  STEWARDS.find((s) => s.id === id)?.color ?? '#7FD4D0';

// The people whose admin coverage the matrix is built around. Rota stewards
// keep their rota colour so one person reads as one colour across both views.
export const TRACKED_ADMINS: TrackedAdmin[] = [
  { id: 'SLIM', label: 'SLIM', handle: '@SlimOnShark', color: stewardColor('SLIM') },
  { id: 'HADUKEM', label: 'HADUKEM', handle: '@hadukemv', color: stewardColor('HADUKEM') },
  { id: 'MINH', label: 'MINH', handle: '@ann_leminh', color: '#00D9A3' },
  { id: 'LUISMA', label: 'LUISMA', handle: '@Luismatz', color: stewardColor('LUISMA') },
];

export const PLATFORM_LABEL: Record<Platform, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
};

// Must match the generated handle_key column in supabase-community-roster.sql,
// which is what makes "@Luismatz" and "luismatz" one row per group.
export const handleKey = (handle: string): string =>
  handle.trim().replace(/^@+/, '').toLowerCase();

export const isPerson = (m: RosterMember): boolean => m.role !== 'bot';

export const membersOf = (members: RosterMember[], groupId: string): RosterMember[] =>
  members.filter((m) => m.groupId === groupId);

// A group whose sheet had no admin list has no active person rows. That is
// "not recorded", which the matrix must not show as "nobody is admin there".
export const hasAdminList = (groupMembers: RosterMember[]): boolean =>
  groupMembers.some((m) => isPerson(m) && m.status === 'active');

export const ownersOf = (groupMembers: RosterMember[]): RosterMember[] =>
  groupMembers.filter((m) => m.role === 'owner' && m.status === 'active');

export const roleLabel = (m: RosterMember): string => {
  if (m.role === 'owner') return m.title ? `owner · ${m.title}` : 'owner';
  if (m.role === 'bot') return m.title || 'bot';
  return m.title || 'admin';
};

export type Coverage =
  | { kind: 'admin'; member: RosterMember }
  | { kind: 'requested'; member: RosterMember }
  | { kind: 'missing' }
  | { kind: 'unknown' };

export const coverageFor = (groupMembers: RosterMember[], tracked: TrackedAdmin): Coverage => {
  const key = handleKey(tracked.handle);
  const member = groupMembers.find((m) => isPerson(m) && handleKey(m.handle) === key);
  if (member?.status === 'active') return { kind: 'admin', member };
  if (member?.status === 'requested') return { kind: 'requested', member };
  return hasAdminList(groupMembers) ? { kind: 'missing' } : { kind: 'unknown' };
};
