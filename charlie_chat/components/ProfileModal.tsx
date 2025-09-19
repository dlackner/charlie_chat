/*
 * CHARLIE2 V2 - Profile Modal Component
 * Modal interface for editing user profile information
 * Features live database integration and form validation
 * Part of the new V2 application architecture
 */
"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { User, Save, X } from "lucide-react";
import { Dialog } from "@headlessui/react";

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

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, supabase } = useAuth();
    const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Partial<ProfileData>>({});
    const [successMessage, setSuccessMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [logoPreview, setLogoPreview] = useState<string>("");

    // Load existing profile data when modal opens
    useEffect(() => {
        const loadProfile = async () => {
            if (!isOpen || !user || !supabase) return;

            setIsLoading(true);
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("user_id", user.id)
                    .single();

                if (error && error.code !== "PGRST116") {
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
                        logo_base64: data.logo_base64 || "",
                    });
                    
                    if (data.logo_base64) {
                        setLogoPreview(data.logo_base64);
                    }
                }
            } catch (error) {
                setErrorMessage("Failed to load profile data");
            } finally {
                setIsLoading(false);
            }
        };

        loadProfile();
    }, [isOpen, user, supabase]);

    // Reset form when modal closes
    useEffect(() => {
        if (!isOpen) {
            setProfileData(initialProfileData);
            setErrors({});
            setSuccessMessage("");
            setErrorMessage("");
            setLogoPreview("");
        }
    }, [isOpen]);

    const validateForm = (): boolean => {
        const newErrors: Partial<ProfileData> = {};

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

        if (profileData.phone_number && !/^\d{10}$/.test(profileData.phone_number.replace(/\D/g, ""))) {
            newErrors.phone_number = "Please enter a valid 10-digit phone number";
        }

        if (profileData.zipcode && !/^\d{5}(-\d{4})?$/.test(profileData.zipcode)) {
            newErrors.zipcode = "Please enter a valid ZIP code (12345 or 12345-6789)";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof ProfileData, value: string) => {
        setProfileData(prev => ({ ...prev, [field]: value }));

        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }

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
                    const compressedBase64 = canvas.toDataURL("image/png", 0.8);
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
            const { error } = await supabase
                .from("profiles")
                .upsert({
                    user_id: user.id,
                    ...profileData,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: "user_id"
                });

            if (error) {
                setErrorMessage("Failed to save profile. Please try again.");
            } else {
                // Close modal immediately after successful save
                onClose();
            }
        } catch (error) {
            setErrorMessage("An unexpected error occurred. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };


    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <div className="flex items-center">
                            <User size={24} className="mr-3 text-blue-600" />
                            <div>
                                <Dialog.Title className="text-xl font-semibold text-gray-900">
                                    Profile
                                </Dialog.Title>
                                <p className="text-sm text-gray-600">Manage your personal information and preferences</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                        {/* Messages */}
                        {successMessage && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                                {successMessage}
                            </div>
                        )}

                        {errorMessage && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                                {errorMessage}
                            </div>
                        )}

                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                                <p className="text-gray-600">Loading profile...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        First Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.first_name}
                                        onChange={(e) => handleInputChange("first_name", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.first_name ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="Enter your first name"
                                    />
                                    {errors.first_name && (
                                        <p className="mt-1 text-xs text-red-600">{errors.first_name}</p>
                                    )}
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Last Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.last_name}
                                        onChange={(e) => handleInputChange("last_name", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.last_name ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="Enter your last name"
                                    />
                                    {errors.last_name && (
                                        <p className="mt-1 text-xs text-red-600">{errors.last_name}</p>
                                    )}
                                </div>

                                {/* Street Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Street Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.street_address}
                                        onChange={(e) => handleInputChange("street_address", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.street_address ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="Enter your street address"
                                    />
                                    {errors.street_address && (
                                        <p className="mt-1 text-xs text-red-600">{errors.street_address}</p>
                                    )}
                                </div>

                                {/* City */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.city}
                                        onChange={(e) => handleInputChange("city", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.city ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="Enter your city"
                                    />
                                    {errors.city && (
                                        <p className="mt-1 text-xs text-red-600">{errors.city}</p>
                                    )}
                                </div>

                                {/* State */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        State <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.state}
                                        onChange={(e) => handleInputChange("state", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.state ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="Enter your state"
                                    />
                                    {errors.state && (
                                        <p className="mt-1 text-xs text-red-600">{errors.state}</p>
                                    )}
                                </div>

                                {/* ZIP Code */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ZIP Code <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.zipcode}
                                        onChange={(e) => handleInputChange("zipcode", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.zipcode ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="12345 or 12345-6789"
                                    />
                                    {errors.zipcode && (
                                        <p className="mt-1 text-xs text-red-600">{errors.zipcode}</p>
                                    )}
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={profileData.phone_number}
                                        onChange={(e) => handleInputChange("phone_number", e.target.value)}
                                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                            errors.phone_number ? "border-red-500" : "border-gray-300"
                                        }`}
                                        placeholder="(555) 123-4567"
                                    />
                                    {errors.phone_number && (
                                        <p className="mt-1 text-xs text-red-600">{errors.phone_number}</p>
                                    )}
                                </div>

                                {/* Business Name */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Business Name
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.business_name}
                                        onChange={(e) => handleInputChange("business_name", e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your business name (optional)"
                                    />
                                </div>

                                {/* Job Title */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Job Title
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.job_title}
                                        onChange={(e) => handleInputChange("job_title", e.target.value)}
                                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter your job title (optional)"
                                    />
                                </div>

                                {/* Logo Upload */}
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Upload Logo (PNG or JPG, max 1MB)
                                    </label>
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 1024 * 1024) {
                                                    setErrorMessage("File too large. Please upload a file smaller than 1MB.");
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
                                            <img src={logoPreview} alt="Logo preview" className="w-24 h-auto rounded border" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600 flex items-center">
                            <span className="text-red-500 mr-1">*</span>
                            Required field
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                                disabled={isSaving}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex items-center px-4 py-2 text-white rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                style={{ backgroundColor: '#1C599F' }}
                            >
                                <Save size={16} className="mr-2" />
                                {isSaving ? "Saving..." : "Save Profile"}
                            </button>
                        </div>
                    </div>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};