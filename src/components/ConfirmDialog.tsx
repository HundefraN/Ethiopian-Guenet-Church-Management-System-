import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, Info } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info";
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  type = "danger",
  confirmText,
  cancelText,
}: ConfirmDialogProps) {
  const { t } = useLanguage();

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const finalConfirmText = confirmText || t('common.confirm');
  const finalCancelText = cancelText || t('common.cancel');

  const colors = {
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 shadow-red-500/20",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500 shadow-yellow-500/20",
    info: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 shadow-blue-500/20",
  };

  const Icon = type === "danger" || type === "warning" ? AlertTriangle : Info;
  const iconColor =
    type === "danger"
      ? "text-red-600"
      : type === "warning"
        ? "text-yellow-600"
        : "text-blue-600";
  const bgColor =
    type === "danger"
      ? "bg-red-50 dark:bg-red-900/20"
      : type === "warning"
        ? "bg-yellow-50 dark:bg-yellow-900/20"
        : "bg-blue-50 dark:bg-blue-900/20";

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* Dialog Content */}
      <div className="bg-white dark:bg-gray-900 rounded-[28px] w-full max-w-md shadow-2xl relative z-10 animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-8">
          <div className="flex items-start gap-4">
            <div
              className={`p-4 rounded-2xl ${bgColor} ${iconColor} flex-shrink-0 shadow-sm`}
            >
              <Icon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">
                {title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed font-medium">{message}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50/80 dark:bg-gray-800/50 px-8 py-5 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all active:scale-95"
          >
            {finalCancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 font-bold rounded-xl transition-all shadow-lg active:scale-95 ${colors[type]}`}
          >
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

