"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasAccess, type UserClass } from "@/lib/v2/accessControl";

interface UseMyPropertiesAccessReturn {
    hasAccess: boolean;
    isLoading: boolean;
    userClass: string | null;
}

export const useMyPropertiesAccess = (): UseMyPropertiesAccessReturn => {
    const { user: currentUser, supabase } = useAuth();
    const [userClass, setUserClass] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load user class from Supabase
    useEffect(() => {
        const loadUserData = async () => {
            if (!currentUser || !supabase) {
                setIsLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("user_class")
                    .eq("user_id", currentUser.id)
                    .single();

                if (error) {
                    // Only log actual errors, not "no rows" which is expected for new users
                    if (error.code !== 'PGRST116') {
                        console.error("Error loading user data:", error);
                    }
                    setUserClass(null);
                } else {
                    setUserClass(data?.user_class || null);
                }
            } catch (error) {
                // Only log if it's not a network/auth issue during signup flow
                if (currentUser?.id) {
                    console.error("Unexpected error loading user data:", error);
                }
                setUserClass(null);
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

    // Use centralized access control to check if user has access to engage templates
    // Trial users get access for 7 days, then automatically convert to core and lose template access
    const userHasAccess = userClass ? hasAccess(userClass as UserClass, 'engage_templates') : false;

    return {
        hasAccess: userHasAccess,
        isLoading,
        userClass
    };
};