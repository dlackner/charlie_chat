// Market convergence analysis utility
// Used in BuyBoxModal and after weekly recommendations completion

import { SupabaseClient } from '@supabase/supabase-js';

// Calculate distance between two lat/lng points using Haversine formula
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in miles
};

// Cluster properties by geographic proximity
const clusterByDistance = (properties: any[], maxDistanceMiles: number) => {
    const clusters: any[][] = [];
    const used = new Set();
    
    properties.forEach((prop, i) => {
        if (used.has(i) || !prop.latitude || !prop.longitude) return;
        
        const cluster = [prop];
        used.add(i);
        
        // Find nearby properties
        properties.forEach((otherProp, j) => {
            if (i !== j && !used.has(j) && otherProp.latitude && otherProp.longitude) {
                const distance = calculateDistance(
                    prop.latitude, prop.longitude,
                    otherProp.latitude, otherProp.longitude
                );
                if (distance <= maxDistanceMiles) {
                    cluster.push(otherProp);
                    used.add(j);
                }
            }
        });
        
        clusters.push(cluster);
    });
    
    return clusters;
};

const calculateMarketConvergence = (decisions: any[]): number => {
    if (decisions.length < 5) return 0.1; // Need minimum decisions for statistical significance
    
    const favorites = decisions.filter(d => d.decision === 'favorite');
    const notInterested = decisions.filter(d => d.decision === 'not_interested');
    
    if (favorites.length < 2 || notInterested.length < 2) {
        return 0.15; // Need contrast in preferences
    }

    let confidenceScores: number[] = [];

    // 1. GEOGRAPHIC CLUSTERING ANALYSIS
    const favoritesWithCoords = favorites.filter(f => 
        f.property_characteristics?.latitude && f.property_characteristics?.longitude
    );
    const rejectsWithCoords = notInterested.filter(r => 
        r.property_characteristics?.latitude && r.property_characteristics?.longitude
    );

    if (favoritesWithCoords.length >= 2 && rejectsWithCoords.length >= 2) {
        // Cluster favorites and rejects by proximity (within 2 miles)
        const favoriteClusters = clusterByDistance(favoritesWithCoords, 2);
        const rejectClusters = clusterByDistance(rejectsWithCoords, 2);
        
        // Strong clusters = tight geographic preferences
        const avgFavoriteClusterSize = favoriteClusters.reduce((sum, c) => sum + c.length, 0) / favoriteClusters.length;
        const avgRejectClusterSize = rejectClusters.reduce((sum, c) => sum + c.length, 0) / rejectClusters.length;
        
        // Geographic clustering strength (0-1)
        const clusteringScore = Math.min(
            (avgFavoriteClusterSize + avgRejectClusterSize) / 6, 1
        );
        
        // Measure separation between favorite and reject clusters
        let minSeparation = Infinity;
        favoriteClusters.forEach(favCluster => {
            rejectClusters.forEach(rejectCluster => {
                favCluster.forEach(favProp => {
                    rejectCluster.forEach(rejectProp => {
                        const distance = calculateDistance(
                            favProp.latitude, favProp.longitude,
                            rejectProp.latitude, rejectProp.longitude
                        );
                        minSeparation = Math.min(minSeparation, distance);
                    });
                });
            });
        });
        
        // Good separation = distinct geographic preferences
        const separationScore = minSeparation === Infinity ? 0 : Math.min(minSeparation / 5, 1);
        
        const geographicScore = (clusteringScore + separationScore) / 2;
        confidenceScores.push(geographicScore);
        
        console.log(`Geographic analysis: clustering=${clusteringScore.toFixed(2)}, separation=${separationScore.toFixed(2)}, score=${geographicScore.toFixed(2)}`);
    }

    // 2. PROPERTY CHARACTERISTICS CONSISTENCY
    const characteristics = ['units_count', 'year_built', 'assessed_value', 'estimated_value'];
    characteristics.forEach(char => {
        const favValues = favorites.map(f => f.property_characteristics?.[char]).filter(v => v != null);
        const rejectValues = notInterested.map(r => r.property_characteristics?.[char]).filter(v => v != null);
        
        if (favValues.length >= 2 && rejectValues.length >= 2) {
            const favAvg = favValues.reduce((a, b) => a + b, 0) / favValues.length;
            const rejectAvg = rejectValues.reduce((a, b) => a + b, 0) / rejectValues.length;
            const difference = Math.abs(favAvg - rejectAvg);
            
            // Calculate standard deviations for consistency measure
            const favStd = Math.sqrt(favValues.reduce((sum, v) => sum + Math.pow(v - favAvg, 2), 0) / favValues.length);
            const rejectStd = Math.sqrt(rejectValues.reduce((sum, v) => sum + Math.pow(v - rejectAvg, 2), 0) / rejectValues.length);
            
            // Strong preferences = clear separation + low variance within groups
            if (char.includes('value')) {
                const separation = difference / Math.max(favAvg, rejectAvg);
                const consistency = 1 - (favStd + rejectStd) / (favAvg + rejectAvg);
                confidenceScores.push(Math.min((separation + Math.max(consistency, 0)) / 2, 1));
            } else if (char === 'units_count') {
                const separation = difference / Math.max(favAvg, rejectAvg, 1);
                confidenceScores.push(Math.min(separation, 1));
            } else if (char === 'year_built') {
                const decadeDiff = Math.abs(Math.floor(favAvg / 10) - Math.floor(rejectAvg / 10));
                confidenceScores.push(Math.min(decadeDiff / 4, 1));
            }
        }
    });

    if (confidenceScores.length === 0) return 0.2;

    // 3. PREDICTION ACCURACY TEST (cross-validation simulation)
    // Take random 80% of decisions, see if patterns predict remaining 20%
    const shuffled = [...decisions].sort(() => Math.random() - 0.5);
    const trainSet = shuffled.slice(0, Math.floor(shuffled.length * 0.8));
    const testSet = shuffled.slice(Math.floor(shuffled.length * 0.8));
    
    if (testSet.length >= 2) {
        const trainFavorites = trainSet.filter(d => d.decision === 'favorite');
        const trainRejects = trainSet.filter(d => d.decision === 'not_interested');
        
        if (trainFavorites.length > 0 && trainRejects.length > 0) {
            // Simple prediction: if property is closer to favorite patterns vs reject patterns
            let correctPredictions = 0;
            testSet.forEach(testDecision => {
                // Geographic prediction
                if (testDecision.property_characteristics?.latitude && favoritesWithCoords.length > 0) {
                    const avgDistanceToFavorites = favoritesWithCoords.reduce((sum, fav) => 
                        sum + calculateDistance(
                            testDecision.property_characteristics.latitude,
                            testDecision.property_characteristics.longitude,
                            fav.latitude, fav.longitude
                        ), 0) / favoritesWithCoords.length;
                        
                    const avgDistanceToRejects = rejectsWithCoords.length > 0 ? 
                        rejectsWithCoords.reduce((sum, rej) => 
                            sum + calculateDistance(
                                testDecision.property_characteristics.latitude,
                                testDecision.property_characteristics.longitude,
                                rej.latitude, rej.longitude
                            ), 0) / rejectsWithCoords.length : Infinity;
                    
                    const prediction = avgDistanceToFavorites < avgDistanceToRejects ? 'favorite' : 'not_interested';
                    if (prediction === testDecision.decision) correctPredictions++;
                }
            });
            
            const predictionAccuracy = testSet.length > 0 ? correctPredictions / testSet.length : 0;
            confidenceScores.push(predictionAccuracy);
        }
    }

    // Final confidence is weighted average of all measures
    const finalConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;
    
    console.log(`Convergence analysis: ${confidenceScores.length} measures, avg=${finalConfidence.toFixed(3)} (${decisions.length} decisions)`);
    
    return Math.min(finalConfidence, 1.0);
};

