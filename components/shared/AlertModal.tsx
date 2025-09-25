/*
 * CHARLIE2 V2 - Alert Modal Component
 * Replaces browser alert() popups with consistent V2 branding
 * Based on existing modal patterns from engage page
 * Supports success, error, warning, and confirmation notification types
 * Part of the new V2 application architecture
 */

'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Trash2, Info } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning' | 'confirm' | 'delete';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const alertConfig = {
  success: {
    icon: CheckCircle,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-gray-900',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    showCancel: false,
  },
  error: {
    icon: AlertCircle,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    titleColor: 'text-gray-900',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    showCancel: false,
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    titleColor: 'text-gray-900',
    buttonColor: 'bg-amber-600 hover:bg-amber-700',
    showCancel: true,
  },
  confirm: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-gray-900',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    showCancel: true,
  },
  delete: {
    icon: Trash2,
    iconBg: 'bg-gradient-to-r from-red-500 to-red-600',
    iconColor: 'text-white',
    titleColor: 'text-gray-900',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    showCancel: true,
  },
};

export default function AlertModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  autoClose = false,
  autoCloseDelay = 3000,
}: AlertModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      if (autoClose && type === 'success') {
        const timer = setTimeout(() => {
          handleClose();
        }, autoCloseDelay);
        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [isOpen, autoClose, autoCloseDelay, type]);

  const config = alertConfig[type];
  const IconComponent = config.icon;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 150); // Allow fade out animation
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity duration-150 ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`}>
      <div className={`bg-white rounded-lg p-6 max-w-md mx-4 relative transform transition-all duration-150 ${
        isVisible ? 'scale-100' : 'scale-95'
      }`}>
        {/* Brand Header */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 ${config.iconBg} rounded-lg flex items-center justify-center`}>
              <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            </div>
          </div>
          <div>
            <h3 className={`text-lg font-bold ${config.titleColor}`}>{title}</h3>
            <p className="text-sm text-gray-600">MultifamilyOS.ai</p>
          </div>
        </div>

        {/* Message Content */}
        <div className="mb-6">
          <p className="text-gray-600 text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Buttons */}
        <div className={`flex ${config.showCancel ? 'space-x-3' : 'justify-end'}`}>
          {config.showCancel && (
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`${config.showCancel ? 'flex-1' : ''} px-4 py-2 text-white rounded-lg transition-colors font-medium ${config.buttonColor}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for easy alert usage throughout the app
export function useAlert() {
  const [alert, setAlert] = useState<{
    isOpen: boolean;
    type: AlertType;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    autoClose?: boolean;
  } | null>(null);

  const showAlert = (
    type: AlertType,
    title: string,
    message: string,
    options?: {
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void;
      autoClose?: boolean;
    }
  ) => {
    setAlert({
      isOpen: true,
      type,
      title,
      message,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      onConfirm: options?.onConfirm,
      autoClose: options?.autoClose,
    });
  };

  const hideAlert = () => {
    setAlert(null);
  };

  // Convenience methods
  const showSuccess = (message: string, title: string = 'Success', autoClose = true) => {
    showAlert('success', title, message, { autoClose });
  };

  const showError = (message: string, title: string = 'Error') => {
    showAlert('error', title, message);
  };

  const showWarning = (message: string, title: string = 'Warning', onConfirm?: () => void) => {
    showAlert('warning', title, message, { onConfirm });
  };

  const showConfirm = (message: string, onConfirm: () => void, title: string = 'Confirm') => {
    showAlert('confirm', title, message, { onConfirm, confirmText: 'Confirm' });
  };

  const showDelete = (message: string, onConfirm: () => void, itemCount?: number) => {
    const title = itemCount ? `Delete ${itemCount} Items` : 'Delete Item';
    const confirmText = itemCount ? `Delete ${itemCount} Items` : 'Delete';
    showAlert('delete', title, message, { onConfirm, confirmText });
  };

  const AlertComponent = alert ? (
    <AlertModal
      isOpen={alert.isOpen}
      onClose={hideAlert}
      type={alert.type}
      title={alert.title}
      message={alert.message}
      confirmText={alert.confirmText}
      cancelText={alert.cancelText}
      onConfirm={alert.onConfirm}
      autoClose={alert.autoClose}
    />
  ) : null;

  return {
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showDelete,
    hideAlert,
    AlertComponent,
  };
}