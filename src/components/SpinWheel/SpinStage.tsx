import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import LoginAnimation from '../LoginAnimation';
import DecisionSpinWheel, { SpinResultPayload } from './DecisionSpinWheel';
import styles from './SpinStage.module.css';

export type SpinStageMode = 'stage' | 'page';

interface SpinStageProps {
  // 'stage': the full-screen show (the light show, then the wheel rises).
  // 'page': the wheel swings out of the ribbon into the middle of the app,
  // over the page blurred behind it.
  mode?: SpinStageMode;
  onClose: () => void;
  onResult?: (payload: SpinResultPayload) => void;
}

const LEAVE_MS = 320;

const prefersReducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const FullStage: React.FC<Omit<SpinStageProps, 'mode'>> = ({ onClose, onResult }) => {
  const [showing, setShowing] = useState(true);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Decision spin wheel">
      <div className={styles.enter}>
        <DecisionSpinWheel onResult={onResult} />
      </div>

      <div className={styles.beams} aria-hidden="true">
        <div className={`${styles.beam} ${styles.left}`} />
        <div className={`${styles.beam} ${styles.right}`} />
      </div>

      <button type="button" className={styles.close} onClick={onClose} aria-label="Close the spin wheel" title="Close (Esc)">
        ×
      </button>

      {showing && (
        <div className={styles.show}>
          <LoginAnimation reveal onComplete={() => setShowing(false)} />
        </div>
      )}
    </div>
  );
};

interface OnPageProps {
  onResult?: (payload: SpinResultPayload) => void;
  onLeave: () => void;
  leaving: boolean;
}

const OnPage: React.FC<OnPageProps> = ({
  onResult,
  onLeave,
  leaving,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const spinningRef = useRef(false);
  // Where the card swings from: the ribbon's middle, as an offset from the
  // card's own top centre, which is the point it hangs and swings from.
  const [from, setFrom] = useState<React.CSSProperties | null>(null);

  // Measured before the first paint, from layout values (offsetTop and
  // friends ignore transforms), so the card never flashes in the middle first.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const ribbon = document.querySelector('.ribbon-cta')?.getBoundingClientRect();
    const hangX = card.offsetLeft + card.offsetWidth / 2;
    const hangY = card.offsetTop;
    const fromX = ribbon ? ribbon.left + ribbon.width / 2 - hangX : -hangX;
    const fromY = ribbon ? ribbon.top + ribbon.height / 2 - hangY : -hangY;
    setFrom({ '--from-x': `${fromX}px`, '--from-y': `${fromY}px` } as React.CSSProperties);
  }, []);

  // Once it has settled, hand the keyboard to the decision field.
  useEffect(() => {
    const timer = window.setTimeout(
      () => cardRef.current?.querySelector('textarea')?.focus({ preventScroll: true }),
      prefersReducedMotion() ? 0 : 1100,
    );
    return () => window.clearTimeout(timer);
  }, []);

  const swingClass = !from ? styles.pending : leaving ? styles.swingOut : styles.swingIn;

  return (
    <div
      className={`${styles.pageOverlay} ${leaving ? styles.fadeOut : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Decision spin wheel"
      // A press on the blurred page closes it, the way the trays close, but
      // not mid-spin: an accidental click must not throw a spin away.
      onPointerDown={(e) => {
        if (e.target === e.currentTarget && !spinningRef.current) onLeave();
      }}
    >
      <div ref={cardRef} className={`${styles.hang} ${swingClass}`} style={from ?? undefined}>
        <DecisionSpinWheel
          variant="card"
          onResult={onResult}
          onSpinningChange={(spinning) => {
            spinningRef.current = spinning;
          }}
        />
        <button
          type="button"
          className={`${styles.close} ${styles.cardClose}`}
          onClick={onLeave}
          aria-label="Close the spin wheel"
          title="Close (Esc)"
        >
          ×
        </button>
      </div>

      <div className={`${styles.beams} ${styles.beamsOnPage}`} aria-hidden="true">
        <div className={`${styles.beam} ${styles.left}`} />
        <div className={`${styles.beam} ${styles.right}`} />
      </div>
    </div>
  );
};

// Opened from the ribbon, in whichever of the two modes the settings switch
// picked. The full stage is the original and the default.
const SpinStage: React.FC<SpinStageProps> = ({ mode = 'stage', onClose, onResult }) => {
  const [leaving, setLeaving] = useState(false);
  const leaveTimer = useRef<number>();

  // On the page it swings back up into the ribbon before it goes; the full
  // stage simply closes, as it always has.
  const leave = useCallback(() => {
    if (mode !== 'page') {
      onClose();
      return;
    }
    if (leaveTimer.current) return;
    setLeaving(true);
    leaveTimer.current = window.setTimeout(onClose, prefersReducedMotion() ? 0 : LEAVE_MS);
  }, [mode, onClose]);

  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') leave();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leave]);

  return mode === 'page' ? (
    <OnPage onResult={onResult} onLeave={leave} leaving={leaving} />
  ) : (
    <FullStage onClose={leave} onResult={onResult} />
  );
};

export default SpinStage;
