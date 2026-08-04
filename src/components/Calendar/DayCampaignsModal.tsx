import React from 'react';
import { Event } from '../../types';
import { getCategoryColor, getCategoryLabel } from '../../utils/colorHelpers';
import { formatDate, inclusiveDayCount } from '../../utils/dateHelpers';

interface DayCampaignsModalProps {
  date: Date;
  campaigns: Event[];
  onClose: () => void;
  onGoToTimeline: (date: Date) => void;
  onViewDetails: (campaign: Event) => void;
}

const DayCampaignsModal: React.FC<DayCampaignsModalProps> = ({
  date,
  campaigns,
  onClose,
  onGoToTimeline,
  onViewDetails,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="mantle-frosted rounded-xl w-full max-w-lg flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-6 border-b border-[rgba(101,179,174,0.2)]">
          <div>
            <h2 className="text-xl font-bold text-white">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h2>
            <p className="text-xs text-[#65B3AE] mt-1">
              {campaigns.length} active campaign{campaigns.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl font-bold text-[#7FD4D0] hover:text-[#65B3AE] transition"
            title="Close"
          >
            ×
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {campaigns.length === 0 ? (
            <p className="text-sm text-[rgba(101,179,174,0.6)] text-center py-8">
              No campaigns are active on this day.
            </p>
          ) : (
            campaigns.map((campaign) => {
              const categoryColor = getCategoryColor(campaign.category);
              const totalDays = campaign.endDate ? inclusiveDayCount(campaign.startDate, campaign.endDate) : 1;
              const dayNumber = inclusiveDayCount(campaign.startDate, date);

              return (
                <div
                  key={campaign.id}
                  className="p-3 rounded-lg bg-[rgba(101,179,174,0.05)] border border-[rgba(101,179,174,0.15)] hover:border-[rgba(101,179,174,0.4)] transition"
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: categoryColor }} />
                    <span className="text-[10px] font-bold tracking-wide" style={{ color: categoryColor }}>
                      {getCategoryLabel(campaign.category)}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[rgba(101,179,174,0.15)] text-[#7FD4D0]">
                      {campaign.type}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">{campaign.title}</h3>

                  <p className="text-xs text-[#65B3AE] mt-1">
                    {formatDate(campaign.startDate)}
                    {campaign.endDate ? ` → ${formatDate(campaign.endDate)}` : ''}
                    {totalDays > 1 && (
                      <span className="text-[rgba(127,212,208,0.7)]"> · Day {dayNumber} of {totalDays}</span>
                    )}
                  </p>

                  {campaign.description && (
                    <p className="text-xs text-[rgba(255,255,255,0.7)] mt-2">{campaign.description}</p>
                  )}

                  {campaign.rewards && (
                    <p className="text-xs text-[rgba(255,255,255,0.8)] mt-2">
                      💰 {campaign.rewards.amount} {campaign.rewards.currency}
                      <span className={
                        campaign.rewards.status === 'delivered' ? 'text-[#65B3AE] font-semibold' :
                        campaign.rewards.status === 'delayed' ? 'text-[#FF6B6B] font-semibold' :
                        'text-[#FFB703] font-semibold'
                      }> · {campaign.rewards.status}</span>
                    </p>
                  )}

                  <div className="flex gap-2 mt-3 flex-wrap">
                    <button
                      onClick={() => onGoToTimeline(date)}
                      className="px-3 py-1.5 rounded bg-[rgba(101,179,174,0.2)] text-[#7FD4D0] text-xs font-semibold hover:bg-[rgba(101,179,174,0.3)] border border-[rgba(101,179,174,0.3)] transition"
                    >
                      Go to Timeline
                    </button>
                    <button
                      onClick={() => onViewDetails(campaign)}
                      className="px-3 py-1.5 rounded bg-[rgba(101,179,174,0.1)] text-[#7FD4D0] text-xs font-semibold hover:bg-[rgba(101,179,174,0.2)] border border-[rgba(101,179,174,0.2)] transition"
                    >
                      View Details
                    </button>
                    {campaign.applicationLink && (
                      <a
                        href={campaign.applicationLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded text-[#65B3AE] text-xs font-semibold hover:bg-[rgba(101,179,174,0.15)] border border-[rgba(101,179,174,0.2)] transition"
                      >
                        🔗 Apply
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default DayCampaignsModal;
