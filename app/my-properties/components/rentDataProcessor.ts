// rentDataProcessor.ts

interface RawRentData {
    RegionID: number;
    SizeRank: number;
    'City/State': string;
    Lat: number;
    Long: number;
    'Monthly Average': number;
    Radius: number;
    'YOY %': string;
}

export interface ProcessedRentData {
    RegionName: string;
    StateName: string;
    averageRent: number;
    latitude?: number;
    longitude?: number;
    sizeRank: number;
    radius?: number;
    yoyPercent?: number | string; // Allow both number and string
}

interface RentStatistics {
    min: number;
    max: number;
    avg: number;
    median: number;
    quintileBreakpoints: {
        p20: number;
        p40: number;
        p60: number;
        p80: number;
    };
}

export class RentDataProcessor {
    private rawData: RawRentData[] = [];

    constructor(csvData: string) {
        this.parseCSV(csvData);
    }

    private parseCSV(csvData: string): void {
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').replace(/\r/g, ''));


        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;

            const values = this.parseCSVLine(line);
            if (values.length < 3) continue; // Need at least a few columns

            const row: any = {};
            headers.forEach((header, index) => {
                const rawValue = values[index] || '';
                const cleanValue = rawValue.replace(/"/g, '').replace(/\r/g, '').trim();

                if (header === 'Monthly Average' || header === 'Radius' || header === 'Lat' || header === 'Long') {
                    row[header] = parseFloat(cleanValue) || 0;
                } else if (header === 'RegionID' || header === 'SizeRank') {
                    row[header] = parseInt(cleanValue) || 0;
                } else if (header === 'YOY %') {
                    // Parse YOY % as float, removing any % symbol
                    row[header] = parseFloat(cleanValue.replace('%', '')) || 0;
                } else {
                    row[header] = cleanValue;
                }
            });

            // Debug first few rows (debug logging removed)

            this.rawData.push(row as RawRentData);
        }
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    }

    public processRentData(): ProcessedRentData[] {

        const processed = this.rawData
            .filter(row => row['City/State'] && row['City/State'] !== 'United States') // Filter out country-level data
            .filter(row => row['Monthly Average'] && row['Monthly Average'] > 0)
            .filter(row => row.Lat && row.Long) // Must have coordinates
            .map(row => {
                return {
                    RegionName: row['City/State'],
                    StateName: row['City/State']?.split(', ')[1] || '', // Extract state from "City, ST" format
                    averageRent: row['Monthly Average'],
                    latitude: row.Lat,
                    longitude: row.Long,
                    sizeRank: row.SizeRank,
                    radius: row.Radius || 25,
                    yoyPercent: row['YOY %'] || 0
                };
            })
            .sort((a, b) => a.sizeRank - b.sizeRank);


        return processed;
    }

    public getRentByLocation(lat: number, lng: number, maxDistance?: number): ProcessedRentData | null {
        const processedData = this.processRentData();

        let closestMetro: ProcessedRentData | null = null;
        let minDistance = Infinity;

        processedData.forEach(metro => {
            if (!metro.latitude || !metro.longitude) return;

            const distance = this.calculateDistance(lat, lng, metro.latitude, metro.longitude);
            const searchRadius = maxDistance || metro.radius || 25;

            if (distance < minDistance && distance <= searchRadius) {
                minDistance = distance;
                closestMetro = metro;
            }
        });

        return closestMetro;
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private calculatePercentile(sortedArray: number[], percentile: number): number {
        const index = (percentile / 100) * (sortedArray.length - 1);
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
        return Math.round(sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight);
    }

    public getRentStatistics(): RentStatistics {
        const rents = this.processRentData().map(d => d.averageRent);
        const sorted = rents.sort((a, b) => a - b);

        return {
            min: Math.min(...rents),
            max: Math.max(...rents),
            avg: rents.reduce((a, b) => a + b, 0) / rents.length,
            median: sorted[Math.floor(sorted.length / 2)],
            quintileBreakpoints: {
                p20: this.calculatePercentile(sorted, 20),
                p40: this.calculatePercentile(sorted, 40),
                p60: this.calculatePercentile(sorted, 60),
                p80: this.calculatePercentile(sorted, 80)
            }
        };
    }

    public getTopMarkets(limit: number = 50): ProcessedRentData[] {
        return this.processRentData()
            .filter(metro => metro.latitude && metro.longitude)
            .slice(0, limit);
    }
}

// Helper function to get rent color based on fixed market-based quintiles
export function getRentColorQuintiles(rent: number): string {
    if (rent < 1000) return '#10B981';      // Green - Very Low Cost (Under $1,000)
    if (rent < 1400) return '#0EA5E9';      // Light Blue - Low Cost ($1,000-$1,399)
    if (rent < 1800) return '#6B7280';      // Gray - Moderate Cost ($1,400-$1,799)
    if (rent < 2400) return '#F97316';      // Orange - High Cost ($1,800-$2,399)
    return '#DC2626';                       // Darker Red - Very High Cost ($2,400+)
}

// Helper function to get quintile label for a rent value
export function getQuintileLabel(rent: number): string {
    if (rent < 1000) return "Q1: Very Low Cost (Under $1,000)";
    if (rent < 1400) return "Q2: Low Cost ($1,000-$1,399)";
    if (rent < 1800) return "Q3: Moderate Cost ($1,400-$1,799)";
    if (rent < 2400) return "Q4: High Cost ($1,800-$2,399)";
    return "Q5: Very High Cost ($2,400+)";
}