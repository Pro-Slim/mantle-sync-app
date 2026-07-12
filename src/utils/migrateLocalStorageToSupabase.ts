/**
 * Migration utility: Convert localStorage data to Supabase
 *
 * Usage:
 * import { migrateLocalStorageData } from '@/utils/migrateLocalStorageToSupabase';
 * await migrateLocalStorageData(userId);
 */

import { supabase } from './supabaseClient';
import { loadFromStorage } from './storage';
import { Event, CalendarReminder } from '../types';

interface MigrationResult {
  success: boolean;
  eventsCount: number;
  remindersCount: number;
  errors: string[];
}

/**
 * Migrate all localStorage data to Supabase for the current user
 */
export async function migrateLocalStorageData(): Promise<MigrationResult> {
  const errors: string[] = [];
  let eventsCount = 0;
  let remindersCount = 0;

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Load events from localStorage
    const events = loadFromStorage<Event[]>('mantle-sync-events', []);

    if (events.length > 0) {
      console.log(`Migrating ${events.length} events...`);

      // Prepare events for insertion (remove old IDs, convert dates)
      const eventsToInsert = events.map((e) => ({
        user_id: user.id,
        title: e.title,
        category: e.category,
        start_date: e.startDate.toISOString(),
        end_date: e.endDate?.toISOString() || null,
        type: e.type,
        description: e.description || null,
        requirements: e.requirements || null,
        resources: e.resources || null,
        application_link: e.applicationLink || null,
        x_post_link: e.xPostLink || null,
        winner_criteria: e.winnerCriteria || null,
        winner_announcement_date: e.winnerAnnouncementDate?.toISOString() || null,
        notion_link: e.notionLink || null,
        reward_amount: e.rewards?.amount || null,
        reward_currency: e.rewards?.currency || null,
        reward_default_delivery_date: e.rewards?.defaultDeliveryDate?.toISOString() || null,
        reward_realized_delivery_date: e.rewards?.realizedDeliveryDate?.toISOString() || null,
        reward_status: e.rewards?.status || 'pending',
        tags: e.tags || [],
        is_favorite: e.isFavorite || false,
      }));

      // Insert in batches (Supabase has limits)
      const batchSize = 100;
      for (let i = 0; i < eventsToInsert.length; i += batchSize) {
        const batch = eventsToInsert.slice(i, i + batchSize);
        const { error } = await supabase.from('events').insert(batch);

        if (error) {
          errors.push(`Events batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          eventsCount += batch.length;
        }
      }

      console.log(`✅ Migrated ${eventsCount} events`);
    }

    // Load reminders from localStorage
    const reminders = loadFromStorage<CalendarReminder[]>('mantle-sync-reminders', []);

    if (reminders.length > 0) {
      console.log(`Migrating ${reminders.length} reminders...`);

      // Prepare reminders for insertion
      const remindersToInsert = reminders.map((r) => ({
        user_id: user.id,
        date: r.date.toISOString(),
        title: r.title,
      }));

      // Insert reminders
      const { error } = await supabase.from('reminders').insert(remindersToInsert);

      if (error) {
        errors.push(`Reminders: ${error.message}`);
      } else {
        remindersCount = remindersToInsert.length;
      }

      console.log(`✅ Migrated ${remindersCount} reminders`);
    }

    // Note: Activity logs are not migrated as they're historical
    // New logs will be created from this point forward

    return {
      success: errors.length === 0,
      eventsCount,
      remindersCount,
      errors,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errors.push(message);

    return {
      success: false,
      eventsCount,
      remindersCount,
      errors,
    };
  }
}

/**
 * Dry run: Check how much data would be migrated
 */
export async function checkMigrationData() {
  try {
    const events = loadFromStorage<Event[]>('mantle-sync-events', []);
    const reminders = loadFromStorage<CalendarReminder[]>('mantle-sync-reminders', []);

    return {
      hasEvents: events.length > 0,
      eventsCount: events.length,
      hasReminders: reminders.length > 0,
      remindersCount: reminders.length,
      totalItems: events.length + reminders.length,
    };
  } catch (error) {
    console.error('Error checking migration data:', error);
    return {
      hasEvents: false,
      eventsCount: 0,
      hasReminders: false,
      remindersCount: 0,
      totalItems: 0,
    };
  }
}

/**
 * After successful migration, optionally clear localStorage
 * WARNING: Only call this after confirming migration succeeded!
 */
export function clearLocalStorageAfterMigration() {
  try {
    localStorage.removeItem('mantle-sync-events');
    localStorage.removeItem('mantle-sync-reminders');
    localStorage.removeItem('mantle-sync-logs');
    localStorage.removeItem('mantle-sync-user');
    console.log('✅ Cleared localStorage');
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
}
