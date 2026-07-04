import React, { useState } from 'react';
import Timeline from '../components/Timeline/Timeline';
import CalendarWidget from '../components/Calendar/CalendarWidget';
import { Event } from '../types';
import { sampleEvents } from '../data/sampleEvents';

const Dashboard: React.FC = () => {
  const [events, setEvents] = useState<Event[]>(sampleEvents);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleEventUpdate = (updatedEvent: Event) => {
    setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
  };

  const handleEventDelete = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleAddEvent = (newEvent: Event) => {
    setEvents([...events, newEvent]);
    setShowAddModal(false);
  };

  const bgClass = isDarkMode ? 'bg-gray-900' : 'bg-gray-100';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const headerClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
  const sidebarClass = isDarkMode ? 'bg-gray-800' : 'bg-white';

  return (
    <div className={`h-screen ${bgClass} flex flex-col`}>
      {/* Header */}
      <header className={`${headerClass} shadow-sm border-b`}>
        <div className="max-w-full px-6 py-4 flex justify-between items-start">
          <div>
            <h1 className={`text-3xl font-bold ${textClass}`}>Mantle Sync</h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              Track campaigns, events, and rewards across 2026
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowAddModal(true)}
              className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition ${
                isDarkMode
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              title="Add New Event"
            >
              +
            </button>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`px-4 py-2 rounded font-semibold transition ${
                isDarkMode
                  ? 'bg-amber-500 text-gray-900 hover:bg-amber-600'
                  : 'bg-gray-800 text-white hover:bg-gray-900'
              }`}
            >
              {isDarkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with Calendar - Desktop Only */}
        <aside className={`w-80 ${sidebarClass} shadow-lg p-6 overflow-y-auto hidden lg:flex flex-col border-r ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h2 className={`text-lg font-bold ${textClass} mb-4`}>Timeline View</h2>
          <CalendarWidget isDarkMode={isDarkMode} />

          {/* Quick Info */}
          <div className="mt-8">
            <h3 className={`font-bold ${textClass} mb-3`}>Quick Stats</h3>
            <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <p>
                <span className="font-semibold">Total Events:</span> {events.length}
              </p>
              <p>
                <span className="font-semibold">Rewards Pending:</span>{' '}
                {events.filter(e => e.rewards?.status === 'pending').length}
              </p>
              <p>
                <span className="font-semibold">Rewards Delayed:</span>{' '}
                {events.filter(e => e.rewards?.status === 'delayed').length}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Timeline Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <Timeline
            events={events}
            onEventUpdate={handleEventUpdate}
            onEventDelete={handleEventDelete}
            isDarkMode={isDarkMode}
          />

          {/* Mobile Calendar Toggle */}
          <div className={`lg:hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow p-4 sticky bottom-0 border-t`}>
            <button className="w-full bg-blue-500 text-white font-semibold py-2 rounded hover:bg-blue-600 transition">
              Show Calendar
            </button>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar - Calendar */}
      <aside className="lg:hidden fixed inset-0 bg-black bg-opacity-50 hidden z-40">
        <div className={`${sidebarClass} w-80 h-full overflow-y-auto p-6`}>
          <CalendarWidget isDarkMode={isDarkMode} />
        </div>
      </aside>

      {/* Add Event Modal */}
      {showAddModal && (
        <AddEventModal
          isDarkMode={isDarkMode}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddEvent}
        />
      )}
    </div>
  );
};

interface AddEventModalProps {
  isDarkMode: boolean;
  onClose: () => void;
  onAdd: (event: Event) => void;
}

const AddEventModal: React.FC<AddEventModalProps> = ({ isDarkMode, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'mantle' as const,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    type: 'news' as const,
    description: '',
    applicationLink: '',
    xPostLink: '',
    leaderboardLink: '',
    notionLink: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: Event = {
      id: Date.now().toString(),
      title: formData.title,
      category: formData.category,
      startDate: new Date(formData.startDate),
      endDate: formData.endDate ? new Date(formData.endDate) : undefined,
      type: formData.type,
      description: formData.description,
      applicationLink: formData.applicationLink || undefined,
      xPostLink: formData.xPostLink || undefined,
      leaderboardLink: formData.leaderboardLink || undefined,
      notionLink: formData.notionLink || undefined,
      tags: [],
      isFavorite: false,
    };
    onAdd(newEvent);
  };

  const inputClass = isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDarkMode ? 'bg-gray-700' : 'bg-white'} rounded-lg shadow-xl w-full max-w-2xl max-h-96 overflow-y-auto`}>
        <div className="sticky top-0 flex justify-between items-center p-6 border-b" style={{ borderColor: isDarkMode ? '#4b5563' : '#e5e7eb' }}>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add New Event</h2>
          <button onClick={onClose} className={`text-2xl font-bold ${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Title */}
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>

            {/* Category */}
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              >
                <option value="mantle">Mantle</option>
                <option value="byreal">ByReal</option>
                <option value="solana">Solana</option>
                <option value="meth">mETH</option>
                <option value="xeyit">XEYIT</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Type */}
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              >
                <option value="bounty">Bounty</option>
                <option value="hackathon">Hackathon</option>
                <option value="news">News</option>
                <option value="campaign">Campaign</option>
                <option value="featured">Featured</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Start Date *</label>
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
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>End Date</label>
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
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-12 resize-none ${inputClass}`}
            />
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Apply Link</label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.applicationLink}
                onChange={(e) => setFormData({ ...formData, applicationLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>X Post Link</label>
              <input
                type="url"
                placeholder="https://x.com/..."
                value={formData.xPostLink}
                onChange={(e) => setFormData({ ...formData, xPostLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Leaderboard Link</label>
              <input
                type="url"
                placeholder="https://..."
                value={formData.leaderboardLink}
                onChange={(e) => setFormData({ ...formData, leaderboardLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
            </div>
            <div>
              <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Notion Link</label>
              <input
                type="url"
                placeholder="https://notion.so/..."
                value={formData.notionLink}
                onChange={(e) => setFormData({ ...formData, notionLink: e.target.value })}
                className={`w-full px-2 py-1 border rounded text-sm ${inputClass}`}
              />
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
