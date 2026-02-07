// Counties where MFR properties are listed as OTHER in the RealEstateAPI
const COUNTY_PROPERTY_TYPE_OVERRIDES: Record<string, string[]> = {
  "MO": ["Clay County"],
};

export function getPropertyType(state?: string, county?: string): string {
  if (state && county) {
    const counties = COUNTY_PROPERTY_TYPE_OVERRIDES[state.toUpperCase()];
    if (counties?.some(c => county.toUpperCase().includes(c.toUpperCase()))) {
      return "OTHER";
    }
  }
  return "MFR";
}
