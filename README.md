# Mantle Sync App

A browser-based dashboard for Mantle Network community stewards to track, manage, and stay synchronized on campaigns, events, bounties, and reward distributions.

## Purpose

Enable 7 community stewards to have a single source of truth for:
- Campaign timelines (start/end dates)
- Reward information and delivery status
- Leaderboards and participant rankings
- Application links and entry points
- Official announcements (X posts)
- FAQ for community questions
- Action items and improvements

**User Goals:**
- Quickly answer community questions about active campaigns
- Track reward delivery status (pending, delivered, delayed)
- Ensure timely reminders for submission deadlines
- Monitor if bounties/hackathons are still accepting submissions
- Maintain sync across the steward team

## Core Features

### 1. Campaign/Event Management
- **Event Card** with:
  - Start date
  - End date
  - Status badge (Active, Upcoming, Closed, Rewards Pending)
  - Description/type (Bounty, Hackathon, Research Challenge, etc.)

### 2. Rewards Tracking
- **Default delivery date** (promised date)
- **Realized delivery date** (actual date)
- Status indicators (On Time, Delayed, Pending)
- Finance notes (if applicable)

### 3. Leaderboard
- Participant rankings
- Points/submissions count
- Quick filtering by event

### 4. Quick Links & Resources
- Application link (with status: Open/Closed)
- Official X post link
- FAQ section (searchable)

### 5. Alerts & Notes
- Points to improve (team notes)
- Overdue items highlighting
- Sync status indicator (so all stewards know they're on the same page)

## Data Model

```
Event {
  id: uuid
  name: string
  type: "bounty" | "hackathon" | "research_challenge" | "campaign"
  startDate: timestamp
  endDate: timestamp
  status: "upcoming" | "active" | "closed" | "rewards_pending"
  description: string
  applicationLink: string
  applicationStatus: "open" | "closed"
  xPostLink: string
  createdAt: timestamp
  updatedAt: timestamp
}

Reward {
  id: uuid
  eventId: uuid
  amount: string
  currency: string
  defaultDeliveryDate: timestamp
  realizedDeliveryDate: timestamp | null
  status: "pending" | "delayed" | "delivered"
  financeNotes: string
}

Leaderboard {
  id: uuid
  eventId: uuid
  participants: [
    { rank: number, name: string, points: number, submissions: number }
  ]
}

FAQ {
  id: uuid
  question: string
  answer: string
  category: string
  createdAt: timestamp
}

Note {
  id: uuid
  eventId: uuid
  title: string
  content: string
  priority: "low" | "medium" | "high"
  createdAt: timestamp
}
```

## Technology Stack (Recommended)

- **Frontend Framework**: React + TypeScript
- **Storage**: Local browser storage (localStorage/IndexedDB) for offline-first
- **Styling**: Tailwind CSS (clean, minimal UI)
- **Data Format**: JSON export/import for sharing between stewards
- **Optional Later**: Cloud sync (Firebase, Supabase) if stewards need real-time collaboration

## Getting Started

### 1. Set Up Project Structure
```
mantle-sync-app/
├── README.md (this file)
├── CLAUDE.md (Claude Code instructions)
├── package.json
├── public/
├── src/
│   ├── components/
│   │   ├── EventCard.tsx
│   │   ├── RewardTracker.tsx
│   │   ├── Leaderboard.tsx
│   │   ├── FAQSection.tsx
│   │   └── QuickLinks.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── EventDetail.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useLocalStorage.ts
│   │   └── useEvents.ts
│   ├── utils/
│   │   ├── dateHelpers.ts
│   │   └── statusHelpers.ts
│   ├── types/
│   │   └── index.ts (all TypeScript types)
│   ├── App.tsx
│   └── index.css
└── .gitignore
```

### 2. Initialize Project
```bash
npx create-react-app mantle-sync-app --template typescript
# or use Vite for faster dev:
npm create vite@latest mantle-sync-app -- --template react-ts
cd mantle-sync-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 3. Key Features to Build (Phase 1)
- [ ] Display list of active campaigns
- [ ] Show event details (dates, status, links)
- [ ] Display reward status with color coding
- [ ] Add new event form
- [ ] Search/filter events
- [ ] FAQ section
- [ ] Export data as JSON

### 4. Nice-to-Have (Phase 2)
- [ ] Leaderboard display
- [ ] Dark mode
- [ ] Notes/improvements tracker
- [ ] Sync indicator (show when data was last updated)
- [ ] Mobile-friendly responsive design

## Development Workflow

```bash
npm run dev        # Start dev server (typically http://localhost:5173)
npm run build      # Build for production
npm run preview    # Preview production build locally
npm run lint       # Lint code (if using ESLint)
```

## Data Persistence

### Local Storage (Phase 1)
- Store events, rewards, FAQ in `localStorage`
- Auto-save on any change
- Provide export button (JSON file download)
- Provide import button (load JSON file)

### Cloud Sync (Phase 2 - Optional)
- Only when stewards need real-time collaboration
- Keep it optional; app works fully offline first

## Important Notes

### For Community Stewards
- Bookmark this app for quick access
- Keep FAQ updated with common questions
- Regularly update reward delivery dates
- Use "Notes" section to flag items needing attention
- Coordinate with team before major edits (or implement user sync later)

### Accessibility & UX
- Use clear date formatting (e.g., "July 15, 2026")
- Status badges should use color + text (not color-only)
- All links should open in new tabs
- Copy-to-clipboard for links (optional but nice)
- Mobile-responsive design so stewards can check on phones

### Performance
- For large leaderboards, consider pagination
- Search/filter is client-side for instant feedback
- Local storage handles 5-10MB easily; more than that, consider cloud

## Security Considerations

- **No authentication required initially** (local browser storage)
- Stewards manage access via shared device or shared link
- No sensitive financial data stored (just delivery date status)
- If adding cloud sync later, implement proper auth and encryption

## Common Questions (Internal Notes)

- Q: Can we share this app across the team?  
  A: Yes—export as JSON, share via email/Discord, or deploy to a public URL
  
- Q: What if rewards are delayed?  
  A: Mark status as "delayed", update realized delivery date, note in finance notes

- Q: How do we handle new events mid-campaign?  
  A: Add new event card anytime; export/import to keep all stewards in sync

## Files to Create Next

1. **CLAUDE.md** — Instructions for Claude Code (use CLAUDE.md format from this repo)
2. **src/types/index.ts** — TypeScript type definitions
3. **src/components/** — React components for each feature
4. **.env.example** — Environment variables template (if needed later)

## Deployment Options

- **GitHub Pages** (free, static)
- **Vercel** (free, optimized for React)
- **Netlify** (free, great UX)
- **Self-hosted** (if Mantle has infra)

---

**Status:** Project initialized  
**Last Updated:** 2026-07-04  
**Team:** Mantle Community Stewards
