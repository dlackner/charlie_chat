function ToggleButton({ 
  active, 
  label, 
  color = 'gray' 
}: { 
  active: boolean; 
  label: string; 
  color?: 'blue' | 'gray'; 
}) {
  const baseClasses = "px-3 py-1 text-sm font-medium rounded transition-colors";
  const activeClasses = color === 'blue' 
    ? "bg-blue-500 text-white" 
    : "bg-gray-600 text-white";
  const inactiveClasses = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50";
  
  return (
    <button className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}>
      {label}
    </button>
  );
}

function PropertyCard() {
  const sampleProperties = [
    { 
      address: "3843 Payne Ave", 
      city: "Cleveland", 
      state: "OH", 
      zip: "44114",
      units: 43, 
      built: 1997,
      assessed: "$843,540", 
      estEquity: "$836,332",
      absenteeOwner: true,
      priceTag: null
    },
    { 
      address: "1567 Elm Street", 
      city: "Denver", 
      state: "CO", 
      zip: "80202",
      units: 24, 
      built: 2001,
      assessed: "$2,150,000", 
      estEquity: "$1,890,000",
      absenteeOwner: false,
      priceTag: "Price Drop"
    },
    { 
      address: "892 Oak Avenue", 
      city: "Austin", 
      state: "TX", 
      zip: "78701",
      units: 18, 
      built: 1995,
      assessed: "$1,650,000", 
      estEquity: "$1,420,000",
      absenteeOwner: true,
      priceTag: null
    },
    { 
      address: "4521 Cedar Lane", 
      city: "Phoenix", 
      state: "AZ", 
      zip: "85001",
      units: 36, 
      built: 1988,
      assessed: "$3,200,000", 
      estEquity: "$2,850,000",
      absenteeOwner: true,
      priceTag: "Price Drop"
    },
  ];
  
  const property = sampleProperties[Math.floor(Math.random() * sampleProperties.length)];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer">
      {/* Property Image */}
      <div className="relative">
        <div className="aspect-[4/3] bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-gray-500 text-center">
            <div className="w-12 h-12 mx-auto mb-2 bg-gray-400/30 rounded-lg flex items-center justify-center">
              <div className="w-6 h-6 bg-gray-400 rounded"></div>
            </div>
            <div className="text-sm font-medium">Property Photo</div>
          </div>
        </div>
        
        {/* Heart Favorite Button */}
        <button className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white shadow-sm transition-colors">
          <Heart className="h-4 w-4 text-gray-600 hover:text-red-500" />
        </button>
        
        {/* Price Tag */}
        {property.priceTag && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
              {property.priceTag}
            </span>
          </div>
        )}
      </div>

      {/* Property Details */}
      <div className="p-4">
        {/* Address */}
        <h3 className="font-semibold text-gray-900 mb-1 truncate">
          {property.address}
        </h3>
        
        {/* Location and Basic Info */}
        <p className="text-sm text-gray-600 mb-3">
          {property.city}, {property.state} • {property.units} Units • Built {property.built}
        </p>

        {/* Price */}
        <div className="mb-3">
          <div className="text-xl font-bold text-gray-900">
            {property.assessed}
          </div>
          <div className="text-sm text-gray-600">
            Est. Equity: <span className="font-medium text-green-600">{property.estEquity}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {property.absenteeOwner && (
            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
              Absentee Owner
            </span>
          )}
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {property.units} Units
          </span>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <span className="text-xs text-gray-500">Select</span>
          </div>
          <button 
            onClick={() => window.location.href = `/discover/property/${Math.floor(Math.random() * 1000)}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}