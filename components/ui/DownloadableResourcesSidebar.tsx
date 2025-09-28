'use client';

import { useState, useEffect } from 'react';
import { Download, FileText } from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuth } from '@/contexts/AuthContext';

interface DownloadableResource {
  id: string;
  title: string;
  description: string;
  category: 'Getting Started' | 'Resources' | 'Upcoming Events';
  file_content?: ArrayBuffer | string;
  file_name: string;
  file_size: number;
  content_type: string;
  public_url?: string;
  user_class: string | null;
  sort_order: number;
}

export function DownloadableResourcesSidebar() {
  const [resources, setResources] = useState<DownloadableResource[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchResources();
  }, [user]);

  const fetchResources = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('downloadable_resources')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('sort_order');

      if (error) {
        console.error('Error fetching resources:', error);
        return;
      }

      // For now, show all resources regardless of user class
      // TODO: Implement user class filtering when AuthContext is updated
      const filteredResources = data || [];

      setResources(filteredResources);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadResource = async (resource: DownloadableResource) => {
    try {
      if (resource.public_url) {
        // Simple download from public URL
        const link = document.createElement('a');
        link.href = resource.public_url;
        link.download = resource.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback: alert user that file is not available
        alert(`File ${resource.file_name} is not available for download.`);
      }
    } catch (error) {
      console.error('Download error:', error);
      alert(`Failed to download ${resource.file_name}. Please try again.`);
    }
  };

  const groupedResources = {
    'Getting Started': resources.filter(r => r.category === 'Getting Started'),
    'Resources': resources.filter(r => r.category === 'Resources'),
    'Upcoming Events': resources.filter(r => r.category === 'Upcoming Events')
  };

  if (loading) {
    return (
      <div className="sticky top-6">
        <div className="mb-4">
          <h3 className="text-3xl font-bold text-gray-900">Resources</h3>
          <p className="text-gray-600">Downloadable guides and materials</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-6">
      {/* Header outside the white card */}
      <div className="mb-4">
        <h3 className="text-3xl font-bold text-gray-900">Resources</h3>
        <p className="text-gray-600">Downloadable guides and materials</p>
      </div>
      
      {/* White card content */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {Object.entries(groupedResources).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-100 pb-2">{category}</h4>
              
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Coming soon</p>
              ) : (
                <div className="space-y-2">
                  {items.map((resource) => (
                    <div
                      key={resource.id}
                      className="group flex items-start space-x-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => downloadResource(resource)}
                    >
                      <FileText className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-600 truncate">
                          {resource.title}
                        </p>
                        {resource.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {resource.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-400">
                            {Math.round(resource.file_size / 1024)} KB
                          </span>
                          <Download className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}