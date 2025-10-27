'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface PropertyDeepDiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyData: any;
}

export default function PropertyDeepDiveModal({
  isOpen,
  onClose,
  propertyData
}: PropertyDeepDiveModalProps) {
  const [openSections, setOpenSections] = useState<{ [key: string]: boolean }>({});

  if (!isOpen || !propertyData?.data) return null;

  const data = propertyData.data;

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatValue = (value: any, key?: string): string => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') {
      // Don't format years with commas
      if (key && (key.toLowerCase().includes('year') || key === 'yearBuilt')) {
        return String(value);
      }
      return value.toLocaleString();
    }
    if (typeof value === 'string' && value.includes('T00:00:00')) {
      return new Date(value).toLocaleDateString();
    }
    return String(value);
  };

  const renderSection = (title: string, data: any, sectionKey: string, index: number) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;

    const isOpen = openSections[sectionKey];

    return (
      <div key={sectionKey} className="border-b border-gray-300">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-200 transition-colors bg-gray-100"
        >
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {isOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-700" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-700" />
          )}
        </button>
        
        {isOpen && (
          <div className="px-4 pb-4 bg-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(data).map(([key, value]) => {
                if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                  return (
                    <div key={key} className="col-span-full">
                      <h4 className="font-medium text-gray-800 mb-2 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </h4>
                      <div className="ml-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(value).map(([subKey, subValue]) => (
                          <div key={subKey} className="flex justify-between py-1">
                            <span className="text-gray-600 capitalize">
                              {subKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatValue(subValue, subKey)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={key} className="flex justify-between py-2">
                    <span className="text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                    </span>
                    <span className="font-medium text-gray-900">
                      {formatValue(value, key)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const sections = [
    { title: 'Property Overview', data: {
      address: data.propertyInfo?.address,
      yearBuilt: data.propertyInfo?.yearBuilt,
      medianIncome: data.demographics?.medianIncome
    }, key: 'propertyInfo' },
    { title: 'Property Attributes', data: {
      airConditioningAvailable: data.propertyInfo?.airConditioningAvailable,
      airConditioningType: data.propertyInfo?.airConditioningType,
      attic: data.propertyInfo?.attic,
      basementFinishedPercent: data.propertyInfo?.basementFinishedPercent,
      basementSquareFeet: data.propertyInfo?.basementSquareFeet,
      basementSquareFeetFinished: data.propertyInfo?.basementSquareFeetFinished,
      basementSquareFeetUnfinished: data.propertyInfo?.basementSquareFeetUnfinished,
      basementType: data.propertyInfo?.basementType,
      bathrooms: data.propertyInfo?.bathrooms,
      bedrooms: data.propertyInfo?.bedrooms,
      breezeway: data.propertyInfo?.breezeway,
      buildingCondition: data.propertyInfo?.buildingCondition,
      buildingSquareFeet: data.propertyInfo?.buildingSquareFeet,
      buildingsCount: data.propertyInfo?.buildingsCount,
      carport: data.propertyInfo?.carport,
      construction: data.propertyInfo?.construction,
      deck: data.propertyInfo?.deck,
      deckArea: data.propertyInfo?.deckArea,
      featureBalcony: data.propertyInfo?.featureBalcony,
      fireplace: data.propertyInfo?.fireplace,
      fireplaces: data.propertyInfo?.fireplaces,
      garageSquareFeet: data.propertyInfo?.garageSquareFeet,
      garageType: data.propertyInfo?.garageType,
      heatingFuelType: data.propertyInfo?.heatingFuelType,
      heatingType: data.propertyInfo?.heatingType,
      hoa: data.propertyInfo?.hoa,
      interiorStructure: data.propertyInfo?.interiorStructure,
      latitude: data.propertyInfo?.latitude,
      livingSquareFeet: data.propertyInfo?.livingSquareFeet,
      longitude: data.propertyInfo?.longitude,
      lotSquareFeet: data.propertyInfo?.lotSquareFeet,
      parcelAccountNumber: data.propertyInfo?.parcelAccountNumber,
      parkingSpaces: data.propertyInfo?.parkingSpaces,
      partialBathrooms: data.propertyInfo?.partialBathrooms,
      patio: data.propertyInfo?.patio,
      patioArea: data.propertyInfo?.patioArea,
      plumbingFixturesCount: data.propertyInfo?.plumbingFixturesCount,
      pool: data.propertyInfo?.pool,
      poolArea: data.propertyInfo?.poolArea,
      porchArea: data.propertyInfo?.porchArea,
      porchType: data.propertyInfo?.porchType,
      pricePerSquareFoot: data.propertyInfo?.pricePerSquareFoot,
      propertyUse: data.propertyInfo?.propertyUse,
      propertyUseCode: data.propertyInfo?.propertyUseCode,
      roofConstruction: data.propertyInfo?.roofConstruction,
      roofMaterial: data.propertyInfo?.roofMaterial,
      roomsCount: data.propertyInfo?.roomsCount,
      rvParking: data.propertyInfo?.rvParking,
      safetyFireSprinklers: data.propertyInfo?.safetyFireSprinklers,
      stories: data.propertyInfo?.stories,
      taxExemptionHomeownerFlag: data.propertyInfo?.taxExemptionHomeownerFlag,
      unitsCount: data.propertyInfo?.unitsCount,
      utilitiesSewageUsage: data.propertyInfo?.utilitiesSewageUsage,
      utilitiesWaterSource: data.propertyInfo?.utilitiesWaterSource
    }, key: 'propertyAttributes' },
    { title: 'Financial Details', data: {
      equity: data.equity,
      equityPercent: data.equityPercent,
      estimatedValue: data.estimatedValue,
      estimatedEquity: data.estimatedEquity,
      estimatedMortgageBalance: data.estimatedMortgageBalance,
      estimatedMortgagePayment: data.estimatedMortgagePayment,
      openMortgageBalance: data.openMortgageBalance,
      highEquity: data.highEquity,
      freeClear: data.freeClear
    }, key: 'financial' },
    { title: 'Tax Information', data: data.taxInfo, key: 'taxInfo' },
    { title: 'Owner Information', data: {
      ...data.ownerInfo,
      bankOwned: data.bankOwned,
      investorBuyer: data.investorBuyer
    }, key: 'ownerInfo' },
    { title: 'Lot Information', data: {
      ...data.lotInfo,
      floodZone: data.floodZone,
      floodZoneDescription: data.floodZoneDescription
    }, key: 'lotInfo' },
    { title: 'Current Mortgages', data: data.currentMortgages?.[0], key: 'currentMortgages' },
    { title: 'Mortgage History', data: data.mortgageHistory?.[0], key: 'mortgageHistory' },
    { title: 'Apartment Details', data: {
      MFH2to4: data.MFH2to4,
      MFH5plus: data.MFH5plus,
      fmrEfficiency: data.demographics?.fmrEfficiency,
      fmrOneBedroom: data.demographics?.fmrOneBedroom,
      fmrTwoBedroom: data.demographics?.fmrTwoBedroom,
      fmrThreeBedroom: data.demographics?.fmrThreeBedroom,
      fmrFourBedroom: data.demographics?.fmrFourBedroom,
      fmrYear: data.demographics?.fmrYear,
      hudAreaCode: data.demographics?.hudAreaCode,
      hudAreaName: data.demographics?.hudAreaName,
      suggestedRent: data.demographics?.suggestedRent
    }, key: 'demographics' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Property Deep Dive</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {sections.map(({ title, data, key }, index) => 
            renderSection(title, data, key, index)
          )}
        </div>
      </div>
    </div>
  );
}