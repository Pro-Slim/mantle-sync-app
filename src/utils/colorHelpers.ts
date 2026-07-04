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
