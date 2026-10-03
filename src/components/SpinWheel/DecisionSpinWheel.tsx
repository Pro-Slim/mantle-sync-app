/**
 * DecisionSpinWheel: a four-way decision spinner for community calls.
 *
 * Usage inside a MantleSynchApp screen (this is what SpinStage does, opened by
 * the ribbon under the Mantle mark):
 *
 *   import DecisionSpinWheel from './components/SpinWheel/DecisionSpinWheel';
 *
 *   <DecisionSpinWheel
 *     onResult={({ decision, result, spunAt }) =>
 *       addLog('spin_wheel', `${decision} → ${result} (${spunAt})`)
 *     }
 *   />
 *
 * `participants` defaults to SLIMONSHARK, LUISMA, HADUKEM and
 * "MINH - SPIN AGAIN"; each slice has exactly the same chance.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import styles from './DecisionSpinWheel.module.css';

export interface SpinResultPayload {
  decision: string;
  result: string;
  spunAt: string;
}

export interface DecisionSpinWheelProps {
  participants?: string[];
  onResult?: (payload: SpinResultPayload) => void;
}

type HistoryEntry = SpinResultPayload;

const DEFAULT_PARTICIPANTS = ['SLIMONSHARK', 'LUISMA', 'HADUKEM', 'MINH - SPIN AGAIN'];
const HISTORY_KEY = 'mantle-sync-spin-history';
const HISTORY_LIMIT = 5;

// Wheel geometry, in the SVG's own 400×400 units.
const SIZE = 400;
const C = SIZE / 2;
const SLICE_R = 180;
const RING_R = 190;
const HUB_R = 36;
const LABEL_INNER = HUB_R + 16;
const LABEL_OUTER = SLICE_R - 14;
const BULBS = 16;

const isSpinAgain = (label: string): boolean => /spin again/i.test(label);
// "MINH - SPIN AGAIN" lands as "SPIN AGAIN": the slice names who it is, the
// result says what to do.
const resultText = (label: string): string => (isSpinAgain(label) ? 'SPIN AGAIN' : label);

const mod = (n: number, m: number): number => ((n % m) + m) % m;

// Unbiased integer in [0, n): rejection sampling over crypto randomness, so
// every slice is exactly as likely as every other.
const randomIndex = (n: number): number => {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / n) * n;
  let x: number;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % n;
};

// Angles are degrees clockwise from 12 o'clock, the way the pointer reads them.
const point = (deg: number, r: number): [number, number] => {
  const rad = (deg * Math.PI) / 180;
  return [C + r * Math.sin(rad), C - r * Math.cos(rad)];
};

const slicePath = (from: number, to: number): string => {
  const [x0, y0] = point(from, SLICE_R);
  const [x1, y1] = point(to, SLICE_R);
  const large = to - from > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x0} ${y0} A ${SLICE_R} ${SLICE_R} 0 ${large} 1 ${x1} ${y1} Z`;
};

const readHistory = (): HistoryEntry[] => {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
};

const writeHistory = (entries: HistoryEntry[]): void => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  } catch {
    // History is a convenience; a blocked storage only costs the list.
  }
};

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const DecisionSpinWheel: React.FC<DecisionSpinWheelProps> = ({
  participants = DEFAULT_PARTICIPANTS,
  onResult,
}) => {
  const inputId = useId();
  const hintId = useId();
  const [decision, setDecision] = useState('');
  const [rotation, setRotation] = useState(0);
  const [spinMs, setSpinMs] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [lastDecision, setLastDecision] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(readHistory);
  const timer = useRef<number>();

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const n = participants.length;
  const sliceDeg = 360 / n;
  const hasDecision = decision.trim().length > 0;
  const winnerLabel = winner !== null ? participants[winner] : null;
  // A name on screen is a decision made; replacing it takes a second yes.
  const nameIsShowing = winnerLabel !== null && !isSpinAgain(winnerLabel);

  // One size for every label, set by the longest line so none overflows its
  // slice; "MINH - SPIN AGAIN" breaks at the dash onto two lines.
  const labels = useMemo(() => participants.map((p) => p.split(/\s+-\s+/)), [participants]);
  const fontSize = useMemo(() => {
    const longest = Math.max(...labels.flat().map((line) => line.length));
    return Math.max(11, Math.min(24, (LABEL_OUTER - LABEL_INNER) / (longest * 0.68)));
  }, [labels]);

  const spin = () => {
    const text = decision.trim();
    if (!text || spinning || n === 0) return;

    const win = randomIndex(n);
    // Land somewhere inside the slice, never on a separator line.
    const within = 0.15 + Math.random() * 0.7;
    const target = mod(360 - (win + within) * sliceDeg, 360);
    const delta = mod(target - mod(rotation, 360), 360);
    const turns = 5 + randomIndex(3);
    const duration = prefersReducedMotion() ? 1200 : 4000 + Math.random() * 2000;

    setConfirming(false);
    setWinner(null);
    setLastDecision(text);
    setSpinMs(duration);
    setSpinning(true);
    setRotation(rotation + turns * 360 + delta);

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const payload: SpinResultPayload = {
        decision: text,
        result: resultText(participants[win]),
        spunAt: new Date().toISOString(),
      };
      setSpinning(false);
      setWinner(win);
      setHistory((prev) => {
        const next = [payload, ...prev].slice(0, HISTORY_LIMIT);
        writeHistory(next);
        return next;
      });
      onResult?.(payload);
    }, duration + 60);
  };

  const requestSpin = () => {
    if (spinning || !hasDecision) return;
    if (nameIsShowing) {
      setConfirming(true);
      return;
    }
    spin();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      requestSpin();
    }
  };

  return (
    <div className={`${styles.stage} ${spinning ? styles.spinning : ''}`}>
      <div className={styles.appLabel}>MantleSynchApp</div>

      <div className={styles.card}>
        <label htmlFor={inputId} className={styles.cardTitle}>
          This spin decides
        </label>
        <textarea
          id={inputId}
          className={styles.decision}
          value={decision}
          onChange={(e) => setDecision(e.target.value)}
          onKeyDown={onKeyDown}
          readOnly={spinning}
          rows={2}
          maxLength={160}
          placeholder="e.g. Who hosts the next community call"
          aria-describedby={hasDecision ? undefined : hintId}
        />
        {!hasDecision && (
          <div id={hintId} className={styles.hint}>
            Add what this spin is for
          </div>
        )}
      </div>

      <div className={styles.wheel}>
        <div
          className={styles.rotor}
          style={{ '--rotation': `${rotation}deg`, '--spin-ms': `${spinMs}ms` } as React.CSSProperties}
        >
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="img"
            aria-label={`Wheel with ${n} equal slices: ${participants.join(', ')}`}
          >
            <defs>
              <radialGradient id="dsw-light" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#7fd8ff" />
                <stop offset="100%" stopColor="#2a9be6" />
              </radialGradient>
              <radialGradient id="dsw-deep" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2f6fd6" />
                <stop offset="100%" stopColor="#123c9c" />
              </radialGradient>
            </defs>

            {participants.map((p, i) => {
              const from = i * sliceDeg;
              const isWin = winner === i;
              const dim = winner !== null && !isWin;
              return (
                <path
                  key={`slice-${p}-${i}`}
                  data-slice={i}
                  d={slicePath(from, from + sliceDeg)}
                  fill={i % 2 === 0 ? 'url(#dsw-light)' : 'url(#dsw-deep)'}
                  className={`${styles.slice} ${isWin ? styles.sliceWin : ''} ${dim ? styles.sliceDim : ''}`}
                />
              );
            })}

            {participants.map((p, i) => {
              const [x, y] = point(i * sliceDeg, SLICE_R);
              return (
                <line
                  key={`sep-${p}-${i}`}
                  x1={C}
                  y1={C}
                  x2={x}
                  y2={y}
                  stroke="#fff"
                  strokeOpacity={0.35}
                  strokeWidth={1.5}
                />
              );
            })}

            {labels.map((lines, i) => {
              const mid = (i + 0.5) * sliceDeg;
              const rc = (LABEL_INNER + LABEL_OUTER) / 2;
              // Text runs along the radius. Whether it is turned over is decided
              // by where the label will be ON SCREEN when the wheel stops (its
              // angle plus the target rotation), so at rest nothing on the left
              // half reads upside down. The flip happens as a spin starts, when
              // the wheel is moving too fast for it to be seen.
              const onScreen = mod(mid + rotation, 360);
              const flip = onScreen > 180 && onScreen < 360;
              const transform = `rotate(${mid - 90} ${C} ${C})${flip ? ` rotate(180 ${C + rc} ${C})` : ''}`;
              const again = isSpinAgain(participants[i]);
              const dim = winner !== null && winner !== i;
              return (
                <text
                  key={`label-${i}`}
                  x={C + rc}
                  y={C}
                  transform={transform}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={fontSize}
                  className={`${styles.label} ${again ? styles.labelAgain : ''} ${dim ? styles.labelDim : ''}`}
                >
                  {lines.map((line, li) => (
                    <tspan
                      key={li}
                      x={C + rc}
                      dy={li === 0 ? `${-(lines.length - 1) * 0.58}em` : '1.16em'}
                    >
                      {line}
                    </tspan>
                  ))}
                </text>
              );
            })}

            <circle cx={C} cy={C} r={HUB_R + 4} fill="#0a2a78" />
          </svg>
        </div>

        {/* Fixed furniture: the ring, its bulbs, the hub's face and the
            pointer stay put while the slices turn beneath them. */}
        <div className={styles.fixed} aria-hidden="true">
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <defs>
              <filter id="dsw-bloom" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="dsw-hub" cx="38%" cy="34%" r="70%">
                <stop offset="0%" stopColor="#8fd0ff" />
                <stop offset="45%" stopColor="#2f78e0" />
                <stop offset="100%" stopColor="#123a99" />
              </radialGradient>
            </defs>

            <circle cx={C} cy={C} r={RING_R + 6} fill="none" stroke="#7fe8ff" strokeOpacity={0.25} strokeWidth={10} filter="url(#dsw-bloom)" />
            <circle cx={C} cy={C} r={RING_R} fill="none" stroke="#bff3ff" strokeWidth={3} filter="url(#dsw-bloom)" />
            <circle cx={C} cy={C} r={SLICE_R + 1} fill="none" stroke="#0a2a78" strokeWidth={3} />

            {Array.from({ length: BULBS }, (_, i) => {
              const [x, y] = point((i * 360) / BULBS, RING_R);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={4.6}
                  className={`${styles.bulb} ${i % 2 === 0 ? styles.bulbA : styles.bulbB}`}
                  filter="url(#dsw-bloom)"
                />
              );
            })}

            <circle cx={C} cy={C} r={HUB_R} fill="url(#dsw-hub)" stroke="#bff3ff" strokeOpacity={0.6} strokeWidth={2} />
            <ellipse cx={C - 9} cy={C - 12} rx={13} ry={8} fill="#fff" fillOpacity={0.28} />

            <polygon
              points={`${C - 15},${C - RING_R - 14} ${C + 15},${C - RING_R - 14} ${C},${C - SLICE_R + 22}`}
              fill="#fff"
              stroke="#0a2a78"
              strokeWidth={2}
              strokeLinejoin="round"
              filter="url(#dsw-bloom)"
            />
          </svg>
        </div>
      </div>

      <button
        type="button"
        className={styles.spinButton}
        onClick={requestSpin}
        disabled={!hasDecision || spinning}
        aria-busy={spinning}
      >
        {spinning ? 'SPINNING…' : 'SPIN'}
      </button>

      <div className={styles.result} aria-live="polite" aria-atomic="true">
        {winnerLabel !== null ? (
          <>
            <div className={styles.resultLine}>Result: {resultText(winnerLabel)}</div>
            <div className={styles.resultFor}>For: {lastDecision}</div>
          </>
        ) : spinning ? (
          <div className={styles.resultIdle}>Spinning for: {lastDecision}</div>
        ) : (
          <div className={styles.resultIdle}>Every slice has the same chance: 1 in {n}.</div>
        )}
      </div>

      {winnerLabel !== null && !spinning && !confirming && (
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={requestSpin} disabled={!hasDecision}>
            Spin again
          </button>
        </div>
      )}

      {confirming && (
        <div className={styles.confirm} role="alertdialog" aria-label="Confirm spinning again">
          <p>
            Spin again and replace <strong>{winnerLabel && resultText(winnerLabel)}</strong>? It stays in the
            history below.
          </p>
          <div className={styles.actions}>
            <button type="button" className={styles.secondary} onClick={spin}>
              Yes, spin again
            </button>
            <button type="button" className={`${styles.secondary} ${styles.quiet}`} onClick={() => setConfirming(false)}>
              Keep the result
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section className={styles.history} aria-label="Last spins">
          <h3 className={styles.historyTitle}>{history.length === 1 ? 'Last spin' : `Last ${history.length} spins`}</h3>
          <ul className={styles.historyList}>
            {history.map((h) => (
              <li key={h.spunAt} className={styles.historyItem}>
                <span className={styles.historyTime}>
                  {new Date(h.spunAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                </span>
                <span className={styles.historyDecision} title={h.decision}>
                  {h.decision}
                </span>
                <span className={styles.historyResult}>{h.result}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

export default DecisionSpinWheel;
