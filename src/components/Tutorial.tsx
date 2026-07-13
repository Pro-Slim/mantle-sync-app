import React, { useEffect, useState } from 'react';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  requiresSettingsOpen?: boolean; // opens the Settings dropdown while this step is active
  requiresSidebarOpen?: boolean; // opens the sidebar (calendar / To Improve) while this step is active
  requiresTableView?: boolean; // switches to table view with an event selected while this step is active
  adminOnly?: boolean; // only shown to admin users
}

// Every step that lives inside the open Settings dropdown shares the same
// position/requiresSettingsOpen — factored out so adding a new one can't
// forget to set requiresSettingsOpen and silently break its highlight.
interface SettingsStepDef {
  id: string;
  title: string;
  description: string;
  target: string;
  adminOnly?: boolean;
}

const settingsStep = (def: SettingsStepDef): TutorialStep => ({
  ...def,
  position: 'left',
  requiresSettingsOpen: true,
});

const SETTINGS_STEP_DEFS: SettingsStepDef[] = [
  {
    id: 'settings-add-event',
    title: '➕ Add Event',
    description: 'Opens a form to create a new event on the timeline.',
    target: '[data-tutorial="add-event"]',
  },
  {
    id: 'settings-switch-user',
    title: '👤 Switch User',
    description: 'Sign out or switch to a different account.',
    target: '[data-tutorial="switch-user"]',
  },
  {
    id: 'settings-hover-toggle',
    title: '👁️ Hover Toggle',
    description: 'Turns hover-to-preview event cards on the timeline on or off.',
    target: '[data-tutorial="hover-toggle"]',
  },
  {
    id: 'settings-view-mode',
    title: '📊 View Mode',
    description: 'Switches the bottom details panel between live Countdown clocks and a detailed Table view.',
    target: '[data-tutorial="view-mode-toggle"]',
  },
  {
    id: 'settings-import',
    title: '📥 Import Events',
    description: 'Bulk-import events from a CSV or Excel file.',
    target: '[data-tutorial="import-events"]',
  },
  {
    id: 'settings-template',
    title: '📄 Download Template',
    description: 'Downloads a blank Excel template so your import file has the right columns.',
    target: '[data-tutorial="download-template"]',
  },
  {
    id: 'settings-export',
    title: '📤 Export Events',
    description: 'Exports all current events to a CSV file.',
    target: '[data-tutorial="export-events"]',
  },
  {
    id: 'settings-view-logs',
    title: '🧾 View Logs',
    description: 'Opens the Activity Logs — a history of every change made in the app.',
    target: '[data-tutorial="view-logs"]',
  },
  {
    id: 'settings-clear-logs',
    title: '🗑️ Clear Logs',
    description: 'Permanently clears the activity log history. This can\'t be undone.',
    target: '[data-tutorial="clear-logs"]',
  },
  {
    id: 'settings-mute',
    title: '🔊 Mute Sounds',
    description: 'Toggles all UI sound effects — button hovers, event hovers, and the timeline whoosh.',
    target: '[data-tutorial="mute-toggle"]',
  },
  {
    id: 'settings-tutorial-toggle',
    title: '🎓 Tutorial',
    description: 'That\'s this guide! Come back here anytime to replay it.',
    target: '[data-tutorial="tutorial-toggle"]',
  },
  {
    id: 'settings-admin-panel',
    title: '🛡️ Admin Panel',
    description: 'Admin-only: manage which users are approved to access the app.',
    target: '[data-tutorial="admin-panel"]',
    adminOnly: true,
  },
];

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '👋 Welcome to MantleSynchApp',
    description: 'Your event management timeline. Let\'s explore the key features!',
    position: 'center',
  },
  {
    id: 'timeline',
    title: '📅 Timeline View',
    description: 'Visualize all your events on an interactive timeline. Hover over events to see details, click to edit.',
    target: '[style*="overflow: hidden"]',
    position: 'bottom',
  },
  {
    id: 'sidebar',
    title: '📋 Sidebar Calendar',
    description: 'View your events by month. Click a date to jump the timeline there, or double-click to add a reminder.',
    target: 'aside',
    position: 'right',
    requiresSidebarOpen: true,
  },
  {
    id: 'settings',
    title: '⚙️ Settings Menu',
    description: 'This is the Settings menu. Let\'s go through what every button in here does.',
    target: '[data-tutorial="settings-button"]',
    position: 'left',
  },
  ...SETTINGS_STEP_DEFS.map(settingsStep),
  {
    id: 'event-details',
    title: '🔍 Event Details Panel',
    description: 'Click any event to see its full details here, including rewards, winner criteria, and remarks.',
    target: '[data-event-details-panel]',
    position: 'top',
    requiresTableView: true,
  },
  {
    id: 'countdown',
    title: '⏱️ Countdown Clocks',
    description: 'Click an event and choose "Add Countdown" to track its end date or reward delivery date live, right here at the bottom of the screen.',
    target: '[data-countdown-section]',
    position: 'top',
  },
  {
    id: 'improve',
    title: '💡 To Improve',
    description: 'Share feedback and suggestions to help us improve the app. Your ideas matter!',
    target: '[data-to-improve-section]',
    position: 'top',
    requiresSidebarOpen: true,
  },
  {
    id: 'done',
    title: '✅ All Set!',
    description: 'You\'re ready to explore! Turn off this tutorial anytime from settings. Happy event tracking!',
    position: 'center',
  },
];

