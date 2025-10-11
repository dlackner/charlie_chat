/*
 * CHARLIE2 V2 - Profile Management Page
 * Dynamic profile page with live Supabase database integration
 * Fetches and saves real user profile data
 * Part of the new V2 application architecture
 */

'use client';

import { useState, useEffect } from 'react';
import { User, Upload, Save, X, ArrowLeft } from 'lucide-react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function ProfilePage() {
  const { user: currentUser, supabase } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    streetAddress: '',
    city: '',
    state: '',
    zipCode: '',
    phoneNumber: '',
    businessName: '',
    jobTitle: ''
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load profile data when component mounts
  useEffect(() => {
    const fetchProfile = async () => {
      if (!currentUser || !supabase) return;

      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', currentUser.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFormData({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            streetAddress: data.street_address || '',
            city: data.city || '',
            state: data.state || '',
            zipCode: data.zipcode || '',  // Note: column name is 'zipcode' not 'zip_code'
            phoneNumber: data.phone_number || '',
            businessName: data.business_name || '',
            jobTitle: data.job_title || ''
          });
          
          // Load logo from logo_base64 field
          if (data.logo_base64) {
            setLogoPreview(data.logo_base64);
          }
        }
      } catch (err) {
        setError('Failed to load profile information');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [currentUser, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size <= 1024 * 1024) { // 1MB limit
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setError('Please select an image file under 1MB');
    }
  };

  const handleSave = async () => {
    if (!currentUser || !supabase) {
      setError('Authentication required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Check if required fields are filled
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        setError('First name and last name are required.');
        return;
      }

      let logoBase64 = null;

      // Handle logo file conversion to base64 if logoFile exists
      if (logoFile) {
        // Convert file to base64
        logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile);
        });
      } else if (logoPreview && logoPreview.startsWith('data:')) {
        // Keep existing base64 data if no new file uploaded
        logoBase64 = logoPreview;
      }

      // Prepare profile data for database
      const profileData: any = {
        user_id: currentUser.id,
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        street_address: formData.streetAddress.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zipcode: formData.zipCode.trim() || null,  // Note: column name is 'zipcode' not 'zip_code'
        phone_number: formData.phoneNumber.trim() || null,
        business_name: formData.businessName.trim() || null,
        job_title: formData.jobTitle.trim() || null,
        logo_base64: logoBase64, // Save the base64 data
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        })
        .select();

      if (error) {
        throw error;
      }

      setSuccessMessage('Profile saved successfully!');
      
      // Clear the logo file state since it's now saved
      setLogoFile(null);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);

    } catch (err) {
      // Show more detailed error information
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to save profile: ${errorMessage}. Please try again.`);
    } finally {
      setSaving(false);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show authentication required state
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600">Please log in to view your profile.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
                <p className="text-gray-600">Manage your personal information and preferences</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600">{successMessage}</p>
          </div>
        )}

        {/* Profile Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Street Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="streetAddress"
                value={formData.streetAddress}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* City, State, ZIP */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.zipCode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Business Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Logo (PNG or JPG, max 1MB)
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={handleLogoUpload}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {logoPreview && (
                  <div className="flex-shrink-0">
                    <div className="text-sm text-gray-500 mb-1">Preview:</div>
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      width={100}
                      height={40}
                      className="border border-gray-300 rounded"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Required Field Notice */}
            <div className="text-sm text-gray-500">
              <span className="text-red-500">*</span> Required field
            </div>

            {/* Save Button */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </AuthGuard>
  );
}