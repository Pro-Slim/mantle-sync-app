export interface Event {
  id: string;
  title: string;
  category: 'mantle' | 'byreal' | 'solana' | 'meth' | 'xeyit' | 'other';
  startDate: Date;
  endDate?: Date;
  type: 'bounty' | 'hackathon' | 'news' | 'campaign' | 'featured';
  description: string;
  requirements?: string;
  resources?: string;
  applicationLink?: string;
  xPostLink?: string;
  winnerCriteria?: string;
  winnerAnnouncementDate?: Date;
  notionLink?: string;
  rewards?: {
    amount: string;
    currency: string;
    defaultDeliveryDate: Date;
    realizedDeliveryDate?: Date;
    status: 'pending' | 'delayed' | 'delivered';
  };
  tags: string[];
  isFavorite: boolean;
  requirementsDetails?: string;
  winnerCriteriaDetails?: string;
  winnersPine?: string;
  remarks?: string;
}

export interface CalendarReminder {
  id: string;
  date: Date;
  title: string;
}

export interface Reminder {
  id: string;
  eventId: string;
  date: Date;
  title: string;
  completed: boolean;
}

export type DatePosition = {
  date: Date;
  x: number;
};
