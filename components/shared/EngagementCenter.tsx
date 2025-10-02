'use client';

import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';

interface EngagementCenterProps {
  selectedProperties: any[];
  onDocumentAction: (action: string) => void;
  className?: string;
}

export function EngagementCenter({ 
  selectedProperties, 
  onDocumentAction,
  className = ''
}: EngagementCenterProps) {
  const [showMarketingMaterials, setShowMarketingMaterials] = useState(false);
  const [showLegalDocuments, setShowLegalDocuments] = useState(false);
  const [showFinancialAnalysis, setShowFinancialAnalysis] = useState(false);
  const [showDownload, setShowDownload] = useState(false);

  const selectedCount = selectedProperties.length;
  const hasSelection = selectedCount > 0;
  const hasSingleSelection = selectedCount === 1;

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Engagement Center</h3>
        <div className="text-sm text-gray-600 mt-1">
          {selectedCount} {selectedCount === 1 ? 'property' : 'properties'} selected
        </div>
      </div>

      {/* Marketing Materials Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setShowMarketingMaterials(!showMarketingMaterials)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span className="text-sm font-normal text-gray-900">MARKETING MATERIALS</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showMarketingMaterials ? 'rotate-180' : ''}`} />
        </button>
        {showMarketingMaterials && (
          <div className="px-4 pb-3 space-y-2">
            <button
              onClick={() => onDocumentAction('marketing-letter')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!hasSelection}
              title="Generate marketing letters for selected properties"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div>Marketing Letter</div>
                  <div className="text-xs text-gray-500">Batch multiple properties</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => onDocumentAction('email')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!hasSingleSelection}
              title="Generate email template for selected property"
            >
              <div className="flex items-center">
                <div className="h-4 w-4 mr-2 flex items-center justify-center">
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div>Marketing Email</div>
                  <div className="text-xs text-gray-500">Select 1 property</div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Legal Documents Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setShowLegalDocuments(!showLegalDocuments)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span className="text-sm font-normal text-gray-900">LEGAL DOCUMENTS</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showLegalDocuments ? 'rotate-180' : ''}`} />
        </button>
        {showLegalDocuments && (
          <div className="px-4 pb-3 space-y-2">
            <button
              onClick={() => onDocumentAction('loi')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!hasSingleSelection}
              title="Generate Letter of Intent - select exactly 1 property"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div>Letters of Intent</div>
                  <div className="text-xs text-gray-500">Select 1 property</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => onDocumentAction('purchase-sale')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!hasSingleSelection}
              title="Generate Purchase & Sale Agreement - select exactly 1 property"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div>Purchase & Sale</div>
                  <div className="text-xs text-gray-500">Select 1 property</div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Financial Analysis Section */}
      <div className="border-b border-gray-200">
        <button
          onClick={() => setShowFinancialAnalysis(!showFinancialAnalysis)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span className="text-sm font-normal text-gray-900">FINANCIAL ANALYSIS</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showFinancialAnalysis ? 'rotate-180' : ''}`} />
        </button>
        {showFinancialAnalysis && (
          <div className="px-4 pb-3 space-y-2">
            <button
              onClick={() => onDocumentAction('create-offer')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!hasSingleSelection}
              title="Create new analysis for selected property"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div>Create Analysis</div>
                  <div className="text-xs text-gray-500">Select 1 property</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => onDocumentAction('view-offers')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              title="View all your analyses"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div>View Analyses</div>
                  <div className="text-xs text-gray-500">View all your analyses</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => onDocumentAction('cash-flow-report')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              disabled={!hasSingleSelection}
              title="Generate 10-year cash flow reports - select exactly 1 property"
            >
              <div className="flex items-center">
                <div className="h-4 w-4 mr-2 flex items-center justify-center">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a4 4 0 01-4-4V5a4 4 0 014-4h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a4 4 0 01-4 4z" />
                  </svg>
                </div>
                <div>
                  <div>Cash Flow Report</div>
                  <div className="text-xs text-gray-500">Select 1 property</div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Download Section */}
      <div>
        <button
          onClick={() => setShowDownload(!showDownload)}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between"
        >
          <span className="text-sm font-normal text-gray-900">DOWNLOAD</span>
          <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showDownload ? 'rotate-180' : ''}`} />
        </button>
        {showDownload && (
          <div className="px-4 pb-3 space-y-2">
            <button
              onClick={() => onDocumentAction('csv')}
              className="block w-full text-left py-2 px-3 text-sm text-gray-700 hover:bg-blue-100 disabled:text-gray-400 disabled:cursor-not-allowed rounded transition-colors"
              title="Export property to CSV"
            >
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <div>
                  <div>CSV Download</div>
                  <div className="text-xs text-gray-500">Export property data</div>
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Helper text when no properties selected */}
      {!hasSelection && (
        <div className="p-4 text-sm text-gray-500 text-center">
          Select properties to enable actions
        </div>
      )}
    </div>
  );
}