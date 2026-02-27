import React from "react";
import { AlertTriangle, Info } from "lucide-react";

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
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const colors = {
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    warning:
      "bg-yellow-500 hover:bg-yellow-600 text-white focus:ring-yellow-500",
    info: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
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

  return (
    <div className="fixed inset-0 bg-white/10 dark:bg-black/50 backdrop-blur-2xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-md shadow-xl scale-100 transform transition-all border border-transparent dark:border-gray-800">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full ${bgColor} ${iconColor} flex-shrink-0`}
            >
              <Icon size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 rounded-b-xl flex justify-end gap-3 border-t dark:border-gray-800">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 font-medium rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 ${colors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
