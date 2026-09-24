import { create } from 'zustand';
import { supabase } from '../utils/supabaseClient';
import { useLogStore } from './logStore';
import {
  MemberRole,
  MemberStatus,
  Platform,
  RosterGroup,
  RosterMember,
  handleKey,
} from '../constants/communityRoster';
import { ROSTER_BASELINE } from '../data/communityRosterBaseline';

// live     -- the shared Supabase tables, editable
// baseline -- the tables do not exist yet, so the PDF transcription is shown
//             read-only rather than an empty screen
export type RosterSource = 'loading' | 'live' | 'baseline' | 'error';

export interface GroupFields {
  name: string;
  platform: Platform;
  url: string | null;
  notes: string | null;
}

export interface MemberFields {
  handle: string;
  role: MemberRole;
  title: string | null;
  status: MemberStatus;
  notes: string | null;
}

interface RosterStore {
  groups: RosterGroup[];
  members: RosterMember[];
  source: RosterSource;
  error: string | null;

  fetchRoster: () => Promise<void>;
  loadBaseline: () => Promise<boolean>;
  saveGroup: (id: string | null, fields: GroupFields) => Promise<RosterGroup | null>;
  deleteGroup: (id: string) => Promise<boolean>;
  addMember: (groupId: string, fields: MemberFields) => Promise<RosterMember | null>;
  updateMember: (id: string, fields: Partial<MemberFields>) => Promise<RosterMember | null>;
  deleteMember: (id: string) => Promise<boolean>;
  clearError: () => void;
}

const GROUPS = 'community_groups';
const MEMBERS = 'community_group_members';

const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const dbToGroup = (row: Record<string, unknown>): RosterGroup => ({
  id: row.id as string,
  name: row.name as string,
  platform: row.platform as Platform,
  url: (row.url as string) || null,
  notes: (row.notes as string) || null,
  sortOrder: (row.sort_order as number) ?? 0,
  updatedAt: (row.updated_at as string) || null,
});

const dbToMember = (row: Record<string, unknown>): RosterMember => ({
  id: row.id as string,
  groupId: row.group_id as string,
  handle: row.handle as string,
  role: row.role as MemberRole,
  title: (row.title as string) || null,
  status: row.status as MemberStatus,
  notes: (row.notes as string) || null,
  createdAt: (row.created_at as string) || null,
  updatedAt: (row.updated_at as string) || null,
});

const groupToDb = (fields: GroupFields) => ({
  name: fields.name.trim(),
  platform: fields.platform,
  url: blankToNull(fields.url),
  notes: blankToNull(fields.notes),
});

// Only the keys the caller passed: an update built from every column would
// null out whatever the caller did not mention.
const memberToDb = (fields: Partial<MemberFields>) => {
  const row: Record<string, unknown> = {};
  if (fields.handle !== undefined) row.handle = fields.handle.trim();
  if (fields.role !== undefined) row.role = fields.role;
  if (fields.title !== undefined) row.title = blankToNull(fields.title);
  if (fields.status !== undefined) row.status = fields.status;
  if (fields.notes !== undefined) row.notes = blankToNull(fields.notes);
  return row;
};

// PGRST205 is PostgREST's "table not in the schema cache", 42P01 Postgres's
// "relation does not exist": either way the SQL file has not been run yet.
const isMissingTable = (error: { code?: string; message?: string }): boolean =>
  error.code === 'PGRST205' ||
  error.code === '42P01' ||
  /schema cache|does not exist/i.test(error.message ?? '');

const describeError = (error: unknown): string => {
  const e = error as { code?: string; message?: string };
  if (e?.code === '23505') return 'That handle is already listed in this group.';
  if (e?.code === '42501') return 'Your account is not allowed to change the admin list.';
  return e?.message || String(error);
};

const baselineRoster = (): { groups: RosterGroup[]; members: RosterMember[] } => ({
  groups: ROSTER_BASELINE.map((g, i) => ({
    id: g.id,
    name: g.name,
    platform: g.platform,
    url: g.url,
    notes: g.notes ?? null,
    sortOrder: i,
    updatedAt: null,
  })),
  members: ROSTER_BASELINE.flatMap((g) =>
    g.members.map((m) => ({
      id: `${g.id}:${handleKey(m.handle)}`,
      groupId: g.id,
      handle: m.handle,
      role: m.role,
      title: m.title ?? null,
      status: 'active' as const,
      notes: m.notes ?? null,
      createdAt: null,
      updatedAt: null,
    })),
  ),
});

const log = (action: string, details: string): void => {
  void useLogStore.getState().addLog(action, details);
};

