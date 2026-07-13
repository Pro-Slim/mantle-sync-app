import React, { useState } from 'react';
import { Event } from '../../types';
import { formatDate, toDateInputValue, parseDateInputValue } from '../../utils/dateHelpers';

interface EventCardProps {
  event: Event;
  onClose: () => void;
  onEdit?: (updatedEvent: Event) => void;
  onDelete?: () => void;
  onAddCountdown?: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onClose, onEdit, onDelete, onAddCountdown }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedEvent, setEditedEvent] = useState(event);
  const [showRequirementsDetails, setShowRequirementsDetails] = useState(false);
  const [showWinnerCriteriaDetails, setShowWinnerCriteriaDetails] = useState(false);

  const inputBgClass = 'bg-[rgba(101,179,174,0.1)] border-[rgba(101,179,174,0.3)] text-white placeholder-[rgba(255,255,255,0.4)]';

  const handleSave = () => {
    onEdit?.(editedEvent);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        className="mantle-frosted rounded-xl p-5 w-96 transition-all"
        style={{
          border: '1px solid rgba(101, 179, 174, 0.3)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(101, 179, 174, 0.2), inset 0 1px 1px rgba(101, 179, 174, 0.15)',
        }}
      >
        <div className="flex justify-between items-start mb-4 sticky top-0 z-10 -mx-5 -mt-5 px-5 pt-5 pb-3 border-b border-[rgba(101,179,174,0.1)] bg-[rgba(8,18,35,0.97)] rounded-t-xl">
          <h3 className="font-bold text-sm text-[#7FD4D0]">Edit Event</h3>
          <button onClick={() => setIsEditing(false)} className="text-lg leading-none text-[#7FD4D0] hover:text-[#65B3AE] transition">×</button>
        </div>

        <div className="space-y-3">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Title</label>
            <input
              type="text"
              value={editedEvent.title}
              onChange={(e) => setEditedEvent({ ...editedEvent, title: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Description</label>
            <textarea
              value={editedEvent.description}
              onChange={(e) => setEditedEvent({ ...editedEvent, description: e.target.value })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] flex items-center gap-2 mb-1">
              Requirements
              <button
                type="button"
                onClick={() => setShowRequirementsDetails(!showRequirementsDetails)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#65B3AE] hover:bg-opacity-20 transition"
                title="Add additional requirement details"
              >
                +
              </button>
            </label>
            <textarea
              value={editedEvent.requirements || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, requirements: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="e.g., Developer account, GitHub submission"
            />
            {showRequirementsDetails && (
              <textarea
                value={editedEvent.requirementsDetails || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, requirementsDetails: e.target.value || undefined })}
                className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none mt-1 ${inputBgClass}`}
                placeholder="Additional requirement details"
              />
            )}
          </div>

          {/* Resources */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Resources</label>
            <textarea
              value={editedEvent.resources || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, resources: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="e.g., Documentation, API docs, sample code"
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Start Date</label>
            <input
              type="date"
              value={toDateInputValue(editedEvent.startDate)}
              onChange={(e) => e.target.value && setEditedEvent({ ...editedEvent, startDate: parseDateInputValue(e.target.value) })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* End Date */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">End Date (Optional)</label>
            <input
              type="date"
              value={editedEvent.endDate ? toDateInputValue(editedEvent.endDate) : ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, endDate: e.target.value ? parseDateInputValue(e.target.value) : undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Application Link */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">How to Apply Link</label>
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
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">X Post Link</label>
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
            <label className="text-xs font-semibold text-[#7FD4D0] flex items-center gap-2 mb-1">
              Winner Criteria
              <button
                type="button"
                onClick={() => setShowWinnerCriteriaDetails(!showWinnerCriteriaDetails)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#65B3AE] hover:bg-opacity-20 transition"
                title="Add additional winner criteria details"
              >
                +
              </button>
            </label>
            <textarea
              value={editedEvent.winnerCriteria || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, winnerCriteria: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="e.g., Code quality, innovation, completeness"
            />
            {showWinnerCriteriaDetails && (
              <textarea
                value={editedEvent.winnerCriteriaDetails || ''}
                onChange={(e) => setEditedEvent({ ...editedEvent, winnerCriteriaDetails: e.target.value || undefined })}
                className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none mt-1 ${inputBgClass}`}
                placeholder="Additional winner criteria details"
              />
            )}
          </div>

          {/* Winners Pine */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Winners Pine</label>
            <input
              type="text"
              value={editedEvent.winnersPine || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, winnersPine: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Winner Announcement Date */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Winner Announcement Date</label>
            <input
              type="date"
              value={editedEvent.winnerAnnouncementDate ? toDateInputValue(editedEvent.winnerAnnouncementDate) : ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, winnerAnnouncementDate: e.target.value ? parseDateInputValue(e.target.value) : undefined })}
              className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
            />
          </div>

          {/* Notion Link */}
          <div>
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Notion Link</label>
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
            <div className="border-t border-[rgba(101,179,174,0.1)] pt-3">
              <p className="text-xs font-bold text-[#7FD4D0] mb-2">Rewards</p>

              {/* Amount */}
              <div className="mb-2">
                <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Amount</label>
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
                <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Currency</label>
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
                <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Default Delivery Date</label>
                <input
                  type="date"
                  value={toDateInputValue(editedEvent.rewards.defaultDeliveryDate)}
                  onChange={(e) => e.target.value && setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, defaultDeliveryDate: parseDateInputValue(e.target.value) }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                />
              </div>

              {/* Realized Delivery Date */}
              <div className="mb-2">
                <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Realized Delivery Date</label>
                <input
                  type="date"
                  value={editedEvent.rewards.realizedDeliveryDate ? toDateInputValue(editedEvent.rewards.realizedDeliveryDate) : ''}
                  onChange={(e) => setEditedEvent({
                    ...editedEvent,
                    rewards: { ...editedEvent.rewards!, realizedDeliveryDate: e.target.value ? parseDateInputValue(e.target.value) : undefined }
                  })}
                  className={`w-full px-2 py-1 border rounded text-sm ${inputBgClass}`}
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Reward Status</label>
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

          {/* Remarks */}
          <div className="border-t border-[rgba(101,179,174,0.1)] pt-3">
            <label className="text-xs font-semibold text-[#7FD4D0] block mb-1">Remarks</label>
            <textarea
              value={editedEvent.remarks || ''}
              onChange={(e) => setEditedEvent({ ...editedEvent, remarks: e.target.value || undefined })}
              className={`w-full px-2 py-1 border rounded text-sm h-10 resize-none ${inputBgClass}`}
              placeholder="Any remarks or notes about this event"
            />
          </div>
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex gap-2 mt-4 sticky bottom-0 z-10 -mx-5 -mb-5 px-5 pb-5 pt-3 border-t border-[rgba(101,179,174,0.1)] bg-[rgba(8,18,35,0.97)] rounded-b-xl">
          <button
            onClick={handleSave}
            className="flex-1 bg-[rgba(101,179,174,0.3)] text-[#7FD4D0] text-xs font-semibold py-2 rounded hover:bg-[rgba(101,179,174,0.4)] border border-[rgba(101,179,174,0.3)] transition"
          >
            Save
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] text-xs font-semibold py-2 rounded hover:bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.1)] transition"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mantle-frosted rounded-xl p-5 w-96 transition-all group hover:mantle-glow-pulse"
      style={{
        border: '1px solid rgba(101, 179, 174, 0.3)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(101, 179, 174, 0.2), inset 0 1px 1px rgba(101, 179, 174, 0.15)',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3 pb-3 border-b border-[rgba(101,179,174,0.1)]">
        <h3 className="font-bold text-sm text-white flex-1">{event.title}</h3>
        <button onClick={onClose} className="text-lg leading-none text-[#7FD4D0] hover:text-[#65B3AE] transition">×</button>
      </div>

      {/* Dates */}
      <div className="mb-2 text-xs space-y-1">
        <p className="text-[#7FD4D0]"><span className="font-semibold">Start:</span> {formatDate(event.startDate)}</p>
        {event.endDate && <p className="text-[#7FD4D0]"><span className="font-semibold">End:</span> {formatDate(event.endDate)}</p>}
      </div>

      {/* Description */}
      <p className="text-xs text-[rgba(255,255,255,0.7)] mb-2 line-clamp-2">{event.description}</p>

      {/* Requirements */}
      {event.requirements && (
        <div className="text-xs mb-2 text-[rgba(255,255,255,0.7)]">
          <span className="font-semibold text-[#7FD4D0]">Requirements:</span>
          <p className="ml-2">{event.requirements}</p>
        </div>
      )}

      {/* Resources */}
      {event.resources && (
        <div className="text-xs mb-2 text-[rgba(255,255,255,0.7)]">
          <span className="font-semibold text-[#7FD4D0]">Resources:</span>
          <p className="ml-2">{event.resources}</p>
        </div>
      )}

      {/* Rewards Summary */}
      {event.rewards && (
        <div
          className="rounded-lg p-3 mb-3 text-xs space-y-1 bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)]"
        >
          <p className="font-semibold text-[#7FD4D0] mb-2">
            💰 Rewards
          </p>
          <p className="text-[rgba(255,255,255,0.8)]">
            <span className="font-semibold text-[#7FD4D0]">Amount:</span> {event.rewards.amount} {event.rewards.currency}
          </p>
          <p className="text-[rgba(255,255,255,0.7)]">
            <span className="font-semibold text-[#7FD4D0]">Status:</span> <span className={
              event.rewards.status === 'delivered' ? 'text-[#65B3AE] font-semibold' :
              event.rewards.status === 'delayed' ? 'text-[#FF6B6B] font-semibold' :
              'text-[#FFB703] font-semibold'
            }>{event.rewards.status}</span>
          </p>
          <p className="text-[rgba(255,255,255,0.7)]">
            <span className="font-semibold text-[#7FD4D0]">Expected:</span> {formatDate(event.rewards.defaultDeliveryDate)}
          </p>
          {event.rewards.realizedDeliveryDate && (
            <p className="text-[rgba(255,255,255,0.7)]">
              <span className="font-semibold text-[#7FD4D0]">Delivered:</span> {formatDate(event.rewards.realizedDeliveryDate)}
            </p>
          )}
        </div>
      )}

      {/* Winner Criteria */}
      {event.winnerCriteria && (
        <div className="text-xs mb-2 text-[rgba(255,255,255,0.7)]">
          <span className="font-semibold text-[#7FD4D0]">Winner Criteria:</span>
          <p className="ml-2">{event.winnerCriteria}</p>
        </div>
      )}

      {/* Links Section */}
      {(event.applicationLink || event.xPostLink || event.notionLink) && (
        <div className="flex gap-3 mb-3 text-xs flex-wrap text-[#7FD4D0]">
          {event.applicationLink && (
            <a
              href={event.applicationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-semibold"
              title="How to Apply"
            >
              🔗 Apply
            </a>
          )}
          {event.xPostLink && (
            <a
              href={event.xPostLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-semibold"
              title="X Post"
            >
              𝕏 Post
            </a>
          )}
          {event.notionLink && (
            <a
              href={event.notionLink}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline font-semibold"
              title="Notion"
            >
              📄 Notion
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 flex-col pt-3 border-t border-[rgba(101,179,174,0.1)]">
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 bg-[rgba(101,179,174,0.2)] text-[#7FD4D0] text-xs font-semibold py-2 rounded hover:bg-[rgba(101,179,174,0.3)] border border-[rgba(101,179,174,0.3)] transition"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 bg-[rgba(255,107,107,0.2)] text-[#FF9999] text-xs font-semibold py-2 rounded hover:bg-[rgba(255,107,107,0.3)] border border-[rgba(255,107,107,0.3)] transition"
          >
            Delete
          </button>
        </div>
        {onAddCountdown && (
          <button
            onClick={onAddCountdown}
            className="w-full bg-[rgba(101,179,174,0.3)] text-[#7FD4D0] text-xs font-semibold py-2 rounded hover:bg-[rgba(101,179,174,0.4)] border border-[rgba(101,179,174,0.3)] transition mantle-glow-pulse"
          >
            ⏱️ Add Countdown
          </button>
        )}
      </div>
    </div>
  );
};

export default React.memo(EventCard);
