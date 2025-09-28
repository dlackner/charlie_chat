/**
 * Remove a downloadable resource from the database
 * Usage: node admin/scripts/remove-resource.js "Resource Title"
 */

const { removeResource } = require('../utils/resourceManager');

async function removeResourceByTitle() {
  try {
    const title = process.argv[2];
    
    if (!title) {
      console.error('❌ Error: Resource title is required');
      console.log('Usage: node admin/scripts/remove-resource.js "Resource Title"');
      process.exit(1);
    }
    
    console.log('🗑️ Removing resource:', title);
    
    await removeResource(title);
    
    console.log('✅ Resource removed successfully!');
    
  } catch (error) {
    console.error('❌ Error removing resource:', error.message);
    process.exit(1);
  }
}

// Run the script
removeResourceByTitle();