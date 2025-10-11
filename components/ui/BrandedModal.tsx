'use client';

import React from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

interface BrandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  primaryButton?: {
    text: string;
    onClick: () => void;
  };
  secondaryButton?: {
    text: string;
    onClick: () => void;
  };
}

const iconMap = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle
};

const colorMap = {
  info: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    primary: 'bg-blue-600 hover:bg-blue-700'
  },
  success: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    primary: 'bg-green-600 hover:bg-green-700'
  },
  warning: {
    bg: 'bg-orange-50',
    icon: 'text-orange-600',
    primary: 'bg-orange-600 hover:bg-orange-700'
  },
  error: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    primary: 'bg-red-600 hover:bg-red-700'
  }
};

export default function BrandedModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  primaryButton,
  secondaryButton
}: BrandedModalProps) {
  if (!isOpen) return null;

  const Icon = iconMap[type];
  const colors = colorMap[type];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${colors.bg}`}>
              <Icon className={`h-6 w-6 ${colors.icon}`} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <p className="text-gray-600 leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 px-6 pb-6">
          {secondaryButton && (
            <button
              onClick={secondaryButton.onClick}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              {secondaryButton.text}
            </button>
          )}
          <button
            onClick={primaryButton?.onClick || onClose}
            className={`px-4 py-2 text-white rounded-md transition-colors ${colors.primary}`}
          >
            {primaryButton?.text || 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}