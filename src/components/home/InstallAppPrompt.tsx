'use client';

import { useEffect, useState } from 'react';

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
    <div
      className={`fixed bottom-5 left-5 z-40 sm:bottom-8 sm:left-8 transition-all duration-300 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 backdrop-blur-md ring-1 ring-white/20 shadow-2xl">
        <button
          type="button"
          onClick={handleInstall}
          className="text-sm font-semibold uppercase tracking-wider text-white hover:text-red-300 transition"
        >
          Install app
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-gray-400 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