export const useRosterStore = create<RosterStore>((set, get) => {
  const groupName = (groupId: string): string =>
    get().groups.find((g) => g.id === groupId)?.name ?? 'a group';

  return {
    groups: [],
    members: [],
    source: 'loading',
    error: null,

    fetchRoster: async () => {
      const [groupsResult, membersResult] = await Promise.all([
        supabase.from(GROUPS).select('*').order('sort_order', { ascending: true }),
        supabase.from(MEMBERS).select('*').order('created_at', { ascending: true }),
      ]);
      const error = groupsResult.error ?? membersResult.error;

      if (error && isMissingTable(error)) {
        set({ ...baselineRoster(), source: 'baseline', error: null });
        return;
      }
      if (error) {
        // Keep whatever was on screen: a dropped connection is not an empty roster.
        set({ source: get().groups.length > 0 ? get().source : 'error', error: describeError(error) });
        return;
      }

      set({
        groups: (groupsResult.data ?? []).map(dbToGroup),
        members: (membersResult.data ?? []).map(dbToMember),
        source: 'live',
        error: null,
      });
    },

    // ignoreDuplicates makes a double press, or two stewards pressing at once,
    // land the PDF list once instead of twice.
    loadBaseline: async () => {
      const groupRows = ROSTER_BASELINE.map((g, i) => ({
        id: g.id,
        name: g.name,
        platform: g.platform,
        url: g.url,
        notes: g.notes ?? null,
        sort_order: i,
      }));
      const memberRows = ROSTER_BASELINE.flatMap((g) =>
        g.members.map((m) => ({
          group_id: g.id,
          handle: m.handle,
          role: m.role,
          title: m.title ?? null,
          status: 'active',
          notes: m.notes ?? null,
        })),
      );

      const groupsResult = await supabase
        .from(GROUPS)
        .upsert(groupRows, { onConflict: 'id', ignoreDuplicates: true });
      if (groupsResult.error) {
        set({ error: describeError(groupsResult.error) });
        return false;
      }
      const membersResult = await supabase
        .from(MEMBERS)
        .upsert(memberRows, { onConflict: 'group_id,handle_key', ignoreDuplicates: true });
      if (membersResult.error) {
        set({ error: describeError(membersResult.error) });
        return false;
      }

      log('roster_load_baseline', `Loaded the PDF admin list: ${groupRows.length} groups, ${memberRows.length} entries`);
      await get().fetchRoster();
      return true;
    },

    saveGroup: async (id, fields) => {
      const row = groupToDb(fields);
      const nextOrder = Math.max(-1, ...get().groups.map((g) => g.sortOrder)) + 1;
      const { data, error } = id
        ? await supabase.from(GROUPS).update(row).eq('id', id).select().single()
        : await supabase.from(GROUPS).insert({ ...row, sort_order: nextOrder }).select().single();

      if (error || !data) {
        set({ error: describeError(error ?? 'No data returned') });
        return null;
      }

      const saved = dbToGroup(data);
      set((state) => ({
        groups: id
          ? state.groups.map((g) => (g.id === id ? saved : g))
          : [...state.groups, saved],
        error: null,
      }));
      log(id ? 'roster_update_group' : 'roster_add_group', `${id ? 'Updated' : 'Added'} group: ${saved.name}`);
      return saved;
    },

    deleteGroup: async (id) => {
      const name = groupName(id);
      const { error } = await supabase.from(GROUPS).delete().eq('id', id);
      if (error) {
        set({ error: describeError(error) });
        return false;
      }
      set((state) => ({
        groups: state.groups.filter((g) => g.id !== id),
        members: state.members.filter((m) => m.groupId !== id),
        error: null,
      }));
      log('roster_delete_group', `Deleted group: ${name}`);
      return true;
    },

    addMember: async (groupId, fields) => {
      const { data, error } = await supabase
        .from(MEMBERS)
        .insert({ ...memberToDb(fields), group_id: groupId })
        .select()
        .single();

      if (error || !data) {
        set({ error: describeError(error ?? 'No data returned') });
        return null;
      }

      const added = dbToMember(data);
      set((state) => ({ members: [...state.members, added], error: null }));
      log(
        added.status === 'requested' ? 'roster_request_admin' : 'roster_add_member',
        added.status === 'requested'
          ? `Asked for ${added.handle} to be made admin in ${groupName(groupId)}`
          : `Added ${added.handle} to ${groupName(groupId)} as ${added.title || added.role}`,
      );
      return added;
    },

    updateMember: async (id, fields) => {
      const before = get().members.find((m) => m.id === id);
      const { data, error } = await supabase
        .from(MEMBERS)
        .update(memberToDb(fields))
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        set({ error: describeError(error ?? 'No data returned') });
        return null;
      }

      const updated = dbToMember(data);
      set((state) => ({
        members: state.members.map((m) => (m.id === id ? updated : m)),
        error: null,
      }));
      const appointed = before?.status === 'requested' && updated.status === 'active';
      log(
        appointed ? 'roster_admin_appointed' : 'roster_update_member',
        appointed
          ? `${updated.handle} is now admin in ${groupName(updated.groupId)}`
          : `Updated ${updated.handle} in ${groupName(updated.groupId)}: ${updated.title || updated.role}`,
      );
      return updated;
    },

    deleteMember: async (id) => {
      const member = get().members.find((m) => m.id === id);
      const { error } = await supabase.from(MEMBERS).delete().eq('id', id);
      if (error) {
        set({ error: describeError(error) });
        return false;
      }
      set((state) => ({ members: state.members.filter((m) => m.id !== id), error: null }));
      if (member) {
        log(
          member.status === 'requested' ? 'roster_cancel_request' : 'roster_remove_member',
          member.status === 'requested'
            ? `Cancelled the admin request for ${member.handle} in ${groupName(member.groupId)}`
            : `Removed ${member.handle} from ${groupName(member.groupId)}`,
        );
      }
      return true;
    },

    clearError: () => set({ error: null }),
  };
});
