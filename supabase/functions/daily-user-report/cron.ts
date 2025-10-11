// Cron job to run daily report at 8:00 AM ET
// This will be configured in Supabase dashboard as a scheduled function

// Cron expression: "0 13 * * *" (8AM ET = 1PM UTC during standard time, 12PM UTC during daylight time)
// Note: You'll need to adjust for daylight saving time changes

export const cronSchedule = {
  // Run at 8:00 AM Eastern Time (adjust for DST)
  schedule: "0 13 * * *", // 1PM UTC = 8AM EST
  // For EDT (daylight time): "0 12 * * *" // 12PM UTC = 8AM EDT
  
  timezone: "America/New_York"
}