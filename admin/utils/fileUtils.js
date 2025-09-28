const fs = require('fs');
const path = require('path');

/**
 * Check if a file exists at the given path
 * @param {string} filePath - Path to the file
 * @returns {boolean} - True if file exists
 */
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

/**
 * Get file stats (size, etc.)
 * @param {string} filePath - Path to the file
 * @returns {fs.Stats} - File stats object
 */
function getFileStats(filePath) {
  return fs.statSync(filePath);
}

/**
 * Get the public folder path relative to project root
 * @returns {string} - Path to public folder
 */
function getPublicPath() {
  return path.join(__dirname, '..', '..', 'public');
}

/**
 * Get full path to a file in the public folder
 * @param {string} fileName - Name of the file
 * @returns {string} - Full path to the file
 */
function getPublicFilePath(fileName) {
  return path.join(getPublicPath(), fileName);
}

/**
 * Format file size in KB
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size (e.g., "153 KB")
 */
function formatFileSize(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

module.exports = {
  fileExists,
  getFileStats,
  getPublicPath,
  getPublicFilePath,
  formatFileSize
};