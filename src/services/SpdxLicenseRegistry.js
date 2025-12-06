const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class SpdxLicenseRegistry {
  constructor() {
    this.licenses = [];
    this.licenseMap = new Map(); // For O(1) lookups
  }

  /**
   * Initialize the registry by loading SPDX license data
   */
  initialize() {
    try {
      const dataPath = path.join(__dirname, '../data/spdx/backup-license.json');

      logger.info(`Loading SPDX license data from: ${dataPath}`);

      const rawData = fs.readFileSync(dataPath, 'utf8');
      const jsonData = JSON.parse(rawData);

      // Extract licenses array from JSON structure
      this.licenses = jsonData.licenses || [];

      // Build lookup map for fast access
      this.licenses.forEach(license => {
        this.licenseMap.set(license.licenseId.toLowerCase(), license);
      });

      logger.info(`Loaded ${this.licenses.length} SPDX licenses`);
    } catch (error) {
      logger.error('Failed to load SPDX license data:', error);
      throw new Error(`SPDX license registry initialization failed: ${error.message}`);
    }
  }

  /**
   * Get all licenses
   * @returns {Array} All SPDX licenses
   */
  getAllLicenses() {
    return [...this.licenses];
  }

  /**
   * Find license by ID (case-insensitive)
   * @param {string} licenseId - License ID to find
   * @returns {Object|null} License object or null if not found
   */
  findById(licenseId) {
    if (!licenseId) return null;
    return this.licenseMap.get(licenseId.toLowerCase()) || null;
  }

  /**
   * Check if a license ID exists
   * @param {string} licenseId - License ID to check
   * @returns {boolean} True if license exists
   */
  exists(licenseId) {
    if (!licenseId) return false;
    return this.licenseMap.has(licenseId.toLowerCase());
  }

  /**
   * Get SPDX URL for a license
   * @param {string} licenseId - License ID
   * @returns {string|null} SPDX URL or null
   */
  getSpdxUrl(licenseId) {
    const license = this.findById(licenseId);
    if (license) {
      return `https://spdx.org/licenses/${license.licenseId}.html`;
    }
    return null;
  }

  /**
   * Get the number of licenses in the registry
   * @returns {number} Total license count
   */
  size() {
    return this.licenses.length;
  }
}

// Export singleton instance
module.exports = new SpdxLicenseRegistry();
