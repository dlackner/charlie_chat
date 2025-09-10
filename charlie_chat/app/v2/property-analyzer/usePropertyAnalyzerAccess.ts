import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface UsePropertyAnalyzerAccessReturn {
    hasAccess: boolean;
    isLoading: boolean;
    userClass: string | null;
}

export const usePropertyAnalyzerAccess = (): UsePropertyAnalyzerAccessReturn => {
    const { user: currentUser, supabase } = useAuth();
    const [userClass, setUserClass] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            if (!currentUser || !supabase) {
                setUserClass(null);
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
                    console.error("Error fetching user profile:", error);
                    setUserClass(null);
                } else {
                    setUserClass(data?.user_class || null);
                }
            } catch (error) {
                console.error("Error in fetchUserProfile:", error);
                setUserClass(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [currentUser, supabase]);

    // Check if user has access to Offer Analyzer
    // Offer Analyzer is available to all user classes except disabled
    const hasAccess =
        userClass === "charlie_chat_pro" ||
        userClass === "charlie_chat_plus" ||
        userClass === "cohort" ||
        userClass === "charlie_chat" ||
        userClass === "trial";
        // Note: disabled users get NO access

    return {
        hasAccess,
        isLoading,
        userClass,
    };
};