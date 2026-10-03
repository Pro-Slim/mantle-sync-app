import React, { useEffect, useState } from 'react';
import LoginAnimation from '../LoginAnimation';
import DecisionSpinWheel, { SpinResultPayload } from './DecisionSpinWheel';
import styles from './SpinStage.module.css';

interface SpinStageProps {
  onClose: () => void;
  onResult?: (payload: SpinResultPayload) => void;
}

// Opened from the ribbon. The login light show plays again over the stage and
// fades off it while the wheel rises and the spotlights swing in.
const SpinStage: React.FC<SpinStageProps> = ({ onClose, onResult }) => {
  const [showing, setShowing] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

export default SpinStage;
