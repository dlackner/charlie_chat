/*
 * CHARLIE2 V2 - Access Control System
 * Centralized permission management based on user_class
 * Controls menu items and page access throughout V2 application
 * Part of the new V2 application architecture
 */

// V2 User Classes
export type UserClass = 
  | 'trial' 
  | 'core' 
  | 'plus' 
  | 'pro' 
  | 'cohort'
  | 'admin'
  | null;

// Available features/pages in V2
export type Feature = 
  | 'dashboard'
  | 'dashboard_headlines'
  | 'dashboard_community'
  | 'dashboard_metrics' 
  | 'dashboard_pipeline'
  | 'dashboard_onboarding'
  | 'discover'
  | 'discover_buybox'
  | 'discover_saved'
  | 'discover_saved_searches'
  | 'discover_property_details'
  | 'discover_favorite_properties'
  | 'discover_investment_analysis'
  | 'engage'
  | 'engage_templates'
  | 'ai_coach'
  | 'ai_coach_attachments'
  | 'ai_coach_threads'
  | 'fund_browse'
  | 'fund_create'
  | 'pricing'
  | 'account'
  | 'property_analyzer'
  | 'admin_tools';

// Permission configuration for each user class
const PERMISSIONS: Record<Exclude<UserClass, null>, Feature[]> = {
  // Active trial users - full access including engage but no fund_create
  trial: [
    'dashboard',
    'dashboard_headlines',
    'dashboard_community',
    'dashboard_metrics',
    'dashboard_pipeline', 
    'dashboard_onboarding',
    'discover',
    'discover_buybox',
    'discover_saved',
    'discover_saved_searches',
    'discover_property_details',
    'discover_favorite_properties',
    'discover_investment_analysis',
    'engage',
    'engage_templates',
    'ai_coach',
    'ai_coach_attachments',
    'ai_coach_threads',
    'fund_browse',
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Core plan - basic access (legacy charlie_chat users)
  core: [
    'dashboard',
    'dashboard_community',
    'dashboard_onboarding',
    'discover',
    'discover_saved',
    'discover_property_details',
    'ai_coach',
    'fund_browse',
    'pricing',
    'account'
  ],

  // Plus plan - adds more dashboard and engage features
  plus: [
    'dashboard',
    'dashboard_headlines',
    'dashboard_community', 
    'dashboard_metrics',
    'dashboard_pipeline',
    'dashboard_onboarding',
    'discover',
    'discover_buybox',
    'discover_saved',
    'discover_saved_searches',
    'discover_property_details',
    'discover_favorite_properties',
    'discover_investment_analysis', 
    'engage',
    'engage_templates',
    'ai_coach',
    'ai_coach_attachments',
    'ai_coach_threads',
    'fund_browse',
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Pro plan - full access
  pro: [
    'dashboard',
    'dashboard_headlines',
    'dashboard_community',
    'dashboard_metrics', 
    'dashboard_pipeline',
    'dashboard_onboarding',
    'discover',
    'discover_buybox', 
    'discover_saved',
    'discover_saved_searches',
    'discover_property_details',
    'discover_favorite_properties',
    'discover_investment_analysis',
    'engage',
    'engage_templates', 
    'ai_coach',
    'ai_coach_attachments',
    'ai_coach_threads',
    'fund_browse',
    'fund_create',
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Cohort users - full access like pro
  cohort: [
    'dashboard',
    'dashboard_headlines',
    'dashboard_community',
    'dashboard_metrics',
    'dashboard_pipeline', 
    'dashboard_onboarding',
    'discover',
    'discover_buybox',
    'discover_saved',
    'discover_saved_searches',
    'discover_property_details',
    'discover_favorite_properties',
    'discover_investment_analysis',
    'engage',
    'engage_templates',
    'ai_coach',
    'ai_coach_attachments',
    'ai_coach_threads', 
    'fund_browse',
    'fund_create',
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Admin users - full access plus admin-specific tools
  admin: [
    'dashboard',
    'dashboard_headlines',
    'dashboard_community',
    'dashboard_metrics',
    'dashboard_pipeline', 
    'dashboard_onboarding',
    'discover',
    'discover_buybox',
    'discover_saved',
    'discover_saved_searches',
    'discover_property_details',
    'discover_favorite_properties',
    'discover_investment_analysis',
    'engage',
    'engage_templates',
    'ai_coach',
    'ai_coach_attachments',
    'ai_coach_threads', 
    'fund_browse',
    'fund_create',
    'pricing',
    'account',
    'property_analyzer',
    'admin_tools'
  ]
};

/**
 * Check if a user class has access to a specific feature
 */
export function hasAccess(userClass: UserClass, feature: Feature): boolean {
  if (!userClass) return false;
  
  const permissions = PERMISSIONS[userClass];
  return permissions ? permissions.includes(feature) : false;
}

/**
 * Get all features a user class has access to
 */
export function getAllowedFeatures(userClass: UserClass): Feature[] {
  if (!userClass) return ['pricing']; // Unauth users can only see pricing
  
  return PERMISSIONS[userClass] || [];
}

/**
 * Check if user class can access any dashboard features
 */
export function canAccessDashboard(userClass: UserClass): boolean {
  return hasAccess(userClass, 'dashboard') || 
         hasAccess(userClass, 'dashboard_headlines') ||
         hasAccess(userClass, 'dashboard_community') ||
         hasAccess(userClass, 'dashboard_metrics') ||
         hasAccess(userClass, 'dashboard_pipeline') ||
         hasAccess(userClass, 'dashboard_onboarding');
}

/**
 * Check if user class can access any discover features  
 */
export function canAccessDiscover(userClass: UserClass): boolean {
  return hasAccess(userClass, 'discover');
}

/**
 * Check if user class can access any engage features
 */
export function canAccessEngage(userClass: UserClass): boolean {
  return hasAccess(userClass, 'engage');
}

/**
 * Check if user is on active trial
 */
export function isTrial(userClass: UserClass): boolean {
  return userClass === 'trial';
}

/**
 * Check if user has premium features (plus/pro/cohort)
 */
export function hasPremiumAccess(userClass: UserClass): boolean {
  return userClass === 'plus' || userClass === 'pro' || userClass === 'cohort' || userClass === 'admin';
}

/**
 * Check if user is an admin
 */
export function isAdmin(userClass: UserClass): boolean {
  return userClass === 'admin';
}

/**
 * Get user class display name
 */
export function getUserClassDisplayName(userClass: UserClass): string {
  const displayNames: Record<Exclude<UserClass, null>, string> = {
    trial: 'Trial',
    core: 'Core',
    plus: 'Plus',
    pro: 'Pro',
    cohort: 'Cohort',
    admin: 'Admin'
  };
  
  return userClass ? displayNames[userClass] : 'Guest';
}