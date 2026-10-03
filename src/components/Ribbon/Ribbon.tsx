import React, { useRef } from 'react';

interface RibbonProps {
  label: string;
  onClick: () => void;
}

// ProPrice's feedback ribbon, markup for markup (its index.html), styled by the
// verbatim copy of its ribbons.css. Only what it opens differs.
const SPARKS: [number, number, number][] = [
  [22, 26, 0], [64, 38, 1.6], [34, 55, 3.1], [70, 68, 2.2], [46, 80, 4.4], [56, 14, 5.3],
];

const Ribbon: React.FC<RibbonProps> = ({ label, onClick }) => {
  const ref = useRef<HTMLButtonElement>(null);

  // The tug. A one-shot animation only replays if its class comes off and back
  // on with a style flush between; reading offsetWidth is that flush.
  const tug = () => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('swinging');
    void el.offsetWidth;
    el.classList.add('swinging');
  };

  return (
    <button
      ref={ref}
      type="button"
      className="ribbon-cta"
      title={label}
      onClick={() => {
        tug();
        onClick();
      }}
      onAnimationEnd={(e) => {
        if (e.animationName === 'ribbon-swing') ref.current?.classList.remove('swinging');
      }}
    >
      <span className="ribbon-cord" aria-hidden="true" />
      <span className="ribbon-band">
        <span className="ribbon-sheen" aria-hidden="true" />
        <svg viewBox="0 0 24 24" className="ribbon-bolt" aria-hidden="true" fill="currentColor">
          <path d="M13.5 2 4 13.2h6.1L9.4 22 20 10.6h-6.4z" />
        </svg>
        {SPARKS.map(([x, y, d]) => (
          <i
            key={`${x}-${y}`}
            className="ribbon-spark"
            style={{ '--x': `${x}%`, '--y': `${y}%`, '--d': `${d}s` } as React.CSSProperties}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">{label}</span>
      </span>
    </button>
  );
};

export default Ribbon;
