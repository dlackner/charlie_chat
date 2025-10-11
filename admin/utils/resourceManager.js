const { supabase } = require('../config/database');

/**
 * Add a downloadable resource to the database
 * @param {Object} resourceData - Resource data object
 * @param {string} resourceData.title - Resource title
 * @param {string} resourceData.description - Resource description
 * @param {string} resourceData.category - Resource category ('Getting Started', 'Resources', 'Upcoming Events')
 * @param {string} resourceData.fileName - File name
 * @param {number} resourceData.fileSize - File size in bytes
 * @param {string} resourceData.contentType - MIME type (default: 'application/pdf')
 * @param {string} resourceData.publicUrl - Public URL path
 * @param {string|null} resourceData.userClass - User class restriction (null for all users)
 * @param {number} resourceData.sortOrder - Sort order within category
 * @returns {Promise<Object>} - Created resource data
 */
async function addResource(resourceData) {
  const {
    title,
    description,
    category,
    fileName,
    fileSize,
    contentType = 'application/pdf',
    publicUrl,
    userClass = null,
    sortOrder = 1
  } = resourceData;

  const dbData = {
    title,
    description,
    category,
    file_name: fileName,
    file_size: fileSize,
    content_type: contentType,
    public_url: publicUrl,
    user_class: userClass,
    sort_order: sortOrder,
    is_active: true,
    created_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('downloadable_resources')
    .insert([dbData])
    .select();

  if (error) {
    throw error;
  }

  return data[0];
}

/**
 * Remove a downloadable resource by title
 * @param {string} title - Resource title to remove
 * @returns {Promise<void>}
 */
async function removeResource(title) {
  const { error } = await supabase
    .from('downloadable_resources')
    .delete()
    .eq('title', title);

  if (error) {
    throw error;
  }
}

/**
 * List all downloadable resources
 * @returns {Promise<Array>} - Array of resources
 */
async function listResources() {
  const { data, error } = await supabase
    .from('downloadable_resources')
    .select('*')
    .order('category')
    .order('sort_order');

  if (error) {
    throw error;
  }

  return data || [];
}

module.exports = {
  addResource,
  removeResource,
  listResources
};