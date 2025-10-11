/**
 * Generic script to add downloadable resources to the database
 * Usage: node admin/scripts/add-resource.js [fileName] [options]
 * 
 * Examples:
 * node admin/scripts/add-resource.js "Google Chrome Directions for MultifamilyOS Email.pdf" --title="Chrome Email Setup" --category="Getting Started"
 * node admin/scripts/add-resource.js "investment-guide.pdf" --title="Investment Guide" --description="Complete guide to multifamily investing"
 */

const { fileExists, getFileStats, getPublicFilePath, formatFileSize } = require('../utils/fileUtils');
const { addResource, removeResource } = require('../utils/resourceManager');
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const fileName = args[0];
  
  if (!fileName) {
    console.error('❌ Error: File name is required');
    console.log('Usage: node admin/scripts/add-resource.js [fileName] [options]');
    console.log('');
    console.log('Options:');
    console.log('  --title="Title"           Resource title (defaults to file name)');
    console.log('  --description="Desc"      Resource description');
    console.log('  --category="Category"     Category: "Getting Started", "Resources", "Upcoming Events" (default: "Resources")');
    console.log('  --user-class="Class"      User class restriction (default: null - all users)');
    console.log('  --sort-order=1            Sort order within category (default: 1)');
    console.log('  --replace                 Replace existing resource with same title');
    process.exit(1);
  }

  const options = {
    fileName,
    title: null,
    description: null,
    category: 'Resources',
    userClass: null,
    sortOrder: 1,
    replace: false
  };

  // Parse options
  args.slice(1).forEach(arg => {
    if (arg.startsWith('--title=')) {
      options.title = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--description=')) {
      options.description = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--category=')) {
      options.category = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--user-class=')) {
      options.userClass = arg.split('=')[1].replace(/"/g, '');
    } else if (arg.startsWith('--sort-order=')) {
      options.sortOrder = parseInt(arg.split('=')[1]);
    } else if (arg === '--replace') {
      options.replace = true;
    }
  });

  // Set defaults
  if (!options.title) {
    options.title = path.parse(fileName).name;
  }
  
  if (!options.description) {
    options.description = `Download ${options.title}`;
  }

  return options;
}

async function addResourceFromFile() {
  try {
    const options = parseArgs();
    
    console.log('📁 Adding downloadable resource...');
    console.log('📄 File:', options.fileName);
    console.log('📋 Title:', options.title);
    console.log('📂 Category:', options.category);
    
    // Check if file exists in public folder
    const filePath = getPublicFilePath(options.fileName);
    
    if (!fileExists(filePath)) {
      throw new Error(`File not found at: ${filePath}`);
    }
    
    const fileStats = getFileStats(filePath);
    console.log('✅ File found, size:', formatFileSize(fileStats.size));
    
    // Remove existing resource if replace flag is set
    if (options.replace) {
      console.log('🔄 Replacing existing resource...');
      try {
        await removeResource(options.title);
        console.log('✅ Existing resource removed');
      } catch (error) {
        console.log('ℹ️ No existing resource to replace');
      }
    }
    
    // Determine content type based on file extension
    const ext = path.extname(options.fileName).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.txt': 'text/plain',
      '.md': 'text/markdown'
    };
    
    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Create resource data
    const resourceData = {
      title: options.title,
      description: options.description,
      category: options.category,
      fileName: options.fileName,
      fileSize: fileStats.size,
      contentType: contentType,
      publicUrl: `/${options.fileName}`,
      userClass: options.userClass,
      sortOrder: options.sortOrder
    };
    
    console.log('💾 Adding resource to database...');
    
    const result = await addResource(resourceData);
    
    console.log('🎉 Successfully added resource!');
    console.log('📋 Resource details:', {
      id: result.id,
      title: result.title,
      category: result.category,
      file_size: formatFileSize(result.file_size),
      public_url: result.public_url,
      sort_order: result.sort_order
    });
    
  } catch (error) {
    console.error('❌ Error adding resource:', error.message);
    process.exit(1);
  }
}

// Run the script
addResourceFromFile();