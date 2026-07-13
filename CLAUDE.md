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

## No Comment Policy

- Write self-documenting code (clear function/variable names)
- Only add comments for non-obvious logic or workarounds
- No comments explaining what the code does—the code itself should

---

**Status:** Phase 1 - Timeline UI scaffold  
**Last Updated:** 2026-07-04  
**Team:** Mantle Community Stewards
