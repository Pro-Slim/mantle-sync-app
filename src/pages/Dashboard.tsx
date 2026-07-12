import React, { useState, useRef, useEffect } from 'react';
import Timeline, { BASE_TIMELINE_WIDTH, TIMELINE_PADDING } from '../components/Timeline/Timeline';
import CalendarWidget from '../components/Calendar/CalendarWidget';
import EventCountdownClock from '../components/EventCountdownClock';
import AuthModal from '../components/AuthModal';
import { Event, CalendarReminder } from '../types';
import { parseCSV, csvToEvents, eventsToCSV } from '../utils/csvImporter';
import { getPositionFromDate, toDateInputValue, parseDateInputValue } from '../utils/dateHelpers';
import { useAuth } from '../contexts/AuthContext';
import { useEventStore } from '../stores/eventStore';
import { useReminderStore } from '../stores/reminderStore';
import { useLogStore } from '../stores/logStore';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useSyncStatusStore } from '../stores/syncStatusStore';
import { offlineQueue } from '../utils/offlineQueue';
import { syncAll } from '../utils/queueSync';


interface CountdownClockState {
  eventId: string;
  type: 'endDate' | 'rewardDelivery';
}


const Dashboard: React.FC = () => {
  const { user, session } = useAuth();
  const [showAuthModal, setShowAuthModal] = React.useState(!session);
  const { events, fetchEvents } = useEventStore();
  const { reminders } = useReminderStore();
  const { logs, fetchLogs, addLog } = useLogStore();
  
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [sidebarVisible, setSidebarVisible] = React.useState(false);
  const [countdownClocks, setCountdownClocks] = React.useState<CountdownClockState[]>([]);
  const [timelineHeight, setTimelineHeight] = React.useState(600);
  const [hoverEnabled, setHoverEnabled] = React.useState(true);
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineResizeRef = useRef<HTMLDivElement>(null);
  const resizeStartYRef = useRef<number>(0);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [reminderModalOpen, setReminderModalOpen] = React.useState(false);
  const [selectedReminderDate, setSelectedReminderDate] = React.useState<Date | null>(null);
  const [reminderTitle, setReminderTitle] = React.useState('');
  const [logsModalOpen, setLogsModalOpen] = React.useState(false);
  const isOnline = useNetworkStatus();
  const { pendingCount, isSyncing } = useSyncStatusStore();


  // Fetch data when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      fetchEvents(user.id);
      fetchLogs(user.id);
    }
  }, [user?.id, fetchEvents, fetchLogs]);

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
    if (timelineRef.current) {
      const todayPosition = getPositionFromDate(new Date(), BASE_TIMELINE_WIDTH * zoomLevel) + TIMELINE_PADDING;
      const scrollPosition = todayPosition - (timelineRef.current.clientWidth / 2);
      timelineRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
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

        // Import functionality will be enhanced in the next phase
        // For now, notify user that this feature needs Supabase update
        alert(`⚠️ Import feature coming soon! (${importedEvents.length} events detected)`);
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

  const handleExportEvents = () => {
    if (events.length === 0) {
      alert('No events to export!');
      return;
    }

    const csv = eventsToCSV(events);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Mantle_Events_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    alert(`✅ Successfully exported ${events.length} events!`);
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

      // Check if Ctrl or Cmd key is held down
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

  return (
    <div className="h-screen bg-gradient-to-b from-[#050D20] via-[#0A1628] to-[#0E2520] flex flex-col relative overflow-hidden">
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
            <div className="flex-shrink-0">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Mantle<span className="text-[#65B3AE]">Sync</span>
              </h1>
              <p className="text-xs text-[#65B3AE] opacity-70 -mt-1">Event Timeline</p>
            </div>
          </div>

          {/* Right Section: Control Buttons */}
          <div className="flex gap-2 items-center flex-shrink-0">
            {/* User Indicator */}
            <div className="px-3 py-2 rounded-lg mantle-frosted-light text-[#7FD4D0] text-sm font-semibold flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#65B3AE]">
                <circle cx="12" cy="8" r="4" fill="currentColor" />
                <path fill="currentColor" d="M12 14c-5 0-8 2.5-8 4v3h16v-3c0-1.5-3-4-8-4z" opacity="0.8" />
              </svg>
              {user?.email?.split('@')[0] || 'Guest'}
            </div>

            {/* Change User Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="px-3 py-2 rounded-lg mantle-frosted-light text-[#7FD4D0] text-sm font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 hover:mantle-glow-pulse"
              title="Switch user"
            >
              ⇄
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-gradient-to-b from-[#65B3AE] via-[#65B3AE] to-transparent opacity-20" />

            {/* Event Controls Group */}
            <div className="flex gap-2 items-center relative">
              {/* Add Event Button */}
              <button
                onClick={() => setShowAddModal(true)}
                className="w-10 h-10 rounded-lg mantle-frosted-light flex items-center justify-center font-bold text-lg text-[#65B3AE] transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 hover:mantle-glow-pulse"
                title="Add New Event"
              >
                +
              </button>

              {/* Settings Menu Button (Mantle Logo) */}
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-10 h-10 rounded-lg mantle-frosted-light flex items-center justify-center transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 group relative"
                title="Settings"
              >
                <svg viewBox="0 0 100 100" className="w-6 h-6 text-[#65B3AE] group-hover:text-[#7FD4D0] transition">
                  {/* Mantle radial logo - 12 segments radiating from center */}
                  <g>
                    {/* Center circle */}
                    <circle cx="50" cy="50" r="8" fill="currentColor" opacity="0.9"/>

                    {/* Outer segments (12 points) */}
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(0 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(30 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(60 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(90 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(120 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(150 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(180 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(210 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(240 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(270 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(300 50 50)"/>
                    <rect x="46" y="12" width="8" height="18" fill="currentColor" opacity="0.8" transform="rotate(330 50 50)"/>
                  </g>
                </svg>
              </button>

              {/* Settings Dropdown Menu */}
              {settingsOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 mantle-frosted rounded-lg border border-[rgba(101,179,174,0.3)] shadow-xl z-40">
                  <div className="p-2 space-y-1">
                    {/* Import */}
                    <button
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
                      onClick={async () => {
                        if (confirm('Clear all logs? This cannot be undone.')) {
                          await useLogStore.getState().clearLogs();
                          setSettingsOpen(false);
                        }
                      }}
                      className="w-full px-4 py-2 rounded-lg text-left text-[#ff8787] font-semibold text-sm transition-all hover:bg-[#ff8787] hover:bg-opacity-10 flex items-center gap-3"
                      title="Clear All Logs"
                    >
                      <svg viewBox="0 0 24 24" className="w-5 h-5 text-[#ff8787]">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-9l-1 1H5v2h14V4z"/>
                      </svg>
                      Clear Logs
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
              />

              {/* Hover Toggle */}
              <button
                onClick={() => setHoverEnabled(!hoverEnabled)}
                className={`w-10 h-10 rounded-lg transition-all font-semibold flex items-center justify-center ${
                  hoverEnabled
                    ? 'mantle-frosted-light text-[#65B3AE] hover:bg-[#65B3AE] hover:bg-opacity-20'
                    : 'bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.1)]'
                }`}
                title={hoverEnabled ? 'Hover: ON' : 'Hover: OFF'}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
                  {hoverEnabled ? (
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  ) : (
                    <path d="M11.83 9L5.5 2.7A.996.996 0 1 0 4.08 4.12l16.2 16.2c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L12.17 9zM12 4c5 0 9.27 3.11 11 7.5-1.73 4.39-6 7.5-11 7.5-.98 0-1.93-.15-2.85-.44l1.89-1.89C11.36 17.38 12 16.49 12 15.5c0-1.66-1.34-3-3-3-.99 0-1.88.64-2.44 1.51l1.27 1.27c.08-.22.2-.42.35-.6L5.1 5C6.04 4.56 9 4 12 4z"/>
                  )}
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gradient-to-b from-[#65B3AE] via-[#65B3AE] to-transparent opacity-20" />

            {/* Zoom Controls Group */}
            <div className="flex gap-2 items-center">
              <button
                onClick={handleZoomOut}
                title="Zoom Out (−) | Ctrl+Scroll"
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
              >
                −
              </button>
              <div
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] text-sm font-semibold min-w-[50px] text-center"
                title="Current zoom level"
              >
                {Math.round(zoomLevel * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                title="Zoom In (+) | Ctrl+Scroll"
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20"
              >
                +
              </button>
              <button
                onClick={handleCenter}
                title="Center on Today"
                className="px-3 py-2 rounded-lg mantle-frosted-light text-[#65B3AE] font-semibold transition-all hover:bg-[#65B3AE] hover:bg-opacity-20 mantle-glow-pulse"
              >
                ⊙
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

            <CalendarWidget onDateSelect={handleCalendarDateSelect} reminders={reminders} onDeleteReminder={handleDeleteReminder} />

            {/* Quick Info */}
            <div className="mt-8 p-4 rounded-lg bg-white bg-opacity-5 border border-[rgba(101,179,174,0.1)]">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#65B3AE]" />
                Quick Stats
              </h3>
              <div className="space-y-2 text-sm text-[#7FD4D0]">
                <p className="flex justify-between">
                  <span className="font-semibold">Total Events:</span>
                  <span className="font-bold text-white">{events.length}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold">Rewards Pending:</span>
                  <span className="font-bold text-white">{events.filter(e => e.rewards?.status === 'pending').length}</span>
                </p>
                <p className="flex justify-between">
                  <span className="font-semibold">Rewards Delayed:</span>
                  <span className="font-bold text-white">{events.filter(e => e.rewards?.status === 'delayed').length}</span>
                </p>
              </div>
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

      {/* Event Countdown Clocks at Bottom */}
      <div className="mantle-frosted border-t border-[rgba(101,179,174,0.2)] px-4 py-4 overflow-x-auto relative z-10">
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
    resources: '',
    applicationLink: '',
    xPostLink: '',
    winnerCriteria: '',
    winnerAnnouncementDate: '',
    notionLink: '',
    rewardAmount: '',
    rewardCurrency: 'MNT',
    defaultDeliveryDate: '',
    realizedDeliveryDate: '',
    rewardStatus: 'pending' as const,
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
      resources: formData.resources || undefined,
      applicationLink: formData.applicationLink || undefined,
      xPostLink: formData.xPostLink || undefined,
      winnerCriteria: formData.winnerCriteria || undefined,
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
    };
    onAdd(newEvent);
  };

  const inputClass = 'bg-[rgba(101,179,174,0.1)] border-[rgba(101,179,174,0.3)] text-white placeholder-[rgba(255,255,255,0.4)]';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4">
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
