# CLAUDE.md - Mantle Sync App

Instructions for Claude Code when working with this project.

## Project Overview

A browser-based **timeline dashboard** for Mantle Network community stewards to track campaigns, events, and rewards across 2026. The core UX is a **horizontal timeline** with **floating event cards**, **today indicator**, and an interactive **calendar widget** for reminders.

## Visual Design (Reference)

The UI follows this pattern:
- **Horizontal Timeline**: Smooth SVG line representing 2026 (Jan → Dec)
- **Event Nodes**: Colored dots on the timeline (positioned by date)
- **Floating Cards**: Event details appear above/around timeline when hovered/clicked
- **Today Marker**: Vertical gold line cutting through timeline at current date
- **Category Color Tags**: Each event tagged with color (MANTLE=green, BYREAL=purple, SOLANA=gold, etc.)
- **Status Badges**: FEATURED, NEWS, KEY, CAMPAIGN labels on cards
- **Calendar Widget**: Mini calendar (bottom-left) for filtering/reminders
- **Responsive**: Scrollable timeline, calendar adjusts on mobile

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS + custom SVG
- **Storage**: LocalStorage (JSON export/import)
- **Build Tool**: Vite (fast dev server)

## Component Architecture

```
src/
├── components/
│   ├── Timeline/
│   │   ├── Timeline.tsx          # Main horizontal timeline SVG
│   │   ├── EventNode.tsx         # Individual dot on timeline
│   │   ├── EventCard.tsx         # Floating card (hover/click)
│   │   └── TodayMarker.tsx       # Vertical line for today
│   ├── Calendar/
│   │   ├── CalendarWidget.tsx    # Mini calendar (bottom-left)
│   │   └── useReminders.ts       # Reminder state logic
│   ├── Header.tsx                # Title + filters
│   └── Layout.tsx                # Overall page layout
├── pages/
│   └── Dashboard.tsx             # Main page
├── hooks/
│   ├── useTimeline.ts            # Timeline data logic
│   ├── useLocalStorage.ts        # Persistence
│   └── useReminders.ts           # Reminders
├── types/
│   └── index.ts                  # TypeScript interfaces
├── utils/
│   ├── dateHelpers.ts            # Date calculations (month → pixels, etc.)
│   ├── colorHelpers.ts           # Category → color mapping
│   └── storageHelpers.ts         # LocalStorage wrappers
├── data/
│   └── sampleEvents.ts           # Sample event data for development
├── App.tsx
└── index.css                     # Global styles
```

## Data Model

```typescript
interface Event {
  id: string;
  title: string;
  category: "mantle" | "byreal" | "solana" | "meth" | "xeyit" | "other";
  date: Date;           // Event date on timeline
  type: "bounty" | "hackathon" | "news" | "campaign" | "featured";
  description: string;
  applicationLink?: string;
  xPostLink?: string;
  rewards?: {
    amount: string;
    currency: string;
    defaultDeliveryDate: Date;
    realizedDeliveryDate?: Date;
    status: "pending" | "delayed" | "delivered";
  };
  tags: string[];
  isFavorite: boolean;
}

interface Reminder {
  id: string;
  eventId: string;
  date: Date;
  title: string;
  completed: boolean;
}
```

## Color System

Map categories to colors (used for node + tag background):

```typescript
const colorMap = {
  mantle: "#00D9A3",    // Green
  byreal: "#9D4EDD",    // Purple
  solana: "#FFB703",    // Gold/Amber
  meth: "#00D4FF",      // Cyan
  xeyit: "#FF6B6B",     // Red
  other: "#888888",     // Gray
};
```

## UI Behavior

### Timeline Interaction
- **Hover Event Node**: Floating card appears above/beside
- **Click Event Node**: Card expands or opens detail view (modal)
- **Scroll Horizontal**: Pan through timeline
- **Today Marker**: Auto-centered on page load (or sticky)

### Calendar Widget
- Click date to filter/highlight that month on timeline
- Long-click (or modal) to create reminder
- Show reminder dots on calendar dates
- Highlight today with gold circle

### Event Cards
- Show: Title, category tag (colored), date, type badge
- Hover: Description preview + copy buttons for links
- Click: Open full event details (modal or side panel)
- Copy X/Application links with toast feedback

## Development Workflow

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run type-check   # Check TypeScript
```

## Key Features to Build (Prioritized)

### Phase 1 (MVP - Timeline UI)
- [ ] Horizontal timeline SVG with smooth line
- [ ] Event nodes positioned by date + colored by category
- [ ] Floating event cards (hover/click)
- [ ] Today marker (vertical line)
- [ ] Sample event data populated
- [ ] Basic hover/click interactions
- [ ] Responsive layout

### Phase 2 (Calendar + Reminders)
- [ ] Mini calendar widget
- [ ] Click date to highlight on timeline
- [ ] Reminder creation
- [ ] Reminder notifications

### Phase 3 (Data Management)
- [ ] Add/edit event forms
- [ ] Delete events
- [ ] Export/import JSON
- [ ] LocalStorage persistence

### Phase 4 (Polish)
- [ ] Dark mode
- [ ] Keyboard navigation
- [ ] Accessibility (ARIA labels)
- [ ] Mobile responsiveness
- [ ] Smooth animations

## Styling Guidelines

- **Layout**: CSS Grid for page, Flexbox for cards
- **Timeline**: SVG for line + nodes (clean, scalable)
- **Colors**: Use Tailwind utilities, define CSS variables for dynamic colors
- **Animations**: Smooth transitions (hover effects, card appears)
- **Dark Mode**: Support `prefers-color-scheme` + manual toggle
- **Responsive**: Stack vertically on mobile, horizontal scroll on desktop

## Implementation Tips

### Timeline Position Calculation
- Map date (Jan 1 → Dec 31) to horizontal pixel position
- Formula: `(dayOfYear / 365) * timelineWidth`
- Today marker: calculate current day number, position accordingly

### Event Card Positioning
- Alternate above/below timeline to avoid overlap
- Use CSS transforms for smooth animations
- Show on hover with opacity/scale transitions

### Calendar Widget
- Use `<input type="date">` or custom calendar UI
- Filter timeline events by selected date range
- Show reminder indicators as small dots

## No Comment Policy

- Write self-documenting code (clear function/variable names)
- Only add comments for non-obvious logic or workarounds
- No comments explaining what the code does—the code itself should

---

**Status:** Phase 1 - Timeline UI scaffold  
**Last Updated:** 2026-07-04  
**Team:** Mantle Community Stewards