interface TutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onRequireSettingsOpen?: (open: boolean) => void;
  onRequireSidebarOpen?: (open: boolean) => void;
  onRequireTableView?: (open: boolean) => void;
  isAdmin?: boolean;
}

const Tutorial: React.FC<TutorialProps> = ({
  isOpen,
  onClose,
  onRequireSettingsOpen,
  onRequireSidebarOpen,
  onRequireTableView,
  isAdmin = false,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const steps = TUTORIAL_STEPS.filter((s) => !s.adminOnly || isAdmin);
  const step = steps[Math.min(currentStep, steps.length - 1)];

  // Tell the parent to open/close whatever UI each step needs visible
  // (Settings dropdown, sidebar, table view) so the highlighted target
  // actually exists instead of silently falling back to no highlight.
  useEffect(() => {
    if (!isOpen) return;
    onRequireSettingsOpen?.(!!step?.requiresSettingsOpen);
    onRequireSidebarOpen?.(!!step?.requiresSidebarOpen);
    onRequireTableView?.(!!step?.requiresTableView);
  }, [isOpen, step?.id, onRequireSettingsOpen, onRequireSidebarOpen, onRequireTableView]);

  // Measure the target after the DOM has actually updated (e.g. once the
  // Settings dropdown has opened) instead of on the same tick it's requested,
  // which is what made highlights land on the wrong/empty spot before.
  useEffect(() => {
    if (!isOpen || !step?.target) {
      setRect(null);
      return;
    }
    let raf1 = 0;
    let raf2 = 0;
    const measure = () => {
      const el = document.querySelector(step.target as string);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, step?.id, step?.target, step?.requiresSettingsOpen, step?.requiresSidebarOpen, step?.requiresTableView]);

  if (!isOpen) return null;

  const closeAllRequiredUi = () => {
    onRequireSettingsOpen?.(false);
    onRequireSidebarOpen?.(false);
    onRequireTableView?.(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      closeAllRequiredUi();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    closeAllRequiredUi();
    onClose();
  };

  const VIEWPORT_MARGIN = 12;
  const TOOLTIP_WIDTH = 320;

  // Calculate tooltip position, clamped to stay within the viewport so it
  // never gets cut off (a common cause of steps feeling "not relevant").
  let tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 10001,
    backgroundColor: 'rgba(10, 22, 40, 0.95)',
    border: '2px solid #65B3AE',
    borderRadius: '12px',
    padding: '20px',
    maxWidth: `${TOOLTIP_WIDTH}px`,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 8px 32px rgba(101, 179, 174, 0.3)',
  };

  if (step.position === 'center' || !rect) {
    tooltipStyle = {
      ...tooltipStyle,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  } else if (step.position === 'bottom') {
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, VIEWPORT_MARGIN + TOOLTIP_WIDTH / 2),
      window.innerWidth - VIEWPORT_MARGIN - TOOLTIP_WIDTH / 2
    );
    tooltipStyle = {
      ...tooltipStyle,
      top: `${Math.min(rect.bottom + 20, window.innerHeight - 200)}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
    };
  } else if (step.position === 'top') {
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, VIEWPORT_MARGIN + TOOLTIP_WIDTH / 2),
      window.innerWidth - VIEWPORT_MARGIN - TOOLTIP_WIDTH / 2
    );
    tooltipStyle = {
      ...tooltipStyle,
      bottom: `${Math.max(window.innerHeight - rect.top + 20, 20)}px`,
      left: `${left}px`,
      transform: 'translateX(-50%)',
    };
  } else if (step.position === 'left') {
    const top = Math.min(
      Math.max(rect.top + rect.height / 2, VIEWPORT_MARGIN + 80),
      window.innerHeight - VIEWPORT_MARGIN - 80
    );
    tooltipStyle = {
      ...tooltipStyle,
      top: `${top}px`,
      right: `${Math.max(window.innerWidth - rect.left + 20, VIEWPORT_MARGIN)}px`,
      transform: 'translateY(-50%)',
    };
  } else if (step.position === 'right') {
    const top = Math.min(
      Math.max(rect.top + rect.height / 2, VIEWPORT_MARGIN + 80),
      window.innerHeight - VIEWPORT_MARGIN - 80
    );
    tooltipStyle = {
      ...tooltipStyle,
      top: `${top}px`,
      left: `${Math.min(rect.right + 20, window.innerWidth - VIEWPORT_MARGIN - TOOLTIP_WIDTH)}px`,
      transform: 'translateY(-50%)',
    };
  }

  return (
    <>
      {/* Click-outside catcher: invisible, just closes the tutorial. The actual
          dimming is done by the spotlight below (or the plain overlay for
          center-positioned steps with no target to highlight). */}
      <div
        className="fixed inset-0"
        onClick={handleClose}
        style={{ zIndex: 10000 }}
      />

      {rect && step.position !== 'center' ? (
        /* Spotlight: a huge outer box-shadow dims everything EXCEPT the cutout
           rect, so the target stays crisp/unblurred instead of being covered
           by a separate blurred overlay. */
        <div
          className="fixed pointer-events-none border-2 border-[#7FD4D0] rounded-lg"
          style={{
            top: `${rect.top - 8}px`,
            left: `${rect.left - 8}px`,
            width: `${rect.width + 16}px`,
            height: `${rect.height + 16}px`,
            boxShadow: '0 0 0 9999px rgba(5, 13, 32, 0.8), 0 0 20px rgba(127, 212, 208, 0.7)',
            zIndex: 10001,
            transition: 'top 0.15s ease, left 0.15s ease, width 0.15s ease, height 0.15s ease',
          }}
        />
      ) : (
        <div
          className="fixed inset-0 bg-black/70 pointer-events-none"
          style={{ zIndex: 10000 }}
        />
      )}

      {/* Tooltip */}
      <div style={tooltipStyle}>
        <h3 className="text-lg font-bold text-[#7FD4D0] mb-2">{step.title}</h3>
        <p className="text-sm text-gray-300 mb-4">{step.description}</p>

        {/* Progress */}
        <div className="mb-4 flex gap-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition ${
                i === currentStep ? 'bg-[#7FD4D0]' : i < currentStep ? 'bg-[#65B3AE]' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300 transition"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400 flex items-center">
            {currentStep + 1} / {steps.length}
          </span>
          <button
            onClick={currentStep === steps.length - 1 ? handleClose : handleNext}
            className="px-3 py-1 text-sm rounded bg-[#65B3AE] hover:bg-[#7FD4D0] text-[#050D20] font-semibold transition"
          >
            {currentStep === steps.length - 1 ? 'Done' : 'Next →'}
          </button>
        </div>
      </div>
    </>
  );
};

export default Tutorial;
