import { useState, useCallback } from 'react';
import type { Toast } from '../types';

/** Duration in ms before a toast auto-dismisses */
const TOAST_DURATION_MS = 4000;

interface UseToastResult {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

/**
 * Simple toast notification system.
 * Toasts auto-dismiss after TOAST_DURATION_MS.
 */
export function useToast(): UseToastResult {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const toast: Toast = { id, message, type };
      setToasts((prev) => [...prev, toast]);

      setTimeout(() => {
        removeToast(id);
      }, TOAST_DURATION_MS);
    },
    [removeToast]
  );

  return { toasts, addToast, removeToast };
}
