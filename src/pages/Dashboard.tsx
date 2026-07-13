import React, { useState, useRef, useEffect, useMemo } from 'react';
import Timeline, { BASE_TIMELINE_WIDTH, TIMELINE_PADDING } from '../components/Timeline/Timeline';
import CalendarWidget from '../components/Calendar/CalendarWidget';
import EventCountdownClock from '../components/EventCountdownClock';
import AuthModal from '../components/AuthModal';
import SettingsIcon from '../components/Icons/SettingsIcon';
import ApprovalStatus from '../components/ApprovalStatus';
import AdminPanel from '../components/AdminPanel';
import Tutorial from '../components/Tutorial';
import { isAdmin } from '../constants/admins';
import { Event, CalendarReminder } from '../types';
import { parseCSV, csvToEvents, eventsToCSV } from '../utils/csvImporter';
import { getPositionFromDate, toDateInputValue, parseDateInputValue, formatDate } from '../utils/dateHelpers';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../stores/eventStore';
import { useReminderStore } from '../stores/reminderStore';
import { useLogStore } from '../stores/logStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import { offlineQueue } from '../utils/offlineQueue';
import { syncAll } from '../utils/queueSync';
import { handleButtonHoverSound, playWhooshSound, playGearTurnSound, isSoundMuted, toggleSoundMuted } from '../utils/soundEffects';


interface CountdownClockState {
  eventId: string;
  type: 'endDate' | 'rewardDelivery';
}