const calculateLearnedPreferences = (decisions: any[], marketKey: string): any => {
    const favorites = decisions.filter(d => d.decision === 'favorite');
    const notInterested = decisions.filter(d => d.decision === 'not_interested');
    
    if (favorites.length < 2) {
        return null; // Need at least 2 favorites to establish preferences
    }

    // Calculate geographic center and radius for favorite properties
    const favoritesWithCoords = favorites.filter(f => 
        f.property_characteristics?.latitude && f.property_characteristics?.longitude
    );
    
    let geographicPreferences = null;
    if (favoritesWithCoords.length >= 2) {
        // Calculate centroid of favorite properties
        const totalLat = favoritesWithCoords.reduce((sum, f) => sum + f.property_characteristics.latitude, 0);
        const totalLng = favoritesWithCoords.reduce((sum, f) => sum + f.property_characteristics.longitude, 0);
        const centerLat = totalLat / favoritesWithCoords.length;
        const centerLng = totalLng / favoritesWithCoords.length;
        
        // Calculate average distance from center (for radius)
        const distances = favoritesWithCoords.map(f => 
            calculateDistance(centerLat, centerLng, 
                            f.property_characteristics.latitude, 
                            f.property_characteristics.longitude)
        );
        const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
        const maxDistance = Math.max(...distances);
        
        // Set radius with some padding, between 0.1 and 10 miles
        const radius = Math.min(Math.max(avgDistance * 1.2, 0.1), 10);
        
        geographicPreferences = {
            centerLat,
            centerLng,
            radiusMiles: radius,
            maxDistance
        };
    }
    
    // Calculate property characteristic preferences
    const characteristicPreferences: any = {};
    const characteristics = ['units_count', 'year_built', 'assessed_value', 'estimated_value'];
    
    characteristics.forEach(char => {
        const favValues = favorites.map(f => f.property_characteristics?.[char]).filter(v => v != null);
        const rejectValues = notInterested.map(r => r.property_characteristics?.[char]).filter(v => v != null);
        
        if (favValues.length >= 2) {
            const sorted = [...favValues].sort((a, b) => a - b);
            const min = sorted[0];
            const max = sorted[sorted.length - 1];
            const avg = favValues.reduce((a, b) => a + b, 0) / favValues.length;
            
            // Calculate preferred range with some tolerance
            const range = max - min;
            const tolerance = Math.max(range * 0.2, range === 0 ? avg * 0.1 : 0);
            
            characteristicPreferences[char] = {
                min: Math.max(0, min - tolerance),
                max: max + tolerance,
                preferred: avg,
                samples: favValues.length
            };
        }
    });
    
    // Boolean characteristics (out_of_state_absentee_owner, etc.)
    const booleanPrefs: any = {};
    const booleanChars = ['out_of_state_absentee_owner', 'reo', 'auction', 'pre_foreclosure'];
    
    booleanChars.forEach(char => {
        const favTrue = favorites.filter(f => f.property_characteristics?.[char] === true).length;
        const favFalse = favorites.filter(f => f.property_characteristics?.[char] === false).length;
        const total = favTrue + favFalse;
        
        if (total >= 3) { // Need at least 3 samples
            const preference = favTrue / total;
            if (preference > 0.7 || preference < 0.3) { // Strong preference either way
                booleanPrefs[char] = {
                    preferred: preference > 0.5,
                    confidence: Math.abs(preference - 0.5) * 2,
                    samples: total
                };
            }
        }
    });
    
    return {
        marketKey,
        createdAt: new Date().toISOString(),
        geographic: geographicPreferences,
        characteristics: characteristicPreferences,
        booleanPrefs,
        totalFavorites: favorites.length,
        totalRejected: notInterested.length,
        confidence: Math.min(favorites.length / 10, 1) // Higher confidence with more samples
    };
};

