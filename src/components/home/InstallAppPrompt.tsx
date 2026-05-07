'use client';

import { useEffect, useState } from 'react';

// iOS detection: user agent match + standalone API presence
const isIOSSafari = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOSDevice = /iPad|iPhone|iPod/.test(ua);
  const isStandalone = 'standalone' in window.navigator;
  return isIOSDevice && isStandalone;
};

const isAlreadyInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  // iOS: navigator.standalone === true means running as installed PWA
  return (window.navigator as { standalone?: boolean }).standalone === true;
};

// beforeinstallprompt event isn't in default TS types
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'aad-install-dismissed-at';
const DISMISS_DAYS = 7;

/**
 * Floating "Install app" button shown bottom-left when the browser
 * fires beforeinstallprompt. Mirrors StickyBookCta visual pattern.
 *
 * Hidden on:
 * - iOS Safari (event never fires; Phase C handles iOS separately)
 * - Browsers where the site is already installed
 * - User dismissed within last 7 days
 */
export default function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check 7-day dismissal cooldown
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedAt = parseInt(dismissed, 10);
        const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
        if (daysSince < DISMISS_DAYS) return;
      }
    } catch {
      // localStorage unavailable (private browsing, etc.) - proceed without cooldown
    }

    // iOS path: show button immediately if iOS Safari and not already installed
    if (isIOSSafari() && !isAlreadyInstalled()) {
      setVisible(true);
      // No event listeners needed for iOS - button click opens our modal
      return; // Skip beforeinstallprompt registration entirely
    }

    // Android/desktop path continues below (existing handleBeforeInstall etc.)

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault(); // Stop browser's default banner
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const handleInstalled = () => {
      // App installed successfully - hide button
      setDeferredPrompt(null);
      setVisible(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    // iOS: no native prompt, show our instructional modal instead
    if (isIOSSafari()) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      // Whether accepted or dismissed, this prompt instance is consumed
      setDeferredPrompt(null);
      setVisible(false);

      if (choice.outcome === 'dismissed') {
        // User said no - record so we don't bug them for 7 days
        try {
          localStorage.setItem(DISMISS_KEY, Date.now().toString());
        } catch {
          // localStorage unavailable - just hide for this session
        }
      }
    } catch {
      // Prompt failed - hide button to avoid stuck state
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // localStorage unavailable - just hide for this session
    }
  };

  return (
    <>
      <div
        className={`fixed fixed-safe-bottom-left z-40 transition-all duration-300 ${
          visible
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none translate-y-4 opacity-0'
        }`}
      >
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-full bg-white/10 px-5 py-3 backdrop-blur-md ring-1 ring-white/20 shadow-2xl text-sm font-semibold uppercase tracking-wider text-white hover:bg-white/15 hover:text-red-300 transition"
        >
          Install app
        </button>
      </div>

      {/* iOS install modal */}
      {showIOSModal && (
        <div
          className="animate-fade-in fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="glass-card animate-scale-in w-full max-w-md rounded-3xl p-6 sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-xl font-bold text-white">
                Install AAD on your iPhone
              </h2>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                aria-label="Close"
                className="text-gray-300 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <p className="mt-2 text-sm text-gray-300">
              Add AAD to your home screen for fast access, like any other app.
            </p>

            <ol className="mt-6 space-y-4">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                  1
                </span>
                <div className="flex-1">
                  <p className="text-sm text-white">
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 align-middle">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
                        <path d="M4 14v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
                      </svg>
                      <span className="text-xs font-semibold">Share</span>
                    </span>{' '}
                    button at the bottom of Safari.
                  </p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                  2
                </span>
                <p className="flex-1 text-sm text-white">
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </p>
              </li>

              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white">
                  3
                </span>
                <p className="flex-1 text-sm text-white">
                  Tap <strong>Add</strong> in the top right corner.
                </p>
              </li>
            </ol>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full rounded-full bg-red-600 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-white hover:bg-red-500 transition"
              >
                Got it, I will install
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIOSModal(false);
                  handleDismiss();
                }}
                className="w-full rounded-full bg-white/5 px-4 py-3 text-sm font-medium text-gray-300 hover:text-white transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
