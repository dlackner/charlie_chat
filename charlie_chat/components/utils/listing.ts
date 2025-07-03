// components/utils/listing.ts

import type { Listing } from '../ui/sidebar';

/**
 * Filters a listing object to include only relevant fields for analysis
 * Removes unnecessary data and organizes fields by category
 */
export const filterRelevantFields = (listing: Listing) => {
  return {
    id: listing.id,
    address: listing.address,

    // Property basics
    property_type: listing.property_type,
    unitsCount: listing.unitsCount,
    yearBuilt: listing.yearBuilt,
    squareFeet: listing.squareFeet,
    lotSquareFeet: listing.lotSquareFeet,
    stories: listing.stories,

    // Financial data
    estimatedValue: listing.estimatedValue,
    assessedValue: listing.assessedValue,
    lastSaleAmount: listing.lastSaleAmount,
    lastSaleDate: listing.lastSaleDate,
    rentEstimate: listing.rentEstimate,

    // Owner & financing
    mortgageBalance: listing.mortgageBalance,
    estimatedEquity: listing.estimatedEquity,
    lenderName: listing.lenderName,
    mortgageMaturingDate: listing.mortgageMaturingDate,
    privateLender: listing.privateLender,

    // Owner profile
    owner1FirstName: listing.owner1FirstName,
    owner1LastName: listing.owner1LastName,
    mailAddress: listing.mailAddress,
    yearsOwned: listing.yearsOwned,
    ownerOccupied: listing.ownerOccupied,
    corporate_owned: listing.corporate_owned,
    totalPropertiesOwned: listing.totalPropertiesOwned,
    totalPortfolioEquity: listing.totalPortfolioEquity,

    // Distress indicators
    preForeclosure: listing.preForeclosure,
    foreclosure: listing.foreclosure,
    reo: listing.reo,
    auction: listing.auction,
    taxLien: listing.taxLien,

    // Market indicators
    mlsActive: listing.mlsActive,
    forSale: listing.forSale,
    floodZone: listing.floodZone,
    lastSaleArmsLength: listing.lastSaleArmsLength,
    investorBuyer: listing.investorBuyer,
    assumable: listing.assumable
  };
};