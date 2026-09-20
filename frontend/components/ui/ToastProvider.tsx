import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface ToastItem {
  id: string;
  content: React.ReactNode;
  duration: number;
}

interface ToastContextValue {
  addToast: (content: React.ReactNode, duration?: number) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  addToast: () => '',
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

let nextId = 0;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((content: React.ReactNode, duration = 3000) => {
    const id = String(++nextId);
    setToasts((prev) => [...prev, { id, content, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed top-20 right-2 z-[100] flex flex-col gap-2 pointer-events-none w-[calc(100%-1rem)] sm:w-auto sm:max-w-sm">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
              className="pointer-events-auto rounded-lg border px-3 py-2.5 sm:px-4 sm:py-3 shadow-xl flex items-center gap-2 sm:gap-3 break-words"
              style={{
                backgroundColor: 'rgb(var(--panel-rgb) / 0.96)',
                borderColor: 'rgb(var(--border-rgb) / 0.4)',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded-full p-0.5 hover:bg-rose-500/15 transition-colors cursor-pointer"
                aria-label="Dismiss"
                style={{ color: 'rgb(244 63 94)' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 min-w-0 leading-snug">{t.content}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
