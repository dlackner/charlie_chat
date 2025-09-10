import React, { useState } from 'react';
import { Bell, ChevronDown, ChevronUp, X, MapPin } from 'lucide-react';
import { ReminderData, formatReminderDate } from '@/lib/reminderUtils';

interface ReminderBannerProps {
  reminders: ReminderData[];
  onDismissReminder: (reminderId: string) => void;
  onViewProperty: (propertyId: string) => void;
}

export const ReminderBanner: React.FC<ReminderBannerProps> = ({
  reminders,
  onDismissReminder,
  onViewProperty
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't show banner if no reminders
  if (reminders.length === 0) {
    return null;
  }

  const reminderCount = reminders.length;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg mb-4">
      {/* Collapsed State */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <span className="text-blue-800 font-medium">
            You have {reminderCount} reminder{reminderCount === 1 ? '' : 's'} today
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-blue-600 text-sm">
            {isExpanded ? 'Collapse' : 'Click to expand'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          )}
        </div>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div className="border-t border-blue-200">
          <div className="px-4 py-3">
            <div className="flex items-center space-x-2 mb-3">
              <Bell className="w-5 h-5 text-blue-600" />
              <h3 className="text-blue-900 font-semibold text-lg">
                REMINDERS ({reminderCount})
              </h3>
              <span className="text-blue-600 text-sm">
                - {formatReminderDate(new Date())}
              </span>
            </div>
            
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <ReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onDismiss={() => onDismissReminder(reminder.id)}
                  onViewProperty={() => onViewProperty(reminder.property_id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReminderItemProps {
  reminder: ReminderData;
  onDismiss: () => void;
  onViewProperty: () => void;
}

const ReminderItem: React.FC<ReminderItemProps> = ({
  reminder,
  onDismiss,
  onViewProperty
}) => {
  // Extract property address from the reminder data or use property_id as fallback
  const getPropertyAddress = (reminder: ReminderData): string => {
    // If we have property data in the future, we can extract address here
    // For now, we'll need to pass address separately or fetch it
    return `Property ${reminder.property_id.slice(0, 8)}...`;
  };

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Reminder Text */}
          <div className="text-gray-900 font-medium mb-2">
            {reminder.reminder_text}
          </div>
          
          {/* Property Info */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{getPropertyAddress(reminder)}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onViewProperty}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              View Property
            </button>
            <button
              onClick={onDismiss}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Extended version that includes property address
interface ReminderWithProperty extends ReminderData {
  property_address?: string;
  property_city?: string;
  property_state?: string;
}

interface EnhancedReminderBannerProps {
  reminders: ReminderWithProperty[];
  onDismissReminder: (reminderId: string) => void;
  onViewProperty: (propertyId: string) => void;
}

export const EnhancedReminderBanner: React.FC<EnhancedReminderBannerProps> = ({
  reminders,
  onDismissReminder,
  onViewProperty
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (reminders.length === 0) {
    return null;
  }

  const reminderCount = reminders.length;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg mb-4">
      {/* Collapsed State */}
      <div 
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-blue-600" />
          <span className="text-blue-800 font-medium">
            You have {reminderCount} reminder{reminderCount === 1 ? '' : 's'} today
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-blue-600 text-sm">
            {isExpanded ? 'Collapse' : 'Click to expand'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-blue-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-blue-600" />
          )}
        </div>
      </div>

      {/* Expanded State */}
      {isExpanded && (
        <div className="border-t border-blue-200">
          <div className="px-4 py-3">
            <div className="space-y-3">
              {reminders.map((reminder) => (
                <EnhancedReminderItem
                  key={reminder.id}
                  reminder={reminder}
                  onDismiss={() => onDismissReminder(reminder.id)}
                  onViewProperty={() => onViewProperty(reminder.property_id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const EnhancedReminderItem: React.FC<{
  reminder: ReminderWithProperty;
  onDismiss: () => void;
  onViewProperty: () => void;
}> = ({ reminder, onDismiss, onViewProperty }) => {
  const getDisplayAddress = (reminder: ReminderWithProperty): string => {
    if (reminder.property_address) {
      const city = reminder.property_city ? `, ${reminder.property_city}` : '';
      const state = reminder.property_state ? ` ${reminder.property_state}` : '';
      return `${reminder.property_address}${city}${state}`;
    }
    return `Property ${reminder.property_id.slice(0, 8)}...`;
  };

  return (
    <div className="bg-white border border-blue-200 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Reminder Text */}
          <div className="text-gray-900 font-medium mb-2 break-words whitespace-pre-wrap">
            {reminder.reminder_text}
          </div>
          
          {/* Property Info */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{getDisplayAddress(reminder)}</span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onViewProperty}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
            >
              View Property
            </button>
            <button
              onClick={onDismiss}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        
        {/* Close Button */}
        <button
          onClick={onDismiss}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
          title="Dismiss reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};