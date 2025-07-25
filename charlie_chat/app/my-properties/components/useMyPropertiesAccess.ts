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
                    console.error("Error loading user data:", error);
                    setUserClass(null);
                    setUserCredits(null);
                } else {
                    setUserClass(data?.user_class || null);
                    setUserCredits(data?.credits || 0);
                    setCreditsDepletedAt(data?.credits_depleted_at || null);
                }
            } catch (error) {
                console.error("Unexpected error loading user data:", error);
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
            return { isInGracePeriod: false, daysLeftInGracePeriod: null };
        }

        const depletedDate = new Date(creditsDepletedAt);
        const now = new Date();
        const gracePeriodEnd = new Date(depletedDate.getTime() + (5 * 24 * 60 * 60 * 1000)); // 5 days
        const timeLeft = gracePeriodEnd.getTime() - now.getTime();
        const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));

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
        (userClass === "trial" && userCredits !== null && userCredits > 0);

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