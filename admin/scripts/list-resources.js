/**
 * List all downloadable resources in the database
 * Usage: node admin/scripts/list-resources.js
 */

const { listResources } = require('../utils/resourceManager');
const { formatFileSize } = require('../utils/fileUtils');

async function showAllResources() {
  try {
    console.log('📋 Fetching all downloadable resources...');
    
    const resources = await listResources();
    
    if (resources.length === 0) {
      console.log('📄 No resources found');
      return;
    }
    
    console.log(`\n📚 Found ${resources.length} resource(s):\n`);
    
    // Group by category
    const grouped = resources.reduce((acc, resource) => {
      if (!acc[resource.category]) {
        acc[resource.category] = [];
      }
      acc[resource.category].push(resource);
      return acc;
    }, {});
    
    // Display each category
    Object.entries(grouped).forEach(([category, items]) => {
      console.log(`📂 ${category}:`);
      
      items.forEach((resource, index) => {
        console.log(`  ${index + 1}. ${resource.title}`);
        console.log(`     📄 File: ${resource.file_name}`);
        console.log(`     💾 Size: ${formatFileSize(resource.file_size)}`);
        console.log(`     🔗 URL: ${resource.public_url || 'No URL'}`);
        console.log(`     👥 Access: ${resource.user_class || 'All users'}`);
        console.log(`     📊 Sort: ${resource.sort_order}`);
        console.log(`     🆔 ID: ${resource.id}`);
        if (resource.description) {
          console.log(`     📝 Description: ${resource.description}`);
        }
        console.log('');
      });
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing resources:', error.message);
    process.exit(1);
  }
}

// Run the script
showAllResources();