const Dashboard: React.FC = () => {
  const { user, session, userApprovalStatus } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(!session);
  const { events, fetchEvents } = useEventStore();
  const { reminders } = useReminderStore();
  const { logs, fetchLogs, addLog } = useLogStore();
  
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showAdminPanel, setShowAdminPanel] = React.useState(false);
  const [tutorialOpen, setTutorialOpen] = React.useState(false);
  const [soundMuted, setSoundMutedState] = React.useState(() => isSoundMuted());
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  const [countdownClocks, setCountdownClocks] = React.useState<CountdownClockState[]>([]);
  const [timelineHeight, setTimelineHeight] = React.useState(600);
  const [hoverEnabled, setHoverEnabled] = React.useState(true);
  const [zoomLevel, setZoomLevel] = React.useState(2.4); // Default 240% to show full year
  const [detailsViewMode, setDetailsViewMode] = React.useState<'countdown' | 'table'>('countdown');
  const [selectedEventForTable, setSelectedEventForTable] = React.useState<Event | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineResizeRef = useRef<HTMLDivElement>(null);
  const resizeStartYRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [settingsSpinning, setSettingsSpinning] = React.useState(false);
  const [logoMusicOpen, setLogoMusicOpen] = React.useState(false);
  const [logoMusicMinimized, setLogoMusicMinimized] = React.useState(false);
  const [reminderModalOpen, setReminderModalOpen] = React.useState(false);
  const [selectedReminderDate, setSelectedReminderDate] = React.useState<Date | null>(null);
  const [reminderTitle, setReminderTitle] = React.useState('');
  const [logsModalOpen, setLogsModalOpen] = React.useState(false);
  const [improvementNotes, setImprovementNotes] = React.useState('');
  const [improvementAttachment, setImprovementAttachment] = React.useState<File | null>(null);
  const improvementFileInputRef = useRef<HTMLInputElement>(null);
  const [statsExpanded, setStatsExpanded] = React.useState(false);
  const [expandedFields, setExpandedFields] = React.useState<Set<string>>(new Set());
  const toggleExpandedField = (key: string) => {
    setExpandedFields(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };
  type TableDraftField = 'requirementsDetails' | 'winnerCriteriaDetails' | 'winnersPine' | 'remarks';
  const [tableDrafts, setTableDrafts] = React.useState<Record<TableDraftField, string>>({
    requirementsDetails: '',
    winnerCriteriaDetails: '',
    winnersPine: '',
    remarks: '',
  });
  const isOnline = useNetworkStatus();
  const { pendingCount, isSyncing } = useSyncStatusStore();

  const stats = useMemo(() => ({
    totalEvents: events.length,
    pendingRewards: events.filter(e => e.rewards?.status === 'pending').length,
    delayedRewards: events.filter(e => e.rewards?.status === 'delayed').length,
    announcementPending: events.filter(e => e.winnerAnnouncementDate && e.winnerAnnouncementDate >= new Date()).length,
    announcementDelayed: events.filter(e => e.winnerAnnouncementDate && e.winnerAnnouncementDate < new Date()).length,
  }), [events]);

  // Load per-event draft fields whenever the selected table event changes,
  // so edits from a previous event don't leak into the newly selected one.
  useEffect(() => {
    setTableDrafts({
      requirementsDetails: selectedEventForTable?.requirementsDetails || '',
      winnerCriteriaDetails: selectedEventForTable?.winnerCriteriaDetails || '',
      winnersPine: selectedEventForTable?.winnersPine || '',
      remarks: selectedEventForTable?.remarks || '',
    });
  }, [selectedEventForTable?.id]);

  const commitTableDraft = (field: TableDraftField) => {
    const draftValue = tableDrafts[field];
    if (draftValue !== (selectedEventForTable?.[field] || '')) {
      updateSelectedEventField({ [field]: draftValue || undefined });
    }
  };

  // Fetch data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
      fetchLogs(user.id);
    }
  }, [user?.id, fetchEvents, fetchLogs]);

  // Scrolls the timeline so `date` is centered. Shared by the mount-scroll
  // effect, "Center on Today", and calendar date navigation so the position
  // math and clamp only live in one place.
  const scrollTimelineToDate = (date: Date, options: { smooth?: boolean; sound?: boolean } = {}) => {
    if (!timelineRef.current) return;
    const targetPosition = getPositionFromDate(date, BASE_TIMELINE_WIDTH * zoomLevel) + TIMELINE_PADDING;
    const scrollPosition = Math.max(0, targetPosition - timelineRef.current.clientWidth / 2);
    if (options.smooth) {
      timelineRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    } else {
      timelineRef.current.scrollLeft = scrollPosition;
    }
    if (options.sound) {
      playWhooshSound();
    }
  };

  // Close the Settings dropdown when clicking outside it
  useEffect(() => {
    if (!settingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  // Scroll to today when events load
  useEffect(() => {
    if (events.length > 0 && timelineRef.current) {
      setTimeout(() => scrollTimelineToDate(new Date()), 100);
    }
  }, [events.length]);

  // Load any pending queue count left over from a previous session
  useEffect(() => {
    offlineQueue.size().then((count) => {
      useSyncStatusStore.getState().setPendingCount(count);
    });
  }, []);

  // Auto-sync when coming online. The isSyncing/pendingCount guards prevent
  // re-entry, so no manual throttle is needed.
  useEffect(() => {
    if (isOnline && user?.id && !isSyncing && pendingCount > 0) {
      syncAll(user.id);
    }
  }, [isOnline, user?.id, isSyncing, pendingCount]);


  
  const handleCalendarDateNavigate = (date: Date) => {
    scrollTimelineToDate(date, { smooth: true, sound: true });
  };

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedReminderDate(date);
    setReminderModalOpen(true);
  };

    const handleCreateReminder = async () => {
    if (!selectedReminderDate || !reminderTitle.trim() || !user?.id) {
      alert('Please enter a reminder title');
      return;
    }
    const newReminder: Omit<CalendarReminder, 'id'> = {
      date: selectedReminderDate,
      title: reminderTitle.trim(),
    };
    await useReminderStore.getState().addReminder(newReminder);
    setReminderModalOpen(false);
    setReminderTitle('');
    setSelectedReminderDate(null);
    await addLog('create_reminder', `Added: ${reminderTitle.trim()}`);
  };


    const handleDeleteReminder = async (reminderId: string) => {
    if (!user?.id) return;
    const reminder = reminders.find(r => r.id === reminderId);
    await useReminderStore.getState().deleteReminder(reminderId);
    if (reminder) {
      await addLog('delete_reminder', `Removed: ${reminder.title}`);
    }
  };


    const handleEventUpdate = async (updatedEvent: Event) => {
    if (!user?.id) return;
    await useEventStore.getState().updateEvent(updatedEvent.id, updatedEvent);
    await addLog('update_event', `Updated: ${updatedEvent.title}`);
  };

  // Merges a field change into the freshest selectedEventForTable via the
  // functional setState form, so back-to-back blurs on different fields
  // (e.g. tabbing Requirements -> Winners Pine) can't clobber each other
  // with a stale closure of selectedEventForTable.
  const updateSelectedEventField = (fieldUpdate: Partial<Event>) => {
    setSelectedEventForTable(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...fieldUpdate };
      handleEventUpdate(updated);
      return updated;
    });
  };


    const handleChangeCountdownType = async (eventId: string, newType: 'endDate' | 'rewardDelivery') => {
    if (!user?.id) return;
    setCountdownClocks(
      countdownClocks.map(c =>
        c.eventId === eventId ? { ...c, type: newType } : c
      )
    );
    const event = events.find(e => e.id === eventId);
    if (event) {
      await addLog('change_countdown', `Changed countdown for ${event.title}`);
    }
  };


   const handleEventDelete = async (eventId: string) => {
    if (!user?.id) return;
    const event = events.find(e => e.id === eventId);
    await useEventStore.getState().deleteEvent(eventId);
    if (event) {
      await addLog('delete_event', `Deleted: ${event.title}`);
    }
  };


   const handleAddEvent = async (newEvent: Event) => {
    if (!user?.id) return;
    await useEventStore.getState().addEvent(newEvent);
    setShowAddModal(false);
    await addLog('create_event', `Created: ${newEvent.title}`);
  };


  const handleAddCountdown = (eventId: string) => {
    if (countdownClocks.find(c => c.eventId === eventId)) return;

    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const type = event.endDate ? 'endDate' : event.rewards ? 'rewardDelivery' : null;
    if (!type) {
      alert('This event has no end date or reward delivery date to count down to.');
      return;
    }

    setCountdownClocks([...countdownClocks, { eventId, type }]);
  };

  const handleRemoveCountdown = (eventId: string) => {
    setCountdownClocks(countdownClocks.filter(c => c.eventId !== eventId));
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    resizeStartYRef.current = e.clientY;
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - resizeStartYRef.current;
      setTimelineHeight(prev => Math.max(300, prev + delta));
      resizeStartYRef.current = moveEvent.clientY;
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleCenter = () => {
    scrollTimelineToDate(new Date(), { smooth: true, sound: true });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        let importedEvents: Event[];
        if (isExcel) {
          // Loaded on demand so the xlsx library stays out of the main bundle
          const { parseExcel, excelToEvents } = await import('../utils/excelImporter');
          importedEvents = excelToEvents(parseExcel(event.target?.result as ArrayBuffer));
        } else {
          importedEvents = csvToEvents(parseCSV(event.target?.result as string));
        }

        if (importedEvents.length === 0) {
          alert('No valid events found. Please check the file format.');
          return;
        }

        // Import events to database
        let successCount = 0;
        let failCount = 0;

        for (const importedEvent of importedEvents) {
          try {
            await useEventStore.getState().addEvent(importedEvent);
            successCount++;
          } catch (error) {
            failCount++;
            console.error(`Failed to import event: ${importedEvent.title}`, error);
          }
        }

        await addLog('import_events', `Imported ${successCount} events${failCount > 0 ? `, ${failCount} failed` : ''}`);
        alert(`✅ Successfully imported ${successCount} events!${failCount > 0 ? ` (${failCount} failed)` : ''}`);
      } catch (error) {
        alert(`❌ Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportEvents = async () => {
    if (!user?.id) {
      alert('Not authenticated');
      return;
    }

    try {
      // Refresh events from database before export
      await fetchEvents(user.id);

      const currentEvents = useEventStore.getState().events;

      if (currentEvents.length === 0) {
        alert('No events to export!');
        return;
      }

      const csv = eventsToCSV(currentEvents);

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `Mantle_Events_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      await addLog('export_events', `Exported ${currentEvents.length} events`);
      alert(`✅ Successfully exported ${currentEvents.length} events!`);
    } catch (error) {
      console.error('Export failed:', error);
      alert(`❌ Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDownloadTemplate = () => {
    const link = document.createElement('a');
    link.href = '/Mantle_Event_Import_Template.csv';
    link.download = 'Mantle_Event_Import_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (!timelineRef.current) return;
      if (!timelineRef.current.contains(e.target as Node)) return;
      if (!e.ctrlKey && !e.metaKey) return;

      e.preventDefault();

      // Zoom in (scroll up) or out (scroll down)
      const zoomDelta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(0.5, Math.min(3, prev + zoomDelta)));
    };

    const timelineElement = timelineRef.current;
    if (timelineElement) {
      timelineElement.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (timelineElement) {
        timelineElement.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  // Show approval status if user is logged in but not approved
  // EXCEPT: allow admins to access admin panel to approve themselves
  if (session && userApprovalStatus !== 'approved' && !isAdmin(user?.email)) {
    return <ApprovalStatus />;
  }

  // Show admin panel if requested
  if (showAdminPanel) {
    return (
      <div className="h-screen bg-gradient-to-b from-[#050D20] via-[#0A1628] to-[#0E2520]">
        <div className="p-4">
          <button
            onClick={() => setShowAdminPanel(false)}
            className="mb-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-gray-300 font-semibold rounded transition"
          >
            ← Back to Dashboard
          </button>
          <AdminPanel />
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen bg-gradient-to-b from-[#050D20] via-[#0A1628] to-[#0E2520] flex flex-col relative overflow-hidden"
      onMouseOver={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          handleButtonHoverSound(e);
        }
      }}
    >
      {/* Auth Modal */}
      {showAuthModal && <AuthModal onAuthSuccess={() => setShowAuthModal(false)} />}

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-b from-[#65B3AE] to-transparent opacity-5 blur-3xl rounded-full mantle-float" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-gradient-to-t from-[#008F5A] to-transparent opacity-5 blur-3xl rounded-full" style={{ animation: 'float-up 6s ease-in-out infinite reverse' }} />
      </div>

      {/* Header */}
      <header className="mantle-frosted border-b border-[rgba(101,179,174,0.2)] backdrop-blur-md relative z-20">
        <div className="max-w-full px-6 py-4 flex justify-between items-center gap-6">
          {/* Left Section: Mantle Logo & Title */}
          <div className="flex gap-4 items-center flex-1">
            {/* Mantle Icon */}
            {/* Sync Status Indicator */}
            {!isOnline && (
              <div className="text-xs px-2 py-1 bg-red-500/20 border border-red-500/50 rounded text-red-400">
                🔴 Offline
              </div>
            )}
            {isSyncing && (
              <div className="text-xs px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-blue-400 flex items-center gap-2">
                ⏳ Syncing...
              </div>
            )}
            {pendingCount > 0 && !isSyncing && isOnline && (
              <div className="text-xs px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-yellow-400">
                ⚠️ {pendingCount} pending
              </div>
            )}

            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="flex-shrink-0 w-12 h-12 rounded-lg mantle-frosted-light flex items-center justify-center text-white transition-all hover:scale-105 hover:mantle-glow-pulse group relative"
              title={sidebarVisible ? 'Hide Calendar' : 'Show Calendar'}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#65B3AE] group-hover:text-[#7FD4D0] transition">
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
                <circle cx="12" cy="5" r="2" fill="currentColor" opacity="0.7"/>
                <circle cx="19" cy="12" r="2" fill="currentColor" opacity="0.7"/>
                <circle cx="12" cy="19" r="2" fill="currentColor" opacity="0.7"/>
                <circle cx="5" cy="12" r="2" fill="currentColor" opacity="0.7"/>
              </svg>
            </button>

            {/* Title */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <button
                onClick={() => setLogoMusicOpen(!logoMusicOpen)}
                className="p-0 border-0 bg-transparent cursor-pointer"
                title={logoMusicOpen ? 'Stop music' : 'Play a track'}
              >
                <img
                  src="/mantle-logo.svg"
                  alt="Mantle"
                  className={`w-9 h-9 mantle-glow-pulse transition-transform hover:scale-110 ${logoMusicOpen ? 'mantle-spin' : ''}`}
                />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Mantle<span className="text-[#65B3AE]">Synch</span>App
                </h1>
                <p className="text-xs text-[#65B3AE] opacity-70 -mt-1">Event Timeline</p>
              </div>
            </div>
          </div>

          {logoMusicOpen && (
            <>
              <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 mantle-frosted rounded-xl p-2 shadow-2xl w-80" style={{ display: logoMusicMinimized ? 'none' : 'block' }}>
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => setLogoMusicMinimized(true)}
                    className="text-lg text-[#7FD4D0] hover:text-[#65B3AE] transition"
                    title="Minimize music player"
                  >
                    −
                  </button>
                </div>
                <iframe
                  title="Mantle logo track"
                  width="100%"
                  height="166"
                  scrolling="no"
                  frameBorder="no"
                  allow="autoplay; encrypted-media"
                  src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/soundcloud%253Atracks%253A513636780&color=%23242c2c&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
                />
                <div className="text-[10px] text-[#7FD4D0] mt-1 truncate">
                  <a href="https://soundcloud.com/user-956334953" target="_blank" rel="noreferrer" className="hover:underline">coldplay songs</a>
                  {' · '}
                  <a href="https://soundcloud.com/user-956334953/pitch-shifted-coldplay-a-sky-full-of-stars-official-video-2" target="_blank" rel="noreferrer" className="hover:underline">Coldplay - A Sky Full Of Stars</a>
                </div>
              </div>
              {logoMusicMinimized && (
                <button
                  onClick={() => setLogoMusicMinimized(false)}
                  className="fixed top-4 left-4 z-50 w-10 h-10 flex items-center justify-center mantle-frosted-light text-[#7FD4D0] hover:text-[#65B3AE] transition rounded-lg md:left-20"
                  title="Expand music player"
                >
                  ♪
                </button>
              )}
            </>
          )}

          {/* Right Section: Control Buttons */}
          <div className="flex gap-2 items-center flex-shrink-0">
            {/* Settings Menu Button */}
            <div ref={settingsRef} className="relative">
              <button
                data-tutorial="settings-button"
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  playGearTurnSound();
                  setSettingsSpinning(true);
                  setTimeout(() => setSettingsSpinning(false), 600);
                }}
                className="w-10 h-10 rounded-lg mantle-frosted-light flex items-center justify-center transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 group relative"
                title="Settings"
              >
                <img
                  src="/mantle-brand-mark-white.svg"
                  alt="Settings"
                  className={`w-6 h-6 ${settingsSpinning ? 'mantle-spin-once' : ''}`}
                />
              </button>

              {/* Settings Dropdown Menu */}
              {settingsOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 mantle-frosted rounded-lg border border-[rgba(101,179,174,0.3)] shadow-xl z-40">
                  <div className="px-4 py-3 border-b border-[rgba(101,179,174,0.2)] flex items-center gap-2">
                    <SettingsIcon size={20} fill="#7FD4D0" />
                    <h3 className="text-sm font-bold text-[#7FD4D0]">Settings</h3>
                  </div>
                  <div className="p-2 space-y-1">
                    {/* Add Event */}
                    <button
                      data-tutorial="add-event"
                      onClick={() => {
                        setShowAddModal(true);
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="Add New Event"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      Add Event
                    </button>

                    {/* Switch User */}
                    <button
                      data-tutorial="switch-user"
                      onClick={() => {
                        setShowAuthModal(true);
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="Switch user"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                        <circle cx="12" cy="8" r="4" fill="currentColor" />
                        <path fill="currentColor" d="M12 14c-5 0-8 2.5-8 4v3h16v-3c0-1.5-3-4-8-4z" opacity="0.8" />
                      </svg>
                      Switch User ({user?.email?.split('@')[0] || 'Guest'})
                    </button>

                    {/* Hover Toggle */}
                    <button
                      data-tutorial="hover-toggle"
                      onClick={() => setHoverEnabled(!hoverEnabled)}
                      className={`w-full px-4 py-2 rounded-lg text-left font-semibold text-sm transition-all flex items-center gap-3 ${
                        hoverEnabled
                          ? 'text-[#7FD4D0] hover:bg-[#65B3AE] hover:bg-opacity-20'
                          : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)]'
                      }`}
                      title={hoverEnabled ? 'Hover: ON' : 'Hover: OFF'}
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${hoverEnabled ? 'text-[#65B3AE]' : 'text-[rgba(255,255,255,0.5)]'}`} fill="currentColor">
                        {hoverEnabled ? (
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        ) : (
                          <path d="M11.83 9L5.5 2.7A.996.996 0 1 0 4.08 4.12l16.2 16.2c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.17 9zM12 4c5 0 9.27 3.11 11 7.5-1.73 4.39-6 7.5-11 7.5-.98 0-1.93-.15-2.85-.44l1.89-1.89C11.36 17.38 12 16.49 12 15.5c0-1.66-1.34-3-3-3-.99 0-1.88.64-2.44 1.51l1.27 1.27c.08-.22.2-.42.35-.6L5.1 5C6.04 4.56 9 4 12 4z"/>
                        )}
                      </svg>
                      Hover {hoverEnabled ? 'ON' : 'OFF'}
                    </button>

                    {/* View Mode Toggle */}
                    <button
                      data-tutorial="view-mode-toggle"
                      onClick={() => {
                        setDetailsViewMode(detailsViewMode === 'countdown' ? 'table' : 'countdown');
                        setSelectedEventForTable(null);
                      }}
                      className={`w-full px-4 py-2 rounded-lg text-left font-semibold text-sm transition-all flex items-center gap-3 ${
                        detailsViewMode === 'table'
                          ? 'text-[#7FD4D0] hover:bg-[#65B3AE] hover:bg-opacity-20'
                          : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)]'
                      }`}
                      title="Toggle between Countdown and Table view"
                    >
                      <svg viewBox="0 0 24 24" className={`w-5 h-5 ${detailsViewMode === 'table' ? 'text-[#65B3AE]' : 'text-[rgba(255,255,255,0.5)]'}`} fill="currentColor">
                        <path d="M3 5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v2H3V5zm0 4v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V9H3zm2 3h4v4H5v-4zm6 0h4v4h-4v-4z"/>
                      </svg>
                      View: {detailsViewMode === 'countdown' ? 'Countdown' : 'Table'}
                    </button>

                    {/* Divider */}
                    <div className="my-2 h-px bg-[rgba(101,179,174,0.2)]" />

                    {/* Import */}
                    <button
                      data-tutorial="import-events"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="Import Events from CSV or Excel"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                        <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                      </svg>
                      Import Events
                    </button>

                    {/* Template */}
                    <button
                      data-tutorial="download-template"
                      onClick={() => {
                        handleDownloadTemplate();
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="Download Excel Template"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#7FD4D0]">
                        <path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-8-6z"/>
                        <path fill="currentColor" d="M16 18H8v-2h8v2zm0-4H8v-2h8v2z" opacity="0.7"/>
                      </svg>
                      Download Template
                    </button>

                    {/* Export */}
                    <button
                      data-tutorial="export-events"
                      onClick={() => {
                        handleExportEvents();
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="Export All Events to CSV"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                        <path fill="currentColor" d="M5 11h6V5h2v6h6v2h-6v6h-2v-6H5v-2z"/>
                      </svg>
                      Export Events
                    </button>

                    {/* Divider */}
                    <div className="my-2 h-px bg-[rgba(101,179,174,0.2)]" />

                    {/* Logs */}
                    <button
                      data-tutorial="view-logs"
                      onClick={() => {
                        setLogsModalOpen(true);
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="View Activity Logs"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                        <path fill="currentColor" d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                      </svg>
                      View Logs
                    </button>

                    {/* Clear Logs */}
                    <button
                      data-tutorial="clear-logs"
                      onClick={async () => {
                        if (confirm('Clear all logs? This cannot be undone.')) {
                          await useLogStore.getState().clearLogs();
                          setSettingsOpen(false);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-gray-400 font-semibold text-sm transition-all hover:bg-gray-600 hover:bg-opacity-30 flex items-center gap-3"
                      title="Clear All Logs"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-gray-400">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"/>
                      </svg>
                      Clear Logs
                    </button>

                    {/* Mute Sounds Toggle */}
                    <button
                      data-tutorial="mute-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        const nowMuted = toggleSoundMuted();
                        setSoundMutedState(nowMuted);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#7FD4D0] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title={soundMuted ? 'Unmute sound effects' : 'Mute sound effects'}
                    >
                      {soundMuted ? (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                          <path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L18.73 21 20 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                          <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                        </svg>
                      )}
                      {soundMuted ? 'Unmute Sounds' : 'Mute Sounds'}
                    </button>

                    {/* Divider */}
                    <div className="my-2 h-px bg-[rgba(101,179,174,0.2)]" />

                    {/* Tutorial Toggle */}
                    <button
                      data-tutorial="tutorial-toggle"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTutorialOpen(!tutorialOpen);
                        setSettingsOpen(false);
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#65B3AE] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                      title="Start guided tutorial"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-13c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5z"/>
                      </svg>
                      Tutorial
                    </button>

                    {/* Divider */}
                    <div className="my-2 h-px bg-[rgba(101,179,174,0.2)]" />

                    {/* Admin Panel (only for admins) */}
                    {user?.email && isAdmin(user.email) && (
                      <button
                        data-tutorial="admin-panel"
                        onClick={() => {
                          setShowAdminPanel(!showAdminPanel);
                          setSettingsOpen(false);
                        }}
                        className="w-full px-4 py-2 rounded-lg text-left text-[#65B3AE] font-semibold text-sm transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 flex items-center gap-3"
                        title="User Approval Management"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#65B3AE]">
                          <circle cx="12" cy="8" r="4" fill="currentColor" />
                          <path fill="currentColor" d="M12 14c-5 0-8 2.5-8 4v3h16v-3c0-1.5-3-4-8-4z" opacity="0.8" />
                        </svg>
                        Admin Panel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
              />

            {/* Divider */}
            <div className="w-px h-6 bg-gradient-to-b from-[#65B3AE] via-[#65B3AE] to-transparent opacity-20" />

            {/* Zoom Controls Group */}
            <div className="flex gap-2 items-center">
              <button
                onClick={handleZoomOut}
                title="Zoom Out (−) | Ctrl+Scroll Down"
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
              >
                −
              </button>
              <button
                onClick={handleCenter}
                title="Center on Today"
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 mantle-glow-pulse"
              >
                ⊙
              </button>
              <button
                onClick={handleZoomIn}
                title="Zoom In (+) | Ctrl+Scroll Up"
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar with Calendar */}
        {sidebarVisible && (
          <aside className="w-80 mantle-frosted border-r border-[rgba(101,179,174,0.2)] p-6 overflow-y-auto flex flex-col fixed lg:relative inset-y-0 left-0 lg:inset-auto z-30 lg:z-auto transition-all">
            {/* Sidebar Close Button */}
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setSidebarVisible(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white bg-opacity-5 text-[#65B3AE] hover:bg-opacity-10 transition-all"
                title="Close Calendar"
              >
                ✕
              </button>
            </div>

            <CalendarWidget onDateSelect={handleCalendarDateNavigate} onDateDoubleClick={handleCalendarDateSelect} reminders={reminders} onDeleteReminder={handleDeleteReminder} />

            {/* Quick Stats */}
            <div className="mt-8 p-4 rounded-lg bg-white bg-opacity-5 border border-[rgba(101,179,174,0.1)]">
              <button
                onClick={() => setStatsExpanded(!statsExpanded)}
                className="w-full font-bold text-white flex items-center justify-between gap-2"
                title={statsExpanded ? 'Collapse stats' : 'Expand stats'}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#65B3AE]" />
                  Quick Stats
                </span>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-4 h-4 text-[#65B3AE] transition-transform ${statsExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {statsExpanded && (
                <div className="space-y-2 text-sm text-[#7FD4D0] mt-3">
                  <p className="flex justify-between">
                    <span className="font-semibold">Total Events:</span>
                    <span className="font-bold text-white">{stats.totalEvents}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold">Rewards Pending:</span>
                    <span className="font-bold text-white">{stats.pendingRewards}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold">Rewards in Delay:</span>
                    <span className="font-bold text-white">{stats.delayedRewards}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold">Anc. Pending:</span>
                    <span className="font-bold text-white">{stats.announcementPending}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold">Anc. in Delay:</span>
                    <span className="font-bold text-white">{stats.announcementDelayed}</span>
                  </p>
                </div>
              )}
            </div>

            {/* To Improve */}
            <div data-to-improve-section className="mt-8 p-4 rounded-lg bg-white bg-opacity-5 border border-[rgba(101,179,174,0.1)] flex flex-col flex-1">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#65B3AE]" />
                  To Improve
                </h3>
                <button
                  onClick={() => improvementFileInputRef.current?.click()}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-[#65B3AE] hover:bg-[#65B3AE] hover:bg-opacity-20 transition-all"
                  title="Attach image for visual suggestion"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
              </div>
              <div className="relative flex-1 flex flex-col">
                <textarea
                  value={improvementNotes}
                  onChange={(e) => setImprovementNotes(e.target.value)}
                  placeholder="Add improvement requests, notes, or ideas here..."
                  className="flex-1 bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] rounded-lg p-3 pr-12 text-sm text-[#7FD4D0] placeholder-[rgba(101,179,174,0.5)] focus:outline-none focus:border-[rgba(101,179,174,0.5)] focus:ring-1 focus:ring-[#65B3AE] resize-none"
                />
                <button
                  onClick={async () => {
                    if (improvementNotes.trim()) {
                      const details = `Suggestion: ${improvementNotes}${improvementAttachment ? ` | Attachment: ${improvementAttachment.name}` : ''}`;
                      await addLog('improvement_suggestion', details);
                      alert('✅ Improvement suggestion sent!');
                      setImprovementNotes('');
                      setImprovementAttachment(null);
                    } else {
                      alert('Please add a suggestion before sending.');
                    }
                  }}
                  className="absolute bottom-3 right-3 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#65B3AE] hover:bg-opacity-20 transition-all"
                  title="Send suggestion"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-[#65B3AE]">
                    <path d="M22 2L11 13M22 2l-7 20-5-9-9-5 20-7z"/>
                  </svg>
                </button>
              </div>
              {improvementAttachment && (
                <div className="mt-3 p-2 rounded-lg bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] flex items-center justify-between">
                  <span className="text-xs text-[#7FD4D0] truncate">📎 {improvementAttachment.name}</span>
                  <button
                    onClick={() => setImprovementAttachment(null)}
                    className="text-[#65B3AE] hover:text-[#7FD4D0] transition text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}
              <input
                ref={improvementFileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setImprovementAttachment(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
          </aside>
        )}

        {/* Overlay for mobile when sidebar is visible */}
        {sidebarVisible && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm lg:hidden z-20"
            onClick={() => setSidebarVisible(false)}
          />
        )}

        {/* Main Timeline Area */}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <div style={{ height: `${timelineHeight}px`, overflow: 'hidden' }} className="relative mantle-frosted-light border-b border-[rgba(101,179,174,0.1)]">
            <Timeline
              events={events}
              onEventSelect={(event) => {
                if (event && detailsViewMode === 'table') {
                  setSelectedEventForTable(event);
                } else if (!event) {
                  setSelectedEventForTable(null);
                }
              }}
              onEventUpdate={handleEventUpdate}
              onEventDelete={handleEventDelete}
              onAddCountdown={handleAddCountdown}
              hoverEnabled={hoverEnabled}
              zoomLevel={zoomLevel}
              timelineRef={timelineRef}
            />
          </div>

          {/* Resize Handle */}
          <div
            ref={timelineResizeRef}
            onMouseDown={handleResizeStart}
            className="h-1 cursor-ns-resize transition-all bg-gradient-to-r from-transparent via-[#65B3AE] to-transparent opacity-30 hover:opacity-70 hover:shadow-lg hover:shadow-[#65B3AE]/50"
            title="Drag to resize timeline area"
          />

          {/* Scrollable area below timeline */}
          <div className="flex-1 overflow-y-auto" />
        </main>
      </div>

      {/* Event Details Panel (Table View) */}
      {detailsViewMode === 'table' && selectedEventForTable && (
        <div className="mantle-frosted border-t border-[rgba(101,179,174,0.2)] overflow-auto relative z-10" style={{ maxHeight: '45vh' }} data-event-details-panel onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 bg-gradient-to-b from-[#0A1628] to-transparent z-20 mb-4 px-4 pt-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-[#7FD4D0]">{selectedEventForTable.title}</h3>
              <p className="text-xs text-[rgba(101,179,174,0.6)] mt-1">Event Details</p>
            </div>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => {
                  // Edit / Review action
                  alert('Edit / Review mode coming soon');
                }}
                className="px-3 py-2 rounded-lg text-sm font-semibold text-[#65B3AE] hover:bg-[#65B3AE] hover:bg-opacity-20 transition"
                title="Edit / Review event"
              >
                Edit / Review
              </button>
              <button
                onClick={() => setSelectedEventForTable(null)}
                className="text-xl text-[#65B3AE] hover:text-[#7FD4D0] transition"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>
          <div className="px-4">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[rgba(101,179,174,0.2)]">
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">ID</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.id}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Title</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.title}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Description</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.description || '—'}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Start Date</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{formatDate(selectedEventForTable.startDate)}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">End Date</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.endDate ? formatDate(selectedEventForTable.endDate) : '—'}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Type</td>
                  <td className="px-3 py-2 text-[#7FD4D0] capitalize">{selectedEventForTable.type}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Category</td>
                  <td className="px-3 py-2 text-[#7FD4D0] capitalize">{selectedEventForTable.category}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Tags</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.tags?.length ? selectedEventForTable.tags.join(', ') : '—'}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Favorite</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.isFavorite ? '★ Yes' : 'No'}</td>
                </tr>
                {selectedEventForTable.applicationLink && (
                  <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                    <td className="px-3 py-2 text-[#65B3AE] font-semibold">Application Link</td>
                    <td className="px-3 py-2 text-[#7FD4D0] truncate"><a href={selectedEventForTable.applicationLink} target="_blank" rel="noopener noreferrer" className="text-[#65B3AE] hover:underline">{selectedEventForTable.applicationLink}</a></td>
                  </tr>
                )}
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold flex items-center gap-2">
                    Requirements
                    <button
                      onClick={() => toggleExpandedField('requirements')}
                      className="w-5 h-5 flex items-center justify-center rounded-lg text-sm hover:bg-[#65B3AE] hover:bg-opacity-20 transition"
                      title="Expand Requirements"
                    >
                      +
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.requirements || '—'}</td>
                </tr>
                {expandedFields.has('requirements') && (
                  <tr className="bg-[rgba(101,179,174,0.05)]">
                    <td colSpan={2} className="px-3 py-3">
                      <div className="bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] rounded-lg p-3">
                        <p className="text-xs text-[#65B3AE] font-semibold mb-2">Additional Requirements Details</p>
                        <textarea
                          value={tableDrafts.requirementsDetails}
                          onChange={(e) => setTableDrafts(prev => ({ ...prev, requirementsDetails: e.target.value }))}
                          onBlur={() => commitTableDraft('requirementsDetails')}
                          placeholder="Add more requirement details..."
                          className="w-full bg-[rgba(101,179,174,0.05)] border border-[rgba(101,179,174,0.2)] rounded px-2 py-2 text-xs text-[#7FD4D0] placeholder-[rgba(101,179,174,0.4)] focus:outline-none focus:border-[#65B3AE] resize-none h-16"
                        />
                      </div>
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Resources</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.resources || '—'}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold flex items-center gap-2">
                    Winner Criteria
                    <button
                      onClick={() => toggleExpandedField('winnerCriteria')}
                      className="w-5 h-5 flex items-center justify-center rounded-lg text-sm hover:bg-[#65B3AE] hover:bg-opacity-20 transition"
                      title="Expand Winner Criteria"
                    >
                      +
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.winnerCriteria || '—'}</td>
                </tr>
                {expandedFields.has('winnerCriteria') && (
                  <tr className="bg-[rgba(101,179,174,0.05)]">
                    <td colSpan={2} className="px-3 py-3">
                      <div className="bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] rounded-lg p-3">
                        <p className="text-xs text-[#65B3AE] font-semibold mb-2">Additional Winner Criteria Details</p>
                        <textarea
                          value={tableDrafts.winnerCriteriaDetails}
                          onChange={(e) => setTableDrafts(prev => ({ ...prev, winnerCriteriaDetails: e.target.value }))}
                          onBlur={() => commitTableDraft('winnerCriteriaDetails')}
                          placeholder="Add more winner criteria details..."
                          className="w-full bg-[rgba(101,179,174,0.05)] border border-[rgba(101,179,174,0.2)] rounded px-2 py-2 text-xs text-[#7FD4D0] placeholder-[rgba(101,179,174,0.4)] focus:outline-none focus:border-[#65B3AE] resize-none h-16"
                        />
                      </div>
                    </td>
                  </tr>
                )}
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Winner Announcement Date</td>
                  <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.winnerAnnouncementDate ? formatDate(selectedEventForTable.winnerAnnouncementDate) : '—'}</td>
                </tr>
                <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                  <td className="px-3 py-2 text-[#65B3AE] font-semibold">Winners Pine</td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={tableDrafts.winnersPine}
                      onChange={(e) => setTableDrafts(prev => ({ ...prev, winnersPine: e.target.value }))}
                      onBlur={() => commitTableDraft('winnersPine')}
                      placeholder="—"
                      className="w-full bg-transparent border border-transparent hover:border-[rgba(101,179,174,0.3)] focus:border-[#65B3AE] focus:bg-[rgba(101,179,174,0.05)] rounded px-2 py-1 text-[#7FD4D0] placeholder-[rgba(101,179,174,0.4)] focus:outline-none transition"
                    />
                  </td>
                </tr>
                {selectedEventForTable.notionLink && (
                  <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                    <td className="px-3 py-2 text-[#65B3AE] font-semibold">Notion Link</td>
                    <td className="px-3 py-2 text-[#7FD4D0] truncate"><a href={selectedEventForTable.notionLink} target="_blank" rel="noopener noreferrer" className="text-[#65B3AE] hover:underline">{selectedEventForTable.notionLink}</a></td>
                  </tr>
                )}
                {selectedEventForTable.rewards && (
                  <>
                    <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                      <td className="px-3 py-2 text-[#65B3AE] font-semibold">Reward Amount</td>
                      <td className="px-3 py-2 text-[#7FD4D0]">{selectedEventForTable.rewards.amount} {selectedEventForTable.rewards.currency}</td>
                    </tr>
                    <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                      <td className="px-3 py-2 text-[#65B3AE] font-semibold">Reward Status</td>
                      <td className="px-3 py-2 text-[#7FD4D0] capitalize">{selectedEventForTable.rewards.status}</td>
                    </tr>
                    <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                      <td className="px-3 py-2 text-[#65B3AE] font-semibold">Default Delivery Date</td>
                      <td className="px-3 py-2 text-[#7FD4D0]">{formatDate(selectedEventForTable.rewards.defaultDeliveryDate)}</td>
                    </tr>
                    {selectedEventForTable.rewards.realizedDeliveryDate && (
                      <tr className="hover:bg-[rgba(101,179,174,0.05)] transition">
                        <td className="px-3 py-2 text-[#65B3AE] font-semibold">Realized Delivery Date</td>
                        <td className="px-3 py-2 text-[#7FD4D0]">{formatDate(selectedEventForTable.rewards.realizedDeliveryDate)}</td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Remarks Panel */}
          <div className="mt-4 p-3 bg-[rgba(101,179,174,0.05)] border border-[rgba(101,179,174,0.2)] rounded-lg">
            <p className="text-xs font-semibold text-[#65B3AE] mb-2">Remarks</p>
            <textarea
              value={tableDrafts.remarks}
              onChange={(e) => setTableDrafts(prev => ({ ...prev, remarks: e.target.value }))}
              onBlur={() => commitTableDraft('remarks')}
              placeholder="Add any remarks or notes about this event..."
              className="w-full bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] rounded px-2 py-2 text-xs text-[#7FD4D0] placeholder-[rgba(101,179,174,0.4)] focus:outline-none focus:border-[#65B3AE] resize-none h-12"
            />
          </div>
        </div>
      )}

      {/* Event Countdown Clocks at Bottom */}
      <div data-countdown-section className="mantle-frosted border-t border-[rgba(101,179,174,0.2)] px-4 py-4 overflow-x-auto relative z-10">
        <div className="flex gap-4 justify-center flex-wrap min-h-[120px] items-center">
          {countdownClocks.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-[rgba(101,179,174,0.6)]">
                No countdown clocks active
              </p>
              <p className="text-xs text-[rgba(101,179,174,0.4)] mt-1">
                Click on an event to add one
              </p>
            </div>
          ) : (
            countdownClocks.map(countdown => {
              const event = events.find(e => e.id === countdown.eventId);
              return event ? (
                <div key={countdown.eventId} className="flex-shrink-0">
                  <EventCountdownClock
                    event={event}
                    countdownType={countdown.type}
                    onDelete={() => handleRemoveCountdown(countdown.eventId)}
                    onTypeChange={(newType) =>
                      handleChangeCountdownType(countdown.eventId, newType)
                    }
                    isDarkMode={true}
                  />
                </div>
              ) : null;
            })
          )}
        </div>
      </div>

      {/* Add Event Modal */}
      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEvent}
        />
      )}

      {/* Reminder Modal */}
      {reminderModalOpen && selectedReminderDate && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="mantle-frosted rounded-xl w-full max-w-md">
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-[rgba(101,179,174,0.2)] bg-[rgba(5,13,32,0.8)]">
              <h2 className="text-2xl font-bold text-white">Create Reminder</h2>
              <button
                onClick={() => {
                  setReminderModalOpen(false);
                  setReminderTitle('');
                  setSelectedReminderDate(null);
                }}
                className="text-2xl font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-semibold text-[#7FD4D0] block mb-2">
                  Date: {selectedReminderDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </label>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#7FD4D0] block mb-2">Reminder Title *</label>
                <input
                  type="text"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  placeholder="Enter reminder title..."
                  className="w-full px-3 py-2 border rounded bg-[rgba(101,179,174,0.1)] border-[rgba(101,179,174,0.3)] text-white placeholder-[rgba(255,255,255,0.4)]"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateReminder()}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setReminderModalOpen(false);
                    setReminderTitle('');
                    setSelectedReminderDate(null);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg border border-[rgba(101,179,174,0.3)] text-[#7FD4D0] font-semibold hover:bg-[rgba(101,179,174,0.1)] transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateReminder}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-[#65B3AE] to-[#7FD4D0] text-[#050D20] font-semibold hover:shadow-lg hover:shadow-[#65B3AE]/50 transition"
                >
                  Create Reminder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="mantle-frosted rounded-xl w-full max-w-2xl max-h-96 flex flex-col">
            <div className="sticky top-0 flex justify-between items-center p-6 border-b border-[rgba(101,179,174,0.2)] bg-[rgba(5,13,32,0.8)]">
              <h2 className="text-2xl font-bold text-white">Activity Logs</h2>
              <button
                onClick={() => setLogsModalOpen(false)}
                className="text-2xl font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {logs.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-sm text-[rgba(101,179,174,0.6)]">No activity logs yet</p>
                </div>
              ) : (
                <div className="space-y-1 p-4">
                  {logs.map(log => (
                    <div key={log.id} className="p-3 rounded-lg bg-[rgba(101,179,174,0.05)] border border-[rgba(101,179,174,0.1)] hover:border-[rgba(101,179,174,0.3)] transition">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#7FD4D0] capitalize">
                            {log.action.replace(/_/g, ' ')}
                          </p>
                          {log.details && (
                            <p className="text-xs text-[rgba(101,179,174,0.7)] mt-1">{log.details}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-[rgba(101,179,174,0.5)]">
                            {new Date(log.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}
                          </p>
                          <p className="text-xs text-[rgba(101,179,174,0.4)]">
                            {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial */}
      <Tutorial
        isOpen={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onRequireSettingsOpen={setSettingsOpen}
        onRequireSidebarOpen={setSidebarVisible}
        onRequireTableView={(open) => {
          if (open) {
            setDetailsViewMode('table');
            setSelectedEventForTable(prev => prev ?? events[0] ?? null);
          } else {
            setDetailsViewMode('countdown');
          }
        }}
        isAdmin={!!user?.email && isAdmin(user.email)}
      />
    </div>
  );
};

interface AddEventModalProps {
  onClose: () => void;
  onAdd: (event: Event) => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'mantle' as const,
    startDate: toDateInputValue(new Date()),
    endDate: '',
    type: 'news' as const,
    description: '',
    requirements: '',
    requirementsDetails: '',
    resources: '',
    applicationLink: '',
    xPostLink: '',
    winnerCriteria: '',
    winnerCriteriaDetails: '',
    winnerAnnouncementDate: '',
    notionLink: '',
    rewardAmount: '',
    rewardCurrency: 'MNT',
    defaultDeliveryDate: '',
    realizedDeliveryDate: '',
    rewardStatus: 'pending' as const,
    winnersPine: '',
    remarks: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: Event = {
      id: Date.now().toString(),
      title: formData.title,
      category: formData.category,
      startDate: parseDateInputValue(formData.startDate),
      endDate: formData.endDate ? parseDateInputValue(formData.endDate) : undefined,
      type: formData.type,
      description: formData.description,
      requirements: formData.requirements || undefined,
      requirementsDetails: formData.requirementsDetails || undefined,
      resources: formData.resources || undefined,
      applicationLink: formData.applicationLink || undefined,
      xPostLink: formData.xPostLink || undefined,
      winnerCriteria: formData.winnerCriteria || undefined,
      winnerCriteriaDetails: formData.winnerCriteriaDetails || undefined,
      winnerAnnouncementDate: formData.winnerAnnouncementDate ? parseDateInputValue(formData.winnerAnnouncementDate) : undefined,
      notionLink: formData.notionLink || undefined,
      rewards: formData.rewardAmount && formData.defaultDeliveryDate ? {
        amount: formData.rewardAmount,
        currency: formData.rewardCurrency,
        defaultDeliveryDate: parseDateInputValue(formData.defaultDeliveryDate),
        realizedDeliveryDate: formData.realizedDeliveryDate ? parseDateInputValue(formData.realizedDeliveryDate) : undefined,
        status: formData.rewardStatus,
      } : undefined,
      tags: [],
      isFavorite: false,
      winnersPine: formData.winnersPine || undefined,
      remarks: formData.remarks || undefined,
    };
    onAdd(newEvent);
  };

  const inputClass = 'bg-[rgba(101,179,174,0.1)] border-[rgba(101,179,174,0.3)] text-white placeholder-[rgba(255,255,255,0.4)]';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onMouseOver={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'BUTTON' || target.closest('button')) {
          handleButtonHoverSound(e);
        }
      }}
    >
      <div className="mantle-frosted rounded-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="sticky top-0 flex justify-between items-center p-6 border-b border-[rgba(101,179,174,0.2)] bg-[rgba(5,13,32,0.8)]">
          <h2 className="text-2xl font-bold text-white">Add New Event</h2>
          <button onClick={onClose} className="text-2xl font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Requirements</label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
              placeholder="e.g., Developer account, GitHub submission"
            />
          </div>

          {/* Requirements - Additional Details */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Requirements (Additional Details)</label>
            <textarea
              value={formData.requirementsDetails}
              onChange={(e) => setFormData({ ...formData, requirementsDetails: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
              placeholder="Optional extra requirement detail"
            />
          </div>

          {/* Resources */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Resources</label>
            <textarea
              value={formData.resources}
              onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
              placeholder="e.g., Documentation, API docs, sample code"
            />
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Apply Link</label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.applicationLink}
                onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">X Post Link</label>
              <input
                type="url"
                placeholder="https://x.com/..."
                value={formData.xPostLink}
                onChange={(e) => setFormData({ ...formData, xPostLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Winner Criteria</label>
              <textarea
                placeholder="e.g., Code quality, innovation, completeness"
                value={formData.winnerCriteria}
                onChange={(e) => setFormData({ ...formData, winnerCriteria: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Winner Criteria (Additional Details)</label>
              <textarea
                placeholder="Optional extra winner criteria detail"
                value={formData.winnerCriteriaDetails}
                onChange={(e) => setFormData({ ...formData, winnerCriteriaDetails: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Winners Pine</label>
              <input
                type="text"
                placeholder="Winners Pine"
                value={formData.winnersPine}
                onChange={(e) => setFormData({ ...formData, winnersPine: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Winner Announcement Date</label>
              <input
                type="date"
                value={formData.winnerAnnouncementDate}
                onChange={(e) => setFormData({ ...formData, winnerAnnouncementDate: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Notion Link</label>
              <input
                type="url"
                placeholder="https://notion.so/..."
                value={formData.notionLink}
                onChange={(e) => setFormData({ ...formData, notionLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
          </div>

          {/* Rewards Section */}
          <div className="border-t pt-3" style={{ borderColor: 'rgba(101, 179, 174, 0.2)' }}>
            <h3 className={`text-sm font-bold mb-3 ${'text-[#7FD4D0]'}`}>💰 Rewards (Optional)</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Reward Amount */}
              <div>
                <label className={`text-xs font-semibold ${'text-[#7FD4D0]'} block mb-1`}>Amount</label>
                <input
                  type="text"
                  placeholder="e.g., 50000"
                  value={formData.rewardAmount}
                  onChange={(e) => setFormData({ ...formData, rewardAmount: e.target.value })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
                />
              </div>

              {/* Currency */}
              <div>
                <label className={`text-xs font-semibold ${'text-[#7FD4D0]'} block mb-1`}>Currency</label>
                <select
                  value={formData.rewardCurrency}
                  onChange={(e) => setFormData({ ...formData, rewardCurrency: e.target.value })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
                >
                  <option value="MNT">MNT</option>
                  <option value="BYREAL">BYREAL</option>
                  <option value="SOL">SOL</option>
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                  <option value="USD">USD</option>
                </select>
              </div>

              {/* Default Delivery Date */}
              <div>
                <label className={`text-xs font-semibold ${'text-[#7FD4D0]'} block mb-1`}>Default Delivery Date</label>
                <input
                  type="date"
                  value={formData.defaultDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, defaultDeliveryDate: e.target.value })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
                />
              </div>

              {/* Realized Delivery Date */}
              <div>
                <label className={`text-xs font-semibold ${'text-[#7FD4D0]'} block mb-1`}>Realized Delivery Date</label>
                <input
                  type="date"
                  value={formData.realizedDeliveryDate}
                  onChange={(e) => setFormData({ ...formData, realizedDeliveryDate: e.target.value })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
                />
              </div>

              {/* Reward Status */}
              <div className="col-span-2">
                <label className={`text-xs font-semibold ${'text-[#7FD4D0]'} block mb-1`}>Reward Status</label>
                <select
                  value={formData.rewardStatus}
                  onChange={(e) => setFormData({ ...formData, rewardStatus: e.target.value as any })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
                >
                  <option value="pending">Pending</option>
                  <option value="delayed">Delayed</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div className="border-t pt-3" style={{ borderColor: 'rgba(101, 179, 174, 0.2)' }}>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Remarks</label>
            <textarea
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputClass}`}
              placeholder="Any remarks or notes about this event"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-2 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-400 text-white font-semibold rounded hover:bg-gray-500 transition text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-500 text-white font-semibold rounded hover:bg-green-600 transition text-sm"
            >
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;
