"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UseMyPropertiesAccessReturn {
    hasAccess: boolean;
    isLoading: boolean;
    userClass: string | null;
    userCredits: number | null;
    checkTrialUserCredits: () => Promise<boolean>;
    isInGracePeriod: boolean;
    daysLeftInGracePeriod: number | null;
}

export const useMyPropertiesAccess = (): UseMyPropertiesAccessReturn => {
    console.log('🚀 useMyPropertiesAccess hook started');
    const { user: currentUser, supabase } = useAuth();
    const [userClass, setUserClass] = useState<string | null>(null);
    const [userCredits, setUserCredits] = useState<number | null>(null);
    const [creditsDepletedAt, setCreditsDepletedAt] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user class, credits, and grace period data from Supabase
    useEffect(() => {
        const loadUserData = async () => {
            if (!currentUser || !supabase) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("user_class, credits, credits_depleted_at")
                    .eq("user_id", currentUser.id)
                    .single();

                if (error) {
                    // Only log actual errors, not "no rows" which is expected for new users
                    if (error.code !== 'PGRST116') {
                        console.error("Error loading user data:", error);
                    }
                    setUserClass(null);
                    setUserCredits(null);
                } else {
                    setUserClass(data?.user_class || null);
                    setUserCredits(data?.credits || 0);
                    setCreditsDepletedAt(data?.credits_depleted_at || null);
                }
            } catch (error) {
                // Only log if it's not a network/auth issue during signup flow
                if (currentUser?.id) {
                    console.error("Unexpected error loading user data:", error);
                }
                setUserClass(null);
                setUserCredits(null);
            } finally {
                setIsLoading(false);
            }
        };

        if (currentUser && supabase) {
            loadUserData();
        } else {
            setIsLoading(false);
        }
    }, [currentUser, supabase]);

    // Calculate grace period status
    const calculateGracePeriod = () => {
        if (userClass !== "trial" || !creditsDepletedAt) {
            console.log('🔍 Grace period check: No trial user or no credits_depleted_at', { userClass, creditsDepletedAt });
            return { isInGracePeriod: false, daysLeftInGracePeriod: null };
        }

        const depletedDate = new Date(creditsDepletedAt);
        const now = new Date();
        const gracePeriodEnd = new Date(depletedDate.getTime() + (3 * 24 * 60 * 60 * 1000)); // 3 days
        const timeLeft = gracePeriodEnd.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

        console.log('🔍 Grace period calculation:', {
            creditsDepletedAt,
            depletedDate: depletedDate.toString(),
            now: now.toString(),
            gracePeriodEnd: gracePeriodEnd.toString(),
            timeLeftMs: timeLeft,
            daysLeft,
            isInGracePeriod: timeLeft > 0
        });

        return {
            isInGracePeriod: timeLeft > 0,
            daysLeftInGracePeriod: timeLeft > 0 ? Math.max(0, daysLeft) : null
        };
    };

    const { isInGracePeriod, daysLeftInGracePeriod } = calculateGracePeriod();


    // Check if user has access to My Properties
    const hasAccess =
        userClass === "charlie_chat_pro" ||
        userClass === "cohort" ||
        (userClass === "charlie_chat" && userCredits !== null && userCredits > 0) ||
        (userClass === "trial" && userCredits !== null && (userCredits > 0 || isInGracePeriod));
        // Note: disabled users get NO access, trials past grace period get NO access

    // Fresh credit check for trial users (used by Header component)
    const checkTrialUserCredits = async (): Promise<boolean> => {
        if (!currentUser || !supabase || userClass !== "trial") {
            return false;
        }

        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("credits")
                .eq("user_id", currentUser.id)
                .single();

            if (error) {
                console.error("Error checking trial user credits:", error);
                return false;
            }

            const currentCredits = data?.credits || 0;
            return currentCredits > 0;
        } catch (error) {
            console.error("Unexpected error checking credits:", error);
            return false;
        }
    };

    console.log('🔍 useMyPropertiesAccess final result:', {
        hasAccess,
        isLoading,
        userClass,
        userCredits,
        isInGracePeriod,
        daysLeftInGracePeriod
    });

    return {
        hasAccess,
        isLoading,
        userClass,
        userCredits,
        checkTrialUserCredits,
        isInGracePeriod,
        daysLeftInGracePeriod
    };
};