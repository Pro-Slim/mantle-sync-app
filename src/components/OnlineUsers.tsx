import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { OnlineUser } from '../hooks/usePresence';

interface OnlineUsersProps {
  onlineUsers: OnlineUser[];
  loading: boolean;
}

const EDGE = 8;

// The list used to open upwards from the header, i.e. off the top of the
// screen, so only the last name or two were ever visible. It now drops down
// below the pill. It is portalled to <body> because the header's backdrop blur
// re-anchors fixed children and the mobile control row clips overflow; at body
// level neither applies. Hover opens it for a mouse, a tap toggles it on touch.
const OnlineUsers: React.FC<OnlineUsersProps> = ({ onlineUsers, loading }) => {
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();

  // Leaving is deferred a beat so the pointer can cross the gap between the
  // pill and the list without the list vanishing under it.
  const hoverIn = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(closeTimer.current);
    setHovered(true);
  };
  const hoverOut = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setHovered(false), 180);
  };
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const userCount = onlineUsers.length;
  const open = (hovered || pinned) && userCount > 0;

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPosition({
        top: rect.bottom + EDGE,
        right: Math.max(EDGE, window.innerWidth - rect.right),
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!pinned) return;
    const closeOnOutside = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setPinned(false);
    };
    document.addEventListener('pointerdown', closeOnOutside);
    return () => document.removeEventListener('pointerdown', closeOnOutside);
  }, [pinned]);

  if (loading) {
    return (
      <div className="text-[#7FD4D0] text-xs opacity-60">
        Loading...
      </div>
    );
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onPointerEnter={hoverIn}
        onPointerLeave={hoverOut}
        onClick={() => setPinned((p) => !p)}
        aria-expanded={open}
        aria-haspopup="true"
        title={userCount > 0 ? 'Who is online' : undefined}
        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[rgba(101,179,174,0.1)] border border-[rgba(101,179,174,0.2)] flex-shrink-0 whitespace-nowrap"
      >
        <div className="w-2 h-2 rounded-full bg-[#65B3AE] animate-pulse" />
        <span className="text-[#7FD4D0] text-xs font-semibold">
          {userCount} online
        </span>
      </button>

      {open && position &&
        createPortal(
          <div
            ref={listRef}
            role="dialog"
            aria-label="Online users"
            onPointerEnter={hoverIn}
            onPointerLeave={hoverOut}
            className="fixed z-[60] bg-[#050D20] border border-[#65B3AE] rounded-lg p-2 text-xs text-[#7FD4D0] shadow-lg overflow-y-auto"
            style={{
              top: position.top,
              right: position.right,
              maxWidth: `calc(100vw - ${EDGE * 2}px)`,
              maxHeight: `calc(100dvh - ${position.top + EDGE}px)`,
            }}
          >
            <div className="font-semibold mb-1 text-[#65B3AE]">Online Users ({userCount}):</div>
            {onlineUsers.map((user, idx) => (
              <div key={user.user_id} className="flex items-center gap-2 py-0.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-[#65B3AE] flex-shrink-0" />
                <span className="text-[#7FD4D0] truncate">
                  {idx + 1}. {user.email || user.user_id.slice(0, 8)}
                </span>
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};

export default OnlineUsers;
