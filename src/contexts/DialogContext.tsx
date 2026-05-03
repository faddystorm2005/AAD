'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

/**
 * Branded confirm/alert dialog (P1-1 fix).
 *
 * Replaces every window.confirm / window.alert call across the app with
 * a single styled modal that matches the rest of the UI. iOS no longer
 * shows the system "this site says..." banner that can look like an
 * error. Tap targets are big, contrast meets WCAG AA.
 *
 * Usage:
 *
 *   const showDialog = useDialog();
 *
 *   const ok = await showDialog({
 *     title: 'Remove this booking?',
 *     body: 'This cannot be undone.',
 *     confirmLabel: 'Remove',
 *     danger: true,
 *   });
 *   if (!ok) return;
 *
 * For an alert-style "info" with a single OK button, set alertOnly: true.
 */

export type DialogOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red destructive-action styling for the confirm button. */
  danger?: boolean;
  /** Hides the cancel button so the dialog acts like window.alert. */
  alertOnly?: boolean;
};

type DialogState = DialogOptions & { resolve: (ok: boolean) => void };

const DialogContext = createContext<
  ((opts: DialogOptions) => Promise<boolean>) | null
>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogState | null>(null);

  const showDialog = useCallback(
    (opts: DialogOptions): Promise<boolean> =>
      new Promise((resolve) => {
        // If a dialog is already open, treat the previous one as cancelled
        // so its caller's await resolves and we don't leak a pending promise.
        setCurrent((prev) => {
          prev?.resolve(false);
          return { ...opts, resolve };
        });
      }),
    []
  );

  const handleResolve = useCallback((ok: boolean) => {
    setCurrent((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  // Escape key closes the dialog as a cancel.
  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleResolve(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, handleResolve]);

  return (
    <DialogContext.Provider value={showDialog}>
      {children}
      {current && (
        <DialogModal
          options={current}
          onConfirm={() => handleResolve(true)}
          onCancel={() => handleResolve(false)}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used inside a <DialogProvider>');
  }
  return ctx;
}

function DialogModal({
  options,
  onConfirm,
  onCancel,
}: {
  options: DialogOptions;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const {
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    alertOnly = false,
  } = options;

  const confirmRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the confirm button so keyboard users can hit Enter.
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="aad-dialog-title"
      aria-describedby={body ? 'aad-dialog-body' : undefined}
      className="animate-fade-in fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur"
      onClick={(e) => {
        // Backdrop click cancels. Click inside the card does not bubble out.
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-zinc-900/95 p-6 shadow-2xl">
        <h2 id="aad-dialog-title" className="text-lg font-bold text-white">
          {title}
        </h2>
        {body && (
          <p
            id="aad-dialog-body"
            className="mt-3 text-base leading-relaxed text-gray-200"
          >
            {body}
          </p>
        )}
        <div
          className={
            alertOnly
              ? 'mt-6 flex justify-end'
              : 'mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end'
          }
        >
          {!alertOnly && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-white/20 bg-transparent px-5 py-3 text-base font-semibold text-gray-100 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/30"
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={`rounded-lg px-5 py-3 text-base font-semibold focus:outline-none focus:ring-2 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-300'
                : 'bg-white text-black hover:bg-gray-100 focus:ring-white/40'
            }`}
          >
            {alertOnly ? 'OK' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
