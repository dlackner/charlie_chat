/*
 * CHARLIE2 V2 - Alert Modal Test Page
 * Demo page to test and showcase the new AlertModal component
 * Temporary page for testing - remove after implementation is complete
 */

'use client';

import { useAlert } from '@/components/v2/AlertModal';

export default function TestAlertsPage() {
  const { showSuccess, showError, showWarning, showConfirm, showDelete, AlertComponent } = useAlert();

  const handleTestSuccess = () => {
    showSuccess('Your action was completed successfully!', 'Success');
  };

  const handleTestError = () => {
    showError('Something went wrong. Please try again.', 'Error');
  };

  const handleTestWarning = () => {
    showWarning(
      'This action may have unintended consequences. Are you sure you want to continue?',
      'Warning',
      () => {
        console.log('Warning confirmed!');
      }
    );
  };

  const handleTestConfirm = () => {
    showConfirm(
      'Are you sure you want to proceed with this action?',
      () => {
        console.log('Action confirmed!');
        showSuccess('Action completed successfully!');
      },
      'Confirm Action'
    );
  };

  const handleTestDelete = () => {
    showDelete(
      'Are you sure you want to continue? This will remove these properties from your investment pipeline.',
      () => {
        console.log('Items deleted!');
        showSuccess('Properties deleted successfully!');
      },
      3
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AlertModal Component Test
          </h1>
          <p className="text-gray-600 mb-8">
            Test the new V2 AlertModal component that replaces browser alert() popups
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Success Alert */}
            <div className="p-6 border border-green-200 rounded-lg bg-green-50">
              <h3 className="font-semibold text-green-800 mb-2">Success Alert</h3>
              <p className="text-green-700 text-sm mb-4">
                Shows success messages with auto-close option
              </p>
              <button
                onClick={handleTestSuccess}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Test Success
              </button>
            </div>

            {/* Error Alert */}
            <div className="p-6 border border-red-200 rounded-lg bg-red-50">
              <h3 className="font-semibold text-red-800 mb-2">Error Alert</h3>
              <p className="text-red-700 text-sm mb-4">
                Shows error messages that require acknowledgment
              </p>
              <button
                onClick={handleTestError}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Test Error
              </button>
            </div>

            {/* Warning Alert */}
            <div className="p-6 border border-amber-200 rounded-lg bg-amber-50">
              <h3 className="font-semibold text-amber-800 mb-2">Warning Alert</h3>
              <p className="text-amber-700 text-sm mb-4">
                Shows warnings with optional confirmation
              </p>
              <button
                onClick={handleTestWarning}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Test Warning
              </button>
            </div>

            {/* Confirm Alert */}
            <div className="p-6 border border-blue-200 rounded-lg bg-blue-50">
              <h3 className="font-semibold text-blue-800 mb-2">Confirm Alert</h3>
              <p className="text-blue-700 text-sm mb-4">
                Shows confirmation dialogs with Yes/Cancel options
              </p>
              <button
                onClick={handleTestConfirm}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Test Confirm
              </button>
            </div>

            {/* Delete Alert */}
            <div className="p-6 border border-red-200 rounded-lg bg-red-50">
              <h3 className="font-semibold text-red-800 mb-2">Delete Alert</h3>
              <p className="text-red-700 text-sm mb-4">
                Shows delete confirmations with special styling
              </p>
              <button
                onClick={handleTestDelete}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Test Delete
              </button>
            </div>

            {/* Multiple Alerts */}
            <div className="p-6 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="font-semibold text-gray-800 mb-2">Chain Alerts</h3>
              <p className="text-gray-700 text-sm mb-4">
                Test chaining multiple alerts together
              </p>
              <button
                onClick={() => {
                  showConfirm(
                    'This will trigger multiple alerts. Continue?',
                    () => {
                      setTimeout(() => showSuccess('First action completed!'), 500);
                      setTimeout(() => showWarning('Second action requires attention'), 1500);
                    }
                  );
                }}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Test Chain
              </button>
            </div>
          </div>

          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Usage Notes:</h4>
            <ul className="text-blue-700 text-sm space-y-1">
              <li>• Success alerts auto-close after 3 seconds by default</li>
              <li>• Error alerts require manual dismissal</li>
              <li>• Warning and confirm alerts support callback functions</li>
              <li>• Delete alerts have special red styling and custom button text</li>
              <li>• All alerts follow V2 branding with MultifamilyOS.ai logo</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Render the alert modal */}
      {AlertComponent}
    </div>
  );
}