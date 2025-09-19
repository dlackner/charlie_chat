/*
 * CHARLIE2 V2 - Access Control System
 * Centralized permission management based on user_class
 * Controls menu items and page access throughout V2 application
 * Part of the new V2 application architecture
 */

// V2 User Classes (including legacy mappings)
export type UserClass = 
  | 'trial' 
  | 'core' 
  | 'plus' 
  | 'pro' 
  | 'cohort'
  // Legacy user classes that map to new ones
  | 'charlie_chat'        // Legacy -> maps to 'core'
  | 'charlie_chat_plus'   // Legacy -> maps to 'plus' 
  | 'charlie_chat_pro'    // Legacy -> maps to 'pro'
  | null;

// Available features/pages in V2
export type Feature = 
  | 'dashboard'
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
  | 'pricing'
  | 'account'
  | 'property_analyzer';

// Permission configuration for each user class
const PERMISSIONS: Record<Exclude<UserClass, null>, Feature[]> = {
  // Active trial users - full access except engage
  trial: [
    'dashboard',
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
    'ai_coach',
    'ai_coach_attachments',
    'ai_coach_threads',
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Core plan - basic access (legacy charlie_chat users)
  core: [
    'dashboard',
    'dashboard_community',
    'dashboard_metrics',
    'dashboard_pipeline',
    'dashboard_onboarding',
    'discover',
    'discover_buybox',
    'discover_saved',
    'discover_property_details',
    'ai_coach',
    'ai_coach_attachments',
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Plus plan - adds more dashboard and engage features
  plus: [
    'dashboard',
    'dashboard_community', 
    'dashboard_metrics',
    'dashboard_pipeline',
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
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Pro plan - full access
  pro: [
    'dashboard',
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
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Cohort users - full access like pro
  cohort: [
    'dashboard',
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
    'pricing',
    'account',
    'property_analyzer'
  ],

  // Legacy user classes - mapped to their new equivalents
  charlie_chat: [
    'dashboard',
    'dashboard_community',
    'dashboard_metrics',
    'dashboard_pipeline',
    'dashboard_onboarding',
    'discover',
    'discover_buybox',
    'discover_property_details',
    'ai_coach',
    'pricing',
    'account',
    'property_analyzer'
  ],

  charlie_chat_plus: [
    'dashboard',
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
    'pricing',
    'account',
    'property_analyzer'
  ],

  charlie_chat_pro: [
    'dashboard',
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
    'pricing',
    'account',
    'property_analyzer'
  ]
};

/**
 * Normalize legacy user classes to new V2 classes
 */
function normalizeUserClass(userClass: UserClass): Exclude<UserClass, null> | null {
  if (!userClass) return null;
  
  // Map legacy classes to new ones
  switch (userClass) {
    case 'charlie_chat':
      return 'core';
    case 'charlie_chat_plus':
      return 'plus';
    case 'charlie_chat_pro':
      return 'pro';
    // Already normalized classes pass through
    case 'trial':
    case 'core':
    case 'plus':
    case 'pro':
    case 'cohort':
      return userClass;
    default:
      return null;
  }
}

/**
 * Check if a user class has access to a specific feature
 */
export function hasAccess(userClass: UserClass, feature: Feature): boolean {
  const normalizedClass = normalizeUserClass(userClass);
  if (!normalizedClass) return false;
  
  const permissions = PERMISSIONS[normalizedClass];
  return permissions ? permissions.includes(feature) : false;
}

/**
 * Get all features a user class has access to
 */
export function getAllowedFeatures(userClass: UserClass): Feature[] {
  const normalizedClass = normalizeUserClass(userClass);
  if (!normalizedClass) return ['pricing']; // Unauth users can only see pricing
  
  return PERMISSIONS[normalizedClass] || [];
}

/**
 * Check if user class can access any dashboard features
 */
export function canAccessDashboard(userClass: UserClass): boolean {
  return hasAccess(userClass, 'dashboard') || 
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
  const normalizedClass = normalizeUserClass(userClass);
  return normalizedClass === 'trial';
}

/**
 * Check if user has premium features (plus/pro/cohort)
 */
export function hasPremiumAccess(userClass: UserClass): boolean {
  const normalizedClass = normalizeUserClass(userClass);
  return normalizedClass === 'plus' || normalizedClass === 'pro' || normalizedClass === 'cohort';
}

/**
 * Get user class display name
 */
export function getUserClassDisplayName(userClass: UserClass): string {
  const normalizedClass = normalizeUserClass(userClass);
  const displayNames: Record<Exclude<UserClass, null>, string> = {
    trial: 'Trial',
    core: 'Core',
    plus: 'Plus',
    pro: 'Pro',
    cohort: 'Cohort',
    // Legacy classes (though these should be normalized, keeping for safety)
    charlie_chat: 'Core',
    charlie_chat_plus: 'Plus', 
    charlie_chat_pro: 'Pro'
  };
  
  return normalizedClass ? displayNames[normalizedClass] : 'Guest';
}