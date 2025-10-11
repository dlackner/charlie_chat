/*
 * CHARLIE2 V2 - StandardModal Component
 * Reusable modal component for consistent UI across the application
 * Features modern design with backdrop blur, smooth animations, and brand-aligned styling
 * Replaces inconsistent modal implementations throughout the app
 */

import React from 'react';
import { X } from 'lucide-react';

interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const StandardModal: React.FC<StandardModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'md',
  className = ''
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg', 
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-2xl shadow-2xl w-full ${sizeClasses[size]} ${className} transform transition-all duration-200 scale-100`}>
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-100">
          <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h3>
          {showCloseButton && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="px-8 pb-8 pt-2">
          {children}
        </div>
      </div>
    </div>
  );
};

// Modal with predefined action buttons
interface StandardModalWithActionsProps extends StandardModalProps {
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'danger';
    disabled?: boolean;
    type?: 'button' | 'submit';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const StandardModalWithActions: React.FC<StandardModalWithActionsProps> = ({
  primaryAction,
  secondaryAction,
  children,
  ...modalProps
}) => {
  return (
    <StandardModal {...modalProps}>
      <div>
        {children}
        
        {(primaryAction || secondaryAction) && (
          <div className="flex space-x-4 pt-6 border-t border-gray-100 mt-6">
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                className="flex-1 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 py-3 px-6 rounded-xl font-semibold transition-all duration-200 hover:shadow-sm"
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                type={primaryAction?.type || 'button'}
                onClick={primaryAction?.onClick}
                disabled={primaryAction?.disabled}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg ${
                  primaryAction?.variant === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white hover:-translate-y-0.5'
                }`}
              >
                {primaryAction?.label}
              </button>
            )}
          </div>
        )}
      </div>
    </StandardModal>
  );
};