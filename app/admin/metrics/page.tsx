'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const ACTIVITY_COLUMNS: { key: string; label: string }[] = [
  { key: 'property_searches', label: 'Searches' },
  { key: 'properties_retrieved', label: 'Properties Retrieved' },
  { key: 'offers_created', label: 'Offers' },
  { key: 'lois_created', label: 'LOIs' },
  { key: 'marketing_letters_created', label: 'Marketing Letters' },
  { key: 'emails_sent', label: 'Emails' },
  { key: 'deal_signals_markets', label: 'Deal Signals Markets' }
];

interface UserMetrics {
  user_id: string;
  email: string | null;
  full_name: string | null;
  user_class: string | null;
  total: number;
  [key: string]: any;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminMetricsPage() {
  const { user, supabase } = useAuth();
  const [accessState, setAccessState] = useState<'checking' | 'denied' | 'allowed'>('checking');
  const [month, setMonth] = useState(currentMonth());
  const [users, setUsers] = useState<UserMetrics[]>([]);
  const [totals, setTotals] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Other Properties tool state
  const [propertyJson, setPropertyJson] = useState('');
  const [userUuid, setUserUuid] = useState('');
  const [isLoadingProperty, setIsLoadingProperty] = useState(false);
  const [propertyMessage, setPropertyMessage] = useState('');
  const [propertyMessageType, setPropertyMessageType] = useState<'success' | 'error' | ''>('');

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setAccessState('denied');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_class')
        .eq('user_id', user.id)
        .single();

      setAccessState(profile?.user_class === 'admin' ? 'allowed' : 'denied');
    };

