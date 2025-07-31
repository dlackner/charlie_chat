'use client';

import React from 'react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  onStay: () => void;
  onLeave: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  onStay,
  onLeave
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full border-2 border-orange-500">
        <div className="p-6">
          {/* Header with Charlie image */}
          <div className="flex items-center mb-4">
            <img
              src="/charlie.png"
              alt="Charlie"
              className="w-10 h-10 rounded-full mr-3 shadow-md border"
            />
            <h3 className="text-lg font-semibold text-gray-900">Charlie here!</h3>
          </div>
          
          {/* Message */}
          <p className="text-gray-700 mb-6 leading-relaxed">
            I see you've been working on an offer and I don't want you to lose your work! 
            Click <span className="font-semibold text-orange-600">'More'</span> then{' '}
            <span className="font-semibold text-orange-600">'Save scenario'</span> to keep your work.
          </p>
          
          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onStay}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-150"
            >
              Stay & Save
            </button>
            <button
              onClick={onLeave}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-150"
            >
              Leave Without Saving
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};