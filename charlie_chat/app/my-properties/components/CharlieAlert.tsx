'use client';

import React from 'react';

interface CharlieAlertProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  showConfirm?: boolean;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const CharlieAlert: React.FC<CharlieAlertProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showConfirm = false,
  onConfirm,
  confirmText = 'OK',
  cancelText = 'Cancel'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '⚠️';
      case 'warning':
        return '⚠️';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'error':
        return 'border-red-500';
      case 'warning':
        return 'border-yellow-500';
      case 'success':
        return 'border-orange-500'; // Keep Charlie's orange branding for success
      default:
        return 'border-orange-500';
    }
  };

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`bg-white rounded-lg shadow-2xl max-w-md w-full border-2 ${getBorderColor()}`}>
        <div className="p-6">
          {/* Header with Charlie image */}
          <div className="flex items-center mb-4">
            <img
              src="/charlie.png"
              alt="Charlie"
              className="w-10 h-10 rounded-full mr-3 shadow-md border-[0.5px] border-gray-300"
            />
            <div className="flex items-center">
              <span className="text-lg mr-2">{getIcon()}</span>
              <h3 className="text-lg font-semibold text-gray-900">
                {title || 'Charlie here!'}
              </h3>
            </div>
          </div>
          
          {/* Message */}
          <p className="text-gray-700 mb-6 leading-relaxed">
            {message}
          </p>
          
          {/* Buttons */}
          <div className="flex space-x-3">
            {showConfirm ? (
              <>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150"
                >
                  {confirmText}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-150"
                >
                  {cancelText}
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150"
              >
                {confirmText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};