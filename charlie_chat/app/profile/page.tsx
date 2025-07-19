"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPropertiesAccess } from "@/app/my-properties/components/useMyPropertiesAccess";
import { User, Save, ArrowLeft, Star } from "lucide-react";


interface ProfileData {
    first_name: string;
    last_name: string;
    street_address: string;
    city: string;
    state: string;
    zipcode: string;
    phone_number: string;
    business_name: string;
    job_title: string;
    logo_base64?: string;
}

const initialProfileData: ProfileData = {
    first_name: "",
    last_name: "",
    street_address: "",
    city: "",
    state: "",
    zipcode: "",
    phone_number: "",
    business_name: "",
    job_title: "",
    logo_base64: "",
};

export default function ProfilePage() {
    const { user, supabase, isLoading: isAuthLoading } = useAuth();
    const { hasAccess, isLoading: isLoadingAccess } = useMyPropertiesAccess();
    const router = useRouter();
    const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Partial<ProfileData>>({});
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [logoPreview, setLogoPreview] = useState<string>("");

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthLoading && !user) {
            router.push("/login");
        }
    }, [user, isAuthLoading, router]);

    // Load existing profile data (only if has access)
    useEffect(() => {
        const loadProfile = async () => {
            if (!user || !supabase || !hasAccess) return;

            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (error && error.code !== "PGRST116") {
                    // PGRST116 is "not found" error, which is OK for new users
                    console.error("Error loading profile:", error);
                    setErrorMessage("Error loading profile data");
                } else if (data) {
                    setProfileData({
                        first_name: data.first_name || "",
                        last_name: data.last_name || "",
                        street_address: data.street_address || "",
                        city: data.city || "",
                        state: data.state || "",
                        zipcode: data.zipcode || "",
                        phone_number: data.phone_number || "",
                        business_name: data.business_name || "",
                        job_title: data.job_title || "",
                    });
                }
            } catch (error) {
                console.error("Unexpected error loading profile:", error);
                setErrorMessage("Failed to load profile data");
            } finally {
                setIsLoading(false);
            }
        };

        if (user && supabase && !isLoadingAccess) {
            if (hasAccess) {
                loadProfile();
            } else {
                setIsLoading(false);
            }
        }
    }, [user, supabase, hasAccess, isLoadingAccess]);

    const validateForm = (): boolean => {
        const newErrors: Partial<ProfileData> = {};

        // Required fields validation
        if (!profileData.first_name.trim()) {
            newErrors.first_name = "First name is required";
        }
        if (!profileData.last_name.trim()) {
            newErrors.last_name = "Last name is required";
        }
        if (!profileData.street_address.trim()) {
            newErrors.street_address = "Street address is required";
        }
        if (!profileData.city.trim()) {
            newErrors.city = "City is required";
        }
        if (!profileData.state.trim()) {
            newErrors.state = "State is required";
        }
        if (!profileData.zipcode.trim()) {
            newErrors.zipcode = "ZIP code is required";
        }
        if (!profileData.phone_number.trim()) {
            newErrors.phone_number = "Phone number is required";
        }

        // Phone number format validation (basic)
        if (profileData.phone_number && !/^\d{10}$/.test(profileData.phone_number.replace(/\D/g, ""))) {
            newErrors.phone_number = "Please enter a valid 10-digit phone number";
        }

        // ZIP code format validation (basic)
        if (profileData.zipcode && !/^\d{5}(-\d{4})?$/.test(profileData.zipcode)) {
            newErrors.zipcode = "Please enter a valid ZIP code (12345 or 12345-6789)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof ProfileData, value: string) => {
        setProfileData(prev => ({ ...prev, [field]: value }));

        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

        // Clear messages
        setSuccessMessage("");
        setErrorMessage("");
    };

    const handleLogoUpload = (file: File) => {
        const reader = new FileReader();

        reader.onload = function (event) {
            const img = new Image();

            img.onload = function () {
                const canvas = document.createElement("canvas");
const MAX_WIDTH = 300;
const MAX_HEIGHT = 100;

let width = img.width;
let height = img.height;

// Scale to fit within bounds
if (width > MAX_WIDTH || height > MAX_HEIGHT) {
  const widthRatio = MAX_WIDTH / width;
  const heightRatio = MAX_HEIGHT / height;
  const scale = Math.min(widthRatio, heightRatio);

  width = width * scale;
  height = height * scale;
}

canvas.width = width;
canvas.height = height;


                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const compressedBase64 = canvas.toDataURL("image/png", 0.8); // 80% quality
                    setProfileData((prev) => ({ ...prev, logo_base64: compressedBase64 }));
                    setLogoPreview(compressedBase64);
                }
            };

            img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!validateForm()) return;
        if (!user || !supabase) return;

        setIsSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            const { data, error } = await supabase
                .from("profiles")
                .upsert({
                    user_id: user.id,
                    ...profileData,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "user_id"
                });

            if (error) {
                console.error("Error saving profile:", error);
                setErrorMessage("Failed to save profile. Please try again.");
            } else {
                setSuccessMessage("Profile saved successfully!");
                // Clear success message after 3 seconds
                setTimeout(() => setSuccessMessage(""), 3000);
            }
        } catch (error) {
            console.error("Unexpected error saving profile:", error);
            setErrorMessage("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isAuthLoading || isLoadingAccess || isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect to login
    }

    // Show upgrade screen if no access
    if (!hasAccess) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="max-w-md mx-auto text-center p-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-800 mb-8 transition-colors mx-auto"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </button>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                        <Star size={48} className="mx-auto mb-4 text-gray-400" />
                        
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Upgrade Required
                        </h2>
                        
                        <p className="text-gray-600 mb-2">
                            Profile management is available for Pro and Cohort members.
                        </p>
                        
                        <p className="text-gray-600 mb-6">
                            Upgrade your account to manage your profile and save your investment opportunities.
                        </p>

                        <button
                            onClick={() => router.push("/pricing")}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
                        >
                            View Pricing
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show profile form if has access
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
                    >
                        <ArrowLeft size={20} className="mr-2" />
                        Back
                    </button>

                    <div className="flex items-center mb-2">
                        <User size={24} className="mr-3 text-blue-600" />
                        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                    </div>
                    <p className="text-gray-600">Manage your personal information and preferences.</p>
                </div>

                {/* Messages */}
                {successMessage && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
                        {successMessage}
                    </div>
                )}

                {errorMessage && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                        {errorMessage}
                    </div>
                )}

                {/* Profile Form */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* First Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profileData.first_name}
                                onChange={(e) => handleInputChange("first_name", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.first_name ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter your first name"
                            />
                            {errors.first_name && (
                                <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                            )}
                        </div>

                        {/* Last Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Last Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profileData.last_name}
                                onChange={(e) => handleInputChange("last_name", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.last_name ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter your last name"
                            />
                            {errors.last_name && (
                                <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                            )}
                        </div>

                        {/* Street Address */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Street Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profileData.street_address}
                                onChange={(e) => handleInputChange("street_address", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.street_address ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter your street address"
                            />
                            {errors.street_address && (
                                <p className="mt-1 text-sm text-red-600">{errors.street_address}</p>
                            )}
                        </div>

                        {/* City */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                City <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profileData.city}
                                onChange={(e) => handleInputChange("city", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.city ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter your city"
                            />
                            {errors.city && (
                                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                            )}
                        </div>

                        {/* State */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                State <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profileData.state}
                                onChange={(e) => handleInputChange("state", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.state ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="Enter your state"
                            />
                            {errors.state && (
                                <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                            )}
                        </div>

                        {/* ZIP Code */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ZIP Code <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={profileData.zipcode}
                                onChange={(e) => handleInputChange("zipcode", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.zipcode ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="12345 or 12345-6789"
                            />
                            {errors.zipcode && (
                                <p className="mt-1 text-sm text-red-600">{errors.zipcode}</p>
                            )}
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={profileData.phone_number}
                                onChange={(e) => handleInputChange("phone_number", e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.phone_number ? "border-red-500" : "border-gray-300"
                                    }`}
                                placeholder="(555) 123-4567"
                            />
                            {errors.phone_number && (
                                <p className="mt-1 text-sm text-red-600">{errors.phone_number}</p>
                            )}
                        </div>

                        {/* Business Name (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Business Name
                            </label>
                            <input
                                type="text"
                                value={profileData.business_name}
                                onChange={(e) => handleInputChange("business_name", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your business name (optional)"
                            />
                        </div>

                        {/* Job Title (Optional) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Job Title
                            </label>
                            <input
                                type="text"
                                value={profileData.job_title}
                                onChange={(e) => handleInputChange("job_title", e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your job title (optional)"
                            />
                        </div>
                    </div>

                    {/* Logo Upload (Optional) */}
                    <div className="md:col-span-2 mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Upload Logo (PNG or JPG, max 1MB)
                        </label>
                        <input
                            type="file"
                            accept="image/png, image/jpeg"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    if (file.size > 1024 * 1024) {
                                        alert("File too large. Please upload a file smaller than 1MB.");
                                    } else {
                                        handleLogoUpload(file);
                                    }
                                }
                            }}
                            className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
                        />
                        {logoPreview && (
                            <div className="mt-2">
                                <p className="text-xs text-gray-500 mb-1">Preview:</p>
                                <img src={logoPreview} alt="Logo preview" className="w-32 h-auto rounded border" />
                            </div>
                        )}
                    </div>
                    {/* Save Button + Required Note */}
                    <div className="mt-12 flex flex-col md:flex-row items-center justify-between">
                        <div className="text-sm text-gray-600 flex items-center mb-4 md:mb-0">
                            <span className="text-red-500 mr-1">*</span>
                            Required field
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center px-6 py-3 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            style={{ backgroundColor: '#1C599F' }}
                        >
                            <Save size={20} className="mr-2" />
                            {isSaving ? "Saving..." : "Save Profile"}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}