const getMarketName = async (supabase: SupabaseClient, userId: string, marketKey: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('user_markets')
            .select('market_name, city, state')
            .eq('user_id', userId)
            .eq('market_key', marketKey)
            .single();
            
        if (error || !data) {
            return null;
        }
        
        return data.market_name || `${data.city}, ${data.state}` || marketKey;
    } catch (error) {
        console.error('Error getting market name:', error);
        return null;
    }
};

export const updateMarketConvergence = async (userId: string, supabase: SupabaseClient): Promise<{ [marketKey: string]: { phase: 'discovery' | 'learning' | 'mastery' | 'production'; progress: number } }> => {
    try {
        console.log('🔄 Updating market convergence after weekly recommendations...');
        
        // Get all user decisions from user_property_decisions table
        const { data: decisions, error } = await supabase
            .from('user_property_decisions')
            .select(`
                decision,
                market_key,
                property_characteristics
            `)
            .eq('user_id', userId);

        if (error) {
            console.error('Error fetching user decisions for convergence:', error);
            return {};
        }

        if (!decisions || decisions.length === 0) {
            console.log('No decisions found for convergence analysis');
            return {};
        }

        // Group decisions by market
        const marketDecisions: { [key: string]: any[] } = {};
        decisions.forEach(decision => {
            if (decision.market_key) {
                if (!marketDecisions[decision.market_key]) {
                    marketDecisions[decision.market_key] = [];
                }
                marketDecisions[decision.market_key].push(decision);
            }
        });

        // Get current market states from user_markets table
        const { data: marketStates, error: marketStatesError } = await supabase
            .from('user_markets')
            .select('market_key, learning_phase, mastery_achieved_date')
            .eq('user_id', userId);

        const currentStates: { [key: string]: { phase?: string; masteryDate?: string } } = {};
        if (marketStates) {
            marketStates.forEach(market => {
                currentStates[market.market_key] = {
                    phase: market.learning_phase,
                    masteryDate: market.mastery_achieved_date
                };
            });
        }

        // Calculate convergence for each market
        const convergenceData: { [marketKey: string]: { phase: 'discovery' | 'learning' | 'mastery' | 'production'; progress: number } } = {};
        const marketUpdates: Array<{ marketKey: string; updates: any }> = [];
        
        Object.entries(marketDecisions).forEach(([marketKey, marketDecisionList]) => {
            const convergenceScore = calculateMarketConvergence(marketDecisionList);
            const currentState = currentStates[marketKey];
            
            let phase: 'discovery' | 'learning' | 'mastery' | 'production' = 'discovery';
            let progress = 1;
            const updates: any = {};

            // Statistical confidence thresholds (not decision count)
            if (convergenceScore >= 0.8 && marketDecisionList.length >= 10) {
                // Check if we should transition from mastery to production (after 4 weeks)
                if (currentState?.phase === 'mastery' && currentState?.masteryDate) {
                    const masteryDate = new Date(currentState.masteryDate);
                    const fourWeeksAgo = new Date();
                    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28); // 4 weeks = 28 days
                    
                    if (masteryDate <= fourWeeksAgo) {
                        // Transition to production after 4 weeks of mastery
                        phase = 'production';
                        progress = 4;
                        updates.learning_phase = 'production';
                        
                        // Store learned preferences for production mode
                        const learnedPreferences = calculateLearnedPreferences(marketDecisionList, marketKey);
                        updates.learned_preferences = learnedPreferences;
                        updates.production_notified_at = new Date().toISOString();
                        updates.production_notification_sent = true;
                        
                        console.log(`🎯 Market ${marketKey}: PROMOTED to Production after 4+ weeks of mastery!`);
                        console.log(`📢 User will be notified about Production transition for ${marketKey}`);
                    } else {
                        // Still in mastery, waiting for 4-week period
                        phase = 'mastery';
                        progress = 3;
                        const daysInMastery = Math.floor((Date.now() - masteryDate.getTime()) / (1000 * 60 * 60 * 24));
                        console.log(`📊 Market ${marketKey}: mastery (${daysInMastery}/28 days, score: ${convergenceScore.toFixed(3)})`);
                    }
                } else {
                    // First time reaching mastery - set mastery date
                    phase = 'mastery';
                    progress = 3;
                    updates.learning_phase = 'mastery';
                    updates.mastery_achieved_date = new Date().toISOString();
                    console.log(`🎯 Market ${marketKey}: ACHIEVED mastery! Starting 4-week stability period.`);
                }
            } else if (convergenceScore >= 0.6 && marketDecisionList.length >= 8) {
                // Moderate confidence: emerging patterns with some consistency
                phase = 'learning';
                progress = 2;
                updates.learning_phase = 'learning';
                
                // Clear mastery date if we dropped back from mastery
                if (currentState?.phase === 'mastery') {
                    updates.mastery_achieved_date = null;
                    console.log(`📊 Market ${marketKey}: dropped from mastery to learning`);
                }
            } else {
                // Low confidence: still discovering preferences
                phase = 'discovery';
                progress = 1;
                updates.learning_phase = 'discovery';
                
                // Clear mastery date if we dropped back
                if (currentState?.phase === 'mastery') {
                    updates.mastery_achieved_date = null;
                    console.log(`📊 Market ${marketKey}: dropped from mastery to discovery`);
                }
            }

            convergenceData[marketKey] = { phase, progress };
            
            if (Object.keys(updates).length > 0) {
                marketUpdates.push({ marketKey, updates });
            }
            
            console.log(`📊 Market ${marketKey}: ${phase} (score: ${convergenceScore.toFixed(3)}, decisions: ${marketDecisionList.length})`);
        });

        // Apply all market updates
        for (const { marketKey, updates } of marketUpdates) {
            const { error: updateError } = await supabase
                .from('user_markets')
                .update(updates)
                .eq('user_id', userId)
                .eq('market_key', marketKey);

            if (updateError) {
                console.error(`Error updating market ${marketKey}:`, updateError);
            }
        }

        return convergenceData;
        
    } catch (error) {
        console.error('Error calculating market convergence:', error);
        return {};
    }
};