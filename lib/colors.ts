// MultifamilyOS - Refined Color Palette
// Based on company logo with Carvana-inspired professional approach

export const colors = {
  // Primary Brand Colors (from logo)
  primary: {
    blueDark: '#2C5282',  // Darker blue from logo - primary brand color
    blueLight: '#4A90E2', // Lighter blue from logo - secondary brand color
    orange: '#FF8C42',    // Accent orange - use for alerts, notifications, key actions
    gray: '#6B7280',      // Professional gray - primary text color
  },

  // Carvana-Inspired Neutrals (professional, clean)
  neutral: {
    50: '#F9FAFB',        // Lightest - page backgrounds
    100: '#F3F4F6',       // Light - card backgrounds  
    200: '#E5E7EB',       // Borders, dividers
    300: '#D1D5DB',       // Disabled states
    400: '#9CA3AF',       // Placeholder text
    500: '#6B7280',       // Secondary text
    600: '#4B5563',       // Primary text
    700: '#374151',       // Headings
    800: '#1F2937',       // Dark text
    900: '#111827',       // Darkest
  },

  // Semantic Colors
  success: '#10B981',     // Green for positive actions
  warning: '#F59E0B',     // Yellow for warnings
  error: '#EF4444',       // Red for errors
  info: '#3B82F6',        // Blue for info

  // Usage Guidelines:
  // - Use primary.blue for: CTAs, active states, links
  // - Use primary.orange for: notifications, important highlights, progress
  // - Use primary.gray for: body text, icons
  // - Use neutral scale for: backgrounds, borders, secondary text
  // - Keep orange usage minimal (5-10% of UI) for maximum impact
}

export const brandColors = {
  // Simplified brand palette for consistent usage
  brandPrimary: colors.primary.blueDark,    // Darker blue - main CTAs, headers
  brandSecondary: colors.primary.blueLight, // Lighter blue - secondary actions, highlights  
  accent: colors.primary.orange,
  text: colors.neutral[700],
  textSecondary: colors.neutral[500],
  background: colors.neutral[50],
  surface: colors.neutral[100],
  border: colors.neutral[200],
}