const { distance } = require('fastest-levenshtein');

class SpdxLicenseSearchUtil {
  /**
   * Search licenses by partial text match (case-insensitive)
   * @param {string} query - Search query
   * @param {Array} licenses - Array of SPDX license objects
   * @returns {Array} Matching licenses
   */
  static searchByPartial(query, licenses) {
    if (!query || query.trim().length === 0) {
      return licenses;
    }

    const lowerQuery = query.toLowerCase();

    return licenses.filter(license => {
      const idMatch = license.licenseId.toLowerCase().includes(lowerQuery);
      const nameMatch = license.name.toLowerCase().includes(lowerQuery);
      return idMatch || nameMatch;
    });
  }

  /**
   * Fuzzy match license name using Levenshtein distance
   * @param {string} query - License name with potential typos
   * @param {Array} licenses - Array of SPDX license objects
   * @returns {Object|null} Best matching license or null
   */
  static fuzzyMatch(query, licenses) {
    if (!query || query.trim().length === 0) {
      return null;
    }

    const lowerQuery = query.toLowerCase();
    let bestMatch = null;
    let minDistance = Infinity;

    for (const license of licenses) {
      // Check against license ID
      const idDistance = distance(lowerQuery, license.licenseId.toLowerCase());

      // Check against license name
      const nameDistance = distance(lowerQuery, license.name.toLowerCase());

      // Use the smaller distance
      const currentDistance = Math.min(idDistance, nameDistance);

      if (currentDistance < minDistance) {
        minDistance = currentDistance;
        bestMatch = license;
      }
    }

    // Return match only if distance is <= 3 (configurable threshold)
    if (minDistance <= 3) {
      return bestMatch;
    }

    return null;
  }

  /**
   * Filter deprecated licenses
   * @param {Array} licenses - Array of SPDX license objects
   * @returns {Array} Deprecated licenses only
   */
  static getDeprecated(licenses) {
    return licenses.filter(license => license.isDeprecatedLicenseId === true);
  }

  /**
   * Get license statistics
   * @param {Array} licenses - Array of SPDX license objects
   * @returns {Object} Statistics object
   */
  static getStats(licenses) {
    const deprecated = this.getDeprecated(licenses);

    return {
      totalLicenses: licenses.length,
      deprecatedLicenses: deprecated.length
    };
  }
}

module.exports = SpdxLicenseSearchUtil;
