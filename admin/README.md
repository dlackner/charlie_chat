# MultifamilyOS Admin Tools

This directory contains administrative tools and scripts for managing the MultifamilyOS application.

## Directory Structure

```
admin/
├── config/          # Configuration files
│   └── database.js  # Supabase database connection
├── scripts/         # Administrative scripts
│   ├── add-resource.js     # Add downloadable resources
│   ├── list-resources.js   # List all resources
│   └── remove-resource.js  # Remove resources
├── utils/           # Utility modules
│   ├── fileUtils.js        # File system utilities
│   └── resourceManager.js  # Resource database operations
└── README.md        # This file
```

## Downloadable Resources Management

### Adding Resources

Add a new downloadable resource to the system:

```bash
# Basic usage (file must be in /public folder)
node admin/scripts/add-resource.js "filename.pdf"

# With custom title and description
node admin/scripts/add-resource.js "guide.pdf" --title="Investment Guide" --description="Complete guide to multifamily investing"

# Specify category
node admin/scripts/add-resource.js "setup.pdf" --category="Getting Started"

# Restrict to specific user class
node admin/scripts/add-resource.js "premium-guide.pdf" --user-class="pro"

# Set sort order (lower numbers appear first)
node admin/scripts/add-resource.js "important.pdf" --sort-order=1

# Replace existing resource with same title
node admin/scripts/add-resource.js "updated-guide.pdf" --replace
```

#### Categories
- `"Getting Started"` - New user onboarding materials
- `"Resources"` - General reference materials  
- `"Upcoming Events"` - Event-related documents

#### User Classes
- `null` - Available to all users (default)
- `"trial"` - Trial users only
- `"core"` - Core users and above
- `"plus"` - Plus users and above
- `"pro"` - Pro users and above
- `"cohort"` - Cohort users only

### Listing Resources

View all resources in the database:

```bash
node admin/scripts/list-resources.js
```

### Removing Resources

Remove a resource by title:

```bash
node admin/scripts/remove-resource.js "Resource Title"
```

## File Requirements

1. **File Location**: All files must be placed in the `/public` folder
2. **File Naming**: Use descriptive file names as they appear in download links
3. **File Types**: Supports PDF, Word docs, Excel files, text files, and more
4. **File Size**: No specific limit, but consider user download experience

## Examples

```bash
# Add the Chrome email setup guide
node admin/scripts/add-resource.js "Google Chrome Directions for MultifamilyOS Email.pdf" \
  --title="Google Chrome Directions for MultifamilyOS Email" \
  --description="Step-by-step instructions for setting up MultifamilyOS email in Google Chrome" \
  --category="Resources" \
  --sort-order=1

# Add a getting started guide
node admin/scripts/add-resource.js "onboarding-checklist.pdf" \
  --title="New User Onboarding Checklist" \
  --description="Essential steps for new MultifamilyOS users" \
  --category="Getting Started" \
  --sort-order=1

# Add a pro-only advanced guide
node admin/scripts/add-resource.js "advanced-analysis.pdf" \
  --title="Advanced Investment Analysis Techniques" \
  --description="Advanced strategies for pro investors" \
  --category="Resources" \
  --user-class="pro" \
  --sort-order=5
```

## Future Admin Tools

This admin folder structure is designed to accommodate additional administrative tools such as:

- User management scripts
- Database maintenance tools
- Data migration utilities
- Report generation scripts
- System monitoring tools

## Development Notes

- All scripts use the service role key for database access
- Scripts require `.env` file with proper Supabase credentials
- Utility modules are designed for reuse across different admin tools
- Error handling includes user-friendly messages and proper exit codes