import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface MasterDetailLayoutProps {
  children: React.ReactNode; // The List content
  detail: React.ReactNode; // The Detail content
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  actions?: React.ReactNode;
}

export default function MasterDetailLayout({
  children,
  detail,
  isOpen,
  onClose,
  title = "Details",
  actions,
}: MasterDetailLayoutProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  // Desktop View (Split Screen)
  if (isDesktop) {
    return (
      <div className="flex h-[calc(100vh-2rem)] overflow-hidden rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        {/* List Pane */}
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${
            isOpen ? 'w-1/2 lg:w-[45%]' : 'w-full'
          } border-r border-gray-100 dark:border-gray-800`}
        >
          {children}
        </div>

        {/* Detail Pane */}
        <AnimatePresence mode="wait">
          {isOpen && (
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-1/2 lg:w-[55%] h-full bg-gray-50/50 dark:bg-gray-950/50 flex flex-col overflow-hidden relative"
            >
               {/* Detail Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
                <div className="flex items-center gap-2">
                  {actions}
                  <button
                    onClick={onClose}
                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-500 transition-all border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              
              {/* Detail Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {detail}
              </div>
            </motion.div>
          )}
           {!isOpen && (
            <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50/30 dark:bg-gray-900/30 text-gray-500 dark:text-gray-400 flex-col gap-4">
               <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 border-dashed animate-spin-slow"></div>
               </div>
               <p className="font-medium">Select an item to view details</p>
            </div>
           )}
        </AnimatePresence>
      </div>
    );
  }

  // Mobile View (Navigation)
  return (
    <div className="relative h-full w-full">
      {/* List View - Always rendered, but hidden when detail is open to preserve state/scroll if possible, 
          but simpler to just conditionally render or use absolute positioning */}
      <div className={`${isOpen ? 'hidden' : 'block'} h-full`}>
        {children}
      </div>

      {/* Detail View - Full Screen Overlay via Portal */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 z-[100] bg-white dark:bg-gray-950 flex flex-col"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md sticky top-0 z-10 shadow-sm pt-[max(0.75rem,env(safe-area-inset-top))]">
                <button
                  onClick={onClose}
                  className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate flex-1">{title}</h2>
                {actions}
              </div>
              <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50/30 dark:bg-black/20">
                {detail}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