    checkAccess();
  }, [user, supabase]);

  useEffect(() => {
    if (accessState !== 'allowed') return;

    const fetchMetrics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/admin/metrics?month=${month}`, {
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to load metrics');
        }

        setUsers(result.users || []);
        setTotals(result.totals || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metrics');
        setUsers([]);
        setTotals(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, [accessState, month, supabase]);

  const exportToCsv = () => {
    const headers = ['Name', 'Email', 'Class', ...ACTIVITY_COLUMNS.map(c => c.label), 'Total'];
    const rows = users.map(u => [
      u.full_name || '',
      u.email || '',
      u.user_class || '',
      ...ACTIVITY_COLUMNS.map(c => u[c.key] ?? 0),
      u.total
    ]);
    if (totals) {
      rows.push(['Total', '', '', ...ACTIVITY_COLUMNS.map(c => totals[c.key] ?? 0), totals.total ?? 0]);
    }

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-metrics-${month}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoadProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingProperty(true);
    setPropertyMessage('');
    setPropertyMessageType('');

    try {
      if (!propertyJson.trim()) {
        throw new Error('Property JSON is required');
      }
      if (!userUuid.trim()) {
        throw new Error('User UUID is required');
      }

      let propertyData;
      try {
        propertyData = JSON.parse(propertyJson);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }

      const response = await fetch('/api/admin/load-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userUuid.trim(),
          propertyData: propertyData
        })
      });

      const result = await response.json();

      if (response.ok) {
        setPropertyMessage(`Property loaded successfully! Property ID: ${result.propertyId}`);
        setPropertyMessageType('success');
        setPropertyJson('');
        setUserUuid('');
      } else {
        throw new Error(result.error || 'Failed to load property');
      }
    } catch (err) {
      setPropertyMessage(err instanceof Error ? err.message : 'An unknown error occurred');
      setPropertyMessageType('error');
    } finally {
      setIsLoadingProperty(false);
    }
  };

  if (accessState === 'checking') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (accessState === 'denied') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white shadow rounded-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-600">This page is only available to admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Activity Metrics</h1>
              <p className="mt-1 text-sm text-gray-600">
                Property searches, properties retrieved, and other activity by user for the selected month.
              </p>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label htmlFor="month" className="block text-xs font-medium text-gray-700 mb-1">
                  Month
                </label>
                <input
                  type="month"
                  id="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={exportToCsv}
                disabled={users.length === 0}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                {error}
              </div>
            )}

            {isLoading ? (
              <p className="text-sm text-gray-500">Loading metrics...</p>
            ) : users.length === 0 ? (
              <p className="text-sm text-gray-500">No activity recorded for this month.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed divide-y divide-gray-200 text-sm">
                  <colgroup>
                    <col className="w-[16%]" />
                    <col className="w-[20%]" />
                    <col className="w-[8%]" />
                    {ACTIVITY_COLUMNS.map(col => (
                      <col key={col.key} className="w-[8%]" />
                    ))}
                    <col className="w-[8%]" />
                  </colgroup>
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <th className="py-2 pr-2 align-bottom">Name</th>
                      <th className="py-2 pr-2 align-bottom">Email</th>
                      <th className="py-2 pr-2 align-bottom">Class</th>
                      {ACTIVITY_COLUMNS.map(col => (
                        <th key={col.key} className="py-2 pr-2 text-right align-bottom leading-tight">{col.label}</th>
                      ))}
                      <th className="py-2 pr-2 text-right align-bottom">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map(u => (
                      <tr key={u.user_id}>
                        <td className="py-2 pr-2 text-gray-900 truncate" title={u.full_name || undefined}>{u.full_name || u.user_id}</td>
                        <td className="py-2 pr-2 text-gray-600 truncate" title={u.email || undefined}>{u.email || '—'}</td>
                        <td className="py-2 pr-2 text-gray-600">{u.user_class || '—'}</td>
                        {ACTIVITY_COLUMNS.map(col => (
                          <td key={col.key} className="py-2 pr-2 text-right text-gray-700">{u[col.key] ?? 0}</td>
                        ))}
                        <td className="py-2 pr-2 text-right font-semibold text-gray-900">{u.total}</td>
                      </tr>
                    ))}
                  </tbody>
                  {totals && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-300 font-semibold text-gray-900">
                        <td className="py-2 pr-2">Total</td>
                        <td className="py-2 pr-2"></td>
                        <td className="py-2 pr-2"></td>
                        {ACTIVITY_COLUMNS.map(col => (
                          <td key={col.key} className="py-2 pr-2 text-right">{totals[col.key] ?? 0}</td>
                        ))}
                        <td className="py-2 pr-2 text-right">{totals.total ?? 0}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pro signup links (info only) */}
        <div className="bg-white shadow rounded-lg mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Pro Signup Links</h2>
            <p className="mt-1 text-sm text-gray-600">
              Direct signup links for new Pro users, for use in emails/outreach. Do not send to existing Pro users.
            </p>
          </div>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Monthly:</span>
              <code className="text-sm text-blue-600 break-all">https://multifamilyos.ai/pro-signup</code>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">Annual:</span>
              <code className="text-sm text-blue-600 break-all">https://multifamilyos.ai/pro-signup?plan=annual</code>
            </div>
          </div>
        </div>

        {/* Load Other Properties tool */}
        <div className="bg-white shadow rounded-lg mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Load Other Properties</h2>
            <p className="mt-2 text-sm text-gray-600">
              Manually add a property to a user's favorites from external API data.
            </p>

            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">How to Use This Tool:</h3>
              <ol className="text-xs text-blue-800 space-y-1 list-decimal list-inside">
                <li><strong>Get Property ID:</strong> Find the property ID you want to load</li>
                <li><strong>Fetch from RealEstateAPI:</strong> Use the property ID to call the RealEstateAPI and get the complete JSON response</li>
                <li><strong>Paste JSON:</strong> Copy the entire JSON response and paste it into the form below</li>
                <li><strong>Enter User UUID:</strong> Specify which user should receive this property in their favorites</li>
                <li><strong>Submit:</strong> The property will be saved and automatically favorited for that user</li>
              </ol>
            </div>
          </div>

          <form onSubmit={handleLoadProperty} className="p-6 space-y-6">
            <div>
              <label htmlFor="propertyJson" className="block text-sm font-medium text-gray-700 mb-2">
                Property JSON Data
              </label>
              <textarea
                id="propertyJson"
                value={propertyJson}
                onChange={(e) => setPropertyJson(e.target.value)}
                rows={12}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Paste the entire JSON response from the realestateapi here..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Paste the complete JSON object returned from the realestateapi
              </p>
            </div>

            <div>
              <label htmlFor="userUuid" className="block text-sm font-medium text-gray-700 mb-2">
                User UUID
              </label>
              <input
                type="text"
                id="userUuid"
                value={userUuid}
                onChange={(e) => setUserUuid(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 36f7b3a4-7bb1-42c7-9f66-b036de7dff5d"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                The UUID of the user who should receive this property as a favorite
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoadingProperty}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isLoadingProperty
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isLoadingProperty ? 'Loading Property...' : 'Load Property'}
              </button>
            </div>

            {propertyMessage && (
              <div className={`p-4 rounded-md ${
                propertyMessageType === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}>
                <p className="text-sm font-medium">{propertyMessage}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
