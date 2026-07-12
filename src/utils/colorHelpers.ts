import { Event } from '../types';

export const colorMap: Record<Event['category'], string> = {
  mantle: '#00D9A3',  // Green
  byreal: '#9D4EDD',  // Purple
  solana: '#FFB703',  // Gold/Amber
  meth: '#00D4FF',    // Cyan
  xeyit: '#FF6B6B',   // Red
  other: '#888888',   // Gray
};

export const getCategoryColor = (category: Event['category']): string => {
  return colorMap[category] || colorMap.other;
};

export interface NodeColorState {
  color: string;
  hasRedRing: boolean;
  isPulsing: boolean;
  pulseColor: 'yellow' | 'red' | null;
}

export const getNodeColorByRewardStatus = (event: Event): NodeColorState => {
  const now = new Date();
  const endDatePassed = event.endDate && event.endDate < now;
  const startDatePassed = event.startDate < now;
  const eventInProgress = startDatePassed && event.endDate && event.endDate > now;

  // No rewards info - use category color
  if (!event.rewards) {
    if (eventInProgress) {
      return { color: '#FBBF24', hasRedRing: false, isPulsing: true, pulseColor: 'yellow' };
    }
    return { color: getCategoryColor(event.category), hasRedRing: false, isPulsing: false, pulseColor: null };
  }

  const status = event.rewards.status;
  const defaultDeliveryDatePassed = event.rewards.defaultDeliveryDate < now;
  const realizedDeliveryDatePassed = event.rewards.realizedDeliveryDate && event.rewards.realizedDeliveryDate < now;
  const anyDeliveryDatePassed = defaultDeliveryDatePassed || realizedDeliveryDatePassed;

  // In progress event with rewards
  if (eventInProgress) {
    return { color: '#FBBF24', hasRedRing: false, isPulsing: true, pulseColor: 'yellow' };
  }

  // Event ended
  if (endDatePassed) {
    // Delivered - gray
    if (status === 'delivered') {
      return { color: '#9CA3AF', hasRedRing: false, isPulsing: false, pulseColor: null };
    }

    // Delayed (delivery date passed but not delivered) - green with pulsing red ring
    if (anyDeliveryDatePassed && status === 'delayed') {
      return { color: '#10B981', hasRedRing: true, isPulsing: true, pulseColor: 'red' };
    }

    // Pending (delivery date not reached yet) - green
    if (status === 'pending') {
      return { color: '#10B981', hasRedRing: false, isPulsing: false, pulseColor: null };
    }
  }

  // Default
  return { color: getCategoryColor(event.category), hasRedRing: false, isPulsing: false, pulseColor: null };
};

export const getCategoryLabel = (category: Event['category']): string => {
  const labels: Record<Event['category'], string> = {
    mantle: 'MANTLE',
    byreal: 'BYREAL',
    solana: 'SOLANA',
    meth: 'mETH',
    xeyit: 'XEYIT',
    other: 'OTHER',
  };
  return labels[category];
};

export const getBgColorClass = (category: Event['category']): string => {
  const tailwindMap: Record<Event['category'], string> = {
    mantle: 'bg-emerald-500',
    byreal: 'bg-purple-500',
    solana: 'bg-amber-400',
    meth: 'bg-cyan-500',
    xeyit: 'bg-red-500',
    other: 'bg-gray-500',
  };
  return tailwindMap[category];
};

export const getTextColorClass = (category: Event['category']): string => {
  const tailwindMap: Record<Event['category'], string> = {
    mantle: 'text-emerald-600',
    byreal: 'text-purple-600',
    solana: 'text-amber-600',
    meth: 'text-cyan-600',
    xeyit: 'text-red-600',
    other: 'text-gray-600',
  };
  return tailwindMap[category];
};
