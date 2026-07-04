import React, { useState } from 'react';
import { Event } from '../../types';
import { formatDate } from '../../utils/dateHelpers';
import { getCategoryLabel, getBgColorClass } from '../../utils/colorHelpers';

interface EventCardProps {
  event: Event;
  isActive: boolean;
  onClose: () => void;
  onEdit?: (updatedEvent: Event) => void;
  onDelete?: () => void;
  isDarkMode?: boolean;
}

const EventCard: React.FC<EventCardProps> = ({ event, isActive, onClose, onEdit, onDelete, isDarkMode = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);

  const categoryLabel = getCategoryLabel(event.category);
  const bgColorClass = getBgColorClass(event.category);
  const cardBgClass = isDarkMode ? 'bg-gray-700' : 'bg-white';
  const cardTextClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const cardSubtextClass = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const closeButtonClass = isDarkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-400 hover:text-gray-600';
  const inputBgClass = isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-300 text-gray-900';

  const handleSave = () => {
    onEdit?.(editedEvent);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={`${cardBgClass} rounded-lg shadow-lg p-4 w-96 border-l-4 transition-all overflow-y-auto max-h-96 ${bgColorClass}`}>
        <div className="flex justify-between items-start mb-3 sticky top-0 bg-inherit z-10">
          <h3 className={`font-bold text-sm ${cardTextClass}`}>Edit Event</h3>
          <button onClick={() => setIsEditing(false)} className={`text-lg leading-none ${closeButtonClass}`}>×</button>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Title</label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Description */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Description</label>
            <textarea
              value={editedEvent.description}
              onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
            />
          </div>

          {/* Requirements */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Requirements</label>
            <textarea
              value={editedEvent.requirements || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, requirements: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="e.g., Developer account, GitHub submission"
            />
          </div>

          {/* Resources */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Resources</label>
            <textarea
              value={editedEvent.resources || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, resources: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="e.g., Documentation, API docs, sample code"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Start Date</label>
            <input
              type="date"
              value={editedEvent.startDate.toISOString().split('T')[0]}
              onChange={(e) => setEditedEvent({ ...editedEvent, startDate: new Date(e.target.value) })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* End Date */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>End Date (Optional)</label>
            <input
              type="date"
              value={editedEvent.endDate ? editedEvent.endDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, endDate: e.target.value ? new Date(e.target.value) : undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Application Link */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>How to Apply Link</label>
            <input
              type="url"
              placeholder="https://..."
              value={editedEvent.applicationLink || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, applicationLink: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* X Post Link */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>X Post Link</label>
            <input
              type="url"
              placeholder="https://x.com/..."
              value={editedEvent.xPostLink || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, xPostLink: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Winner Criteria */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Winner Criteria</label>
            <textarea
              value={editedEvent.winnerCriteria || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, winnerCriteria: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="e.g., Code quality, innovation, completeness"
            />
          </div>

          {/* Notion Link */}
          <div>
            <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Notion Link</label>
            <input
              type="url"
              placeholder="https://notion.so/..."
              value={editedEvent.notionLink || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, notionLink: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Rewards Section */}
          {editedEvent.rewards && (
            <div className={`border-t ${isDarkMode ? 'border-gray-600' : 'border-gray-200'} pt-3`}>
              <p className={`text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>Rewards</p>

              {/* Amount */}
              <div className="mb-2">
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Amount</label>
                <input
                  type="text"
                  value={editedEvent.rewards.amount}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, amount: e.target.value }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                />
              </div>

              {/* Currency */}
              <div className="mb-2">
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Currency</label>
                <input
                  type="text"
                  value={editedEvent.rewards.currency}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, currency: e.target.value }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                />
              </div>

              {/* Default Delivery Date */}
              <div className="mb-2">
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Default Delivery Date</label>
                <input
                  type="date"
                  value={editedEvent.rewards.defaultDeliveryDate.toISOString().split('T')[0]}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, defaultDeliveryDate: new Date(e.target.value) }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                />
              </div>

              {/* Realized Delivery Date */}
              <div className="mb-2">
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Realized Delivery Date</label>
                <input
                  type="date"
                  value={editedEvent.rewards.realizedDeliveryDate ? editedEvent.rewards.realizedDeliveryDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, realizedDeliveryDate: e.target.value ? new Date(e.target.value) : undefined }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                />
              </div>

              {/* Status */}
              <div>
                <label className={`text-xs font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} block mb-1`}>Reward Status</label>
                <select
                  value={editedEvent.rewards.status}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, status: e.target.value as any }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                >
                  <option value="pending">Pending</option>
                  <option value="delayed">Delayed</option>
                  <option value="delivered">Delivered</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex gap-2 mt-4 sticky bottom-0 bg-inherit z-10">
          <button
            onClick={handleSave}
            className="flex-1 bg-green-500 text-white text-xs font-semibold py-2 rounded hover:bg-green-600 transition"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 bg-gray-400 text-white text-xs font-semibold py-2 rounded hover:bg-gray-500 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardBgClass} rounded-lg shadow-lg p-4 w-80 border-l-4 transition-all overflow-y-auto max-h-screen ${bgColorClass}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <h3 className={`font-bold text-sm ${cardTextClass} flex-1`}>{event.title}</h3>
        <button onClick={onClose} className={`text-lg leading-none ${closeButtonClass}`}>×</button>
      </div>

      {/* Category + Type badges */}
      <div className="flex gap-2 mb-3 flex-wrap">
        <span className={`${bgColorClass} text-white text-xs font-semibold px-2 py-1 rounded`}>{categoryLabel}</span>
        <span className={`text-xs font-semibold px-2 py-1 rounded capitalize ${isDarkMode ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-700'}`}>
          {event.type}
        </span>
      </div>

      {/* Dates */}
      <div className="mb-2 text-xs space-y-1">
        <p className={cardSubtextClass}><span className="font-semibold">Start:</span> {formatDate(event.startDate)}</p>
        {event.endDate && <p className={cardSubtextClass}><span className="font-semibold">End:</span> {formatDate(event.endDate)}</p>}
      </div>

      {/* Description */}
      <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'} mb-2 line-clamp-2`}>{event.description}</p>

      {/* Requirements */}
      {event.requirements && (
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="font-semibold">Requirements:</span>
          <p className="ml-2">{event.requirements}</p>
        </div>
      )}

      {/* Resources */}
      {event.resources && (
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="font-semibold">Resources:</span>
          <p className="ml-2">{event.resources}</p>
        </div>
      )}

      {/* Rewards Summary */}
      {event.rewards && (
        <div className={`${isDarkMode ? 'bg-gray-600' : 'bg-gray-50'} rounded p-2 mb-3 text-xs space-y-1`}>
          <p className={`font-semibold ${isDarkMode ? 'text-gray-100' : 'text-gray-800'} mb-1`}>
            💰 Rewards
          </p>
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            <span className="font-semibold">Amount:</span> {event.rewards.amount} {event.rewards.currency}
          </p>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            <span className="font-semibold">Status:</span> <span className={
              event.rewards.status === 'delivered' ? 'text-green-600 font-semibold' :
              event.rewards.status === 'delayed' ? 'text-red-600 font-semibold' :
              'text-yellow-600 font-semibold'
            }>{event.rewards.status}</span>
          </p>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            <span className="font-semibold">Expected:</span> {formatDate(event.rewards.defaultDeliveryDate)}
          </p>
          {event.rewards.realizedDeliveryDate && (
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              <span className="font-semibold">Delivered:</span> {formatDate(event.rewards.realizedDeliveryDate)}
            </p>
          )}
        </div>
      )}

      {/* Winner Criteria */}
      {event.winnerCriteria && (
        <div className={`text-xs mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          <span className="font-semibold">Winner Criteria:</span>
          <p className="ml-2">{event.winnerCriteria}</p>
        </div>
      )}

      {/* Links Section */}
      <div className="flex flex-col gap-2 mb-2">
        {event.applicationLink && (
          <a
            href={event.applicationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center bg-blue-500 text-white text-xs font-semibold py-2 rounded hover:bg-blue-600 transition truncate"
            title="How to Apply"
          >
            Apply
          </a>
        )}
        {event.xPostLink && (
          <a
            href={event.xPostLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center bg-black text-white text-xs font-semibold py-2 rounded hover:bg-gray-800 transition truncate"
            title="X Post"
          >
            Post
          </a>
        )}
        {event.notionLink && (
          <a
            href={event.notionLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center bg-gray-600 text-white text-xs font-semibold py-2 rounded hover:bg-gray-700 transition truncate"
            title="Notion"
          >
            📄 Notion
          </a>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setIsEditing(true)}
          className="flex-1 bg-purple-500 text-white text-xs font-semibold py-2 rounded hover:bg-purple-600 transition"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="flex-1 bg-red-500 text-white text-xs font-semibold py-2 rounded hover:bg-red-600 transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

export default EventCard;
