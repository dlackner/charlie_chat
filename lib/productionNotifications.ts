// Production Mode Notifications
// Handles user notifications when markets transition to Production status

import { SupabaseClient } from '@supabase/supabase-js';

interface ProductionTransitionNotification {
    userId: string;
    marketKey: string;
    marketName: string;
    learnedPreferences: any;
    transitionDate: string;
}

export const sendProductionTransitionNotification = async (
    supabase: SupabaseClient, 
    notification: ProductionTransitionNotification
): Promise<boolean> => {
    try {
        const { userId, marketKey, marketName, learnedPreferences } = notification;
        
        // Create a user notification in the database
        const notificationMessage = createProductionMessage(marketName, learnedPreferences);
        
        const { error } = await supabase
            .from('user_notifications')
            .insert({
                user_id: userId,
                notification_type: 'market_production_transition',
                title: `${marketName} Market Preferences Learned!`,
                message: notificationMessage,
                metadata: {
                    marketKey,
                    marketName,
                    learnedPreferences: learnedPreferences,
                    transitionType: 'mastery_to_production'
                },
                is_read: false,
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error creating production transition notification:', error);
            return false;
        }

        console.log(`📢 Production transition notification sent for ${marketName} (${marketKey})`);
        return true;
    } catch (error) {
        console.error('Error sending production transition notification:', error);
        return false;
    }
};

const createProductionMessage = (marketName: string, learnedPreferences: any): string => {
    let message = `🎯 Great news! Your ${marketName} market has graduated to Production mode.\n\n`;
    
    message += "**What this means:**\n";
    message += "• Your property preferences have been learned from your decisions\n";
    message += "• Future recommendations will be precisely tailored to your preferences\n";
    message += "• You'll see properties that closely match what you've liked before\n\n";
    
    if (learnedPreferences?.geographic) {
        const radius = learnedPreferences.geographic.radiusMiles;
        message += `**Geographic Preference:** Properties within ${radius.toFixed(1)} miles of your preferred area\n`;
    }
    
    if (learnedPreferences?.characteristics) {
        message += "**Property Characteristics Learned:**\n";
        
        if (learnedPreferences.characteristics.units_count) {
            const units = learnedPreferences.characteristics.units_count;
            message += `• Units: ${Math.floor(units.min)}-${Math.ceil(units.max)} units\n`;
        }
        
        if (learnedPreferences.characteristics.year_built) {
            const years = learnedPreferences.characteristics.year_built;
            message += `• Year Built: ${Math.floor(years.min)}-${Math.ceil(years.max)}\n`;
        }
        
        if (learnedPreferences.characteristics.assessed_value) {
            const values = learnedPreferences.characteristics.assessed_value;
            message += `• Assessed Value: $${Math.floor(values.min).toLocaleString()}-$${Math.ceil(values.max).toLocaleString()}\n`;
        }
    }
    
    if (learnedPreferences?.booleanPrefs) {
        message += "\n**Special Preferences:**\n";
        Object.entries(learnedPreferences.booleanPrefs).forEach(([key, pref]: [string, any]) => {
            const prefName = formatBooleanPrefName(key);
            const preference = pref.preferred ? "Preferred" : "Avoided";
            message += `• ${prefName}: ${preference}\n`;
        });
    }
    
    message += `\n**Confidence Level:** ${Math.floor((learnedPreferences?.confidence || 0) * 100)}% based on ${learnedPreferences?.totalFavorites || 0} favorites`;
    
    return message;
};

const formatBooleanPrefName = (key: string): string => {
    const nameMap: { [key: string]: string } = {
        'out_of_state_absentee_owner': 'Out-of-State Owners',
        'reo': 'REO Properties',
        'tax_lien': 'Tax Lien Properties', 
        'auction': 'Auction Properties',
        'pre_foreclosure': 'Pre-Foreclosure Properties'
    };
    
    return nameMap[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Check if user_notifications table exists, create it if not
export const ensureNotificationsTable = async (supabase: SupabaseClient): Promise<boolean> => {
    try {
        // Try to query the table to see if it exists
        const { error } = await supabase
            .from('user_notifications')
            .select('id')
            .limit(1);

        if (error && error.message.includes('does not exist')) {
            console.log('user_notifications table does not exist - would need to create it');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking notifications table:', error);
        return false;
    }
};