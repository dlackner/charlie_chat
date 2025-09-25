// lib/rentalData.ts
// Utility to dynamically load rental data from CSV

interface RentalData {
  [cityState: string]: {
    monthlyRate: number;
    yoyChange: string;
  };
}

let cachedRentalData: RentalData | null = null;

export async function getRentalData(): Promise<RentalData> {
  // Return cached data if available
  if (cachedRentalData) {
    return cachedRentalData;
  }

  try {
    // Fetch the CSV file from public directory
    const response = await fetch('/Monthly Rental Rates.csv');
    if (!response.ok) {
      throw new Error('Failed to fetch rental data');
    }
    
    const csvText = await response.text();
    const lines = csvText.split('\n');
    const rentalData: RentalData = {};
    
    // Skip header row (index 0) and process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Proper CSV parsing that handles quoted values containing commas
      const columns: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          columns.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      columns.push(current.trim()); // Add the last column
      
      if (columns.length >= 8) {
        // Extract city/state (column 2), monthly average (column 5), and YoY change (column 7)
        const cityState = columns[2]?.replace(/"/g, '').trim();
        const monthlyAverage = columns[5]?.replace(/"/g, '').trim();
        const yoyChange = columns[7]?.replace(/"/g, '').trim();
        
        // Debug logging for Pittsburgh specifically (remove after testing)
        if (cityState && cityState.toLowerCase().includes('pittsburgh')) {
          console.log('Found Pittsburgh in CSV:', {
            cityState,
            monthlyAverage,
            yoyChange,
            columns: columns.slice(0, 8)
          });
        }
        
        if (cityState && monthlyAverage && !isNaN(Number(monthlyAverage))) {
          rentalData[cityState] = {
            monthlyRate: Number(monthlyAverage),
            yoyChange: yoyChange || 'N/A'
          };
        }
      }
    }
    
    // Cache the data
    cachedRentalData = rentalData;
    
    // Debug: Log total entries and check if Pittsburgh is in there (remove after testing)
    console.log('Rental data loaded:', {
      totalEntries: Object.keys(rentalData).length,
      hasPittsburgh: Object.keys(rentalData).some(k => k.toLowerCase().includes('pittsburgh')),
      pittsburghKey: Object.keys(rentalData).find(k => k.toLowerCase().includes('pittsburgh'))
    });
    
    return rentalData;
    
  } catch (error) {
    console.error('Error loading rental data:', error);
    return {};
  }
}

export function getRentalRateForCity(city: string, state: string, rentalData: RentalData): string {
  const cityState = `${city}, ${state}`;
  const rentalInfo = rentalData[cityState];
  
  // Debug logging for Pittsburgh (remove after testing)
  if (city.toLowerCase().includes('pittsburgh')) {
    console.log('Pittsburgh lookup result:', { searchKey: cityState, foundInfo: rentalInfo });
  }
  
  return rentalInfo ? `$${rentalInfo.monthlyRate.toLocaleString()}/mo` : "None available";
}

export function getYoyChangeForCity(city: string, state: string, rentalData: RentalData): string {
  const cityState = `${city}, ${state}`;
  const rentalInfo = rentalData[cityState];
  return rentalInfo ? rentalInfo.yoyChange : "N/A";
}