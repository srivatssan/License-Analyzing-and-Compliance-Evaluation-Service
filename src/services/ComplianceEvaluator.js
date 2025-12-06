const logger = require('../config/logger');
const policyConfig = require('../config/policy');

class ComplianceEvaluator {
  /**
   * Evaluate dependencies against compliance policy
   * @param {Array} dependencies - Array of DependencyLicenseInfo objects
   * @returns {Object} ComplianceReport with verdicts
   */
  evaluate(dependencies) {
    logger.info(`Evaluating compliance for ${dependencies.length} dependencies`);

    const dependencyVerdicts = [];

    for (const dep of dependencies) {
      const verdict = this.evaluateDependency(dep);
      dependencyVerdicts.push(verdict);
    }

    const overallVerdict = this.calculateOverallVerdict(dependencyVerdicts);

    logger.info(`Overall compliance verdict: ${overallVerdict}`);

    return {
      overallVerdict,
      dependencyVerdicts
    };
  }

  /**
   * Evaluate a single dependency
   * @param {Object} dependency - DependencyLicenseInfo object
   * @returns {Object} Dependency verdict
   */
  evaluateDependency(dependency) {
    const spdxExpression = dependency.spdxExpression || dependency.license;
    const licenses = this.extractLicenses(spdxExpression);

    const statusMap = this.classifyLicenses(licenses);

    const verdict = this.determineVerdict(spdxExpression, licenses, statusMap);

    return {
      library: dependency.name,
      spdxExpression,
      complianceResult: verdict.result,
      explanation: verdict.explanation
    };
  }

  /**
   * Extract individual license IDs from SPDX expression
   * @param {string} spdxExpression - SPDX license expression
   * @returns {Array} Array of license IDs
   */
  extractLicenses(spdxExpression) {
    if (!spdxExpression || spdxExpression === 'NOASSERTION') {
      return ['NOASSERTION'];
    }

    // Extract license tokens, ignoring operators
    const tokens = spdxExpression.match(/[A-Za-z0-9.\-+]+/g) || [];

    return tokens.filter(token =>
      token !== 'AND' &&
      token !== 'OR' &&
      token !== 'WITH'
    );
  }

  /**
   * Classify licenses as APPROVED, DENIED, or UNKNOWN
   * @param {Array} licenses - Array of license IDs
   * @returns {Object} Map of license -> status
   */
  classifyLicenses(licenses) {
    const statusMap = {};

    for (const license of licenses) {
      if (policyConfig.isDenied(license)) {
        statusMap[license] = 'DENIED';
      } else if (policyConfig.isApproved(license)) {
        statusMap[license] = 'APPROVED';
      } else {
        statusMap[license] = 'UNKNOWN';
      }
    }

    return statusMap;
  }

  /**
   * Determine verdict based on license classifications
   * @param {string} spdxExpression - Full SPDX expression
   * @param {Array} licenses - Extracted license IDs
   * @param {Object} statusMap - License classification map
   * @returns {Object} Verdict with result and explanation
   */
  determineVerdict(spdxExpression, licenses, statusMap) {
    // Rule 1: DENIED licenses cause immediate FAIL
    const deniedLicenses = licenses.filter(lic => statusMap[lic] === 'DENIED');
    if (deniedLicenses.length > 0) {
      return {
        result: 'FAIL',
        explanation: `Contains denied license(s): ${deniedLicenses.join(', ')}`
      };
    }

    // Rule 2: Exact SPDX expression match in approved list -> PASS
    if (policyConfig.isApproved(spdxExpression)) {
      return {
        result: 'PASS',
        explanation: 'Exact match found in approved licenses.'
      };
    }

    // Rule 3: All sub-licenses approved but expression not in list -> REVIEW
    const allApproved = licenses.every(lic => statusMap[lic] === 'APPROVED');
    if (allApproved && licenses.length > 0 && !licenses.includes('NOASSERTION')) {
      return {
        result: 'REVIEW',
        explanation: 'All sub-licenses approved, but expression not in approved list.'
      };
    }

    // Rule 4: Unknown licenses -> REVIEW
    const unknownLicenses = licenses.filter(lic => statusMap[lic] === 'UNKNOWN');
    if (unknownLicenses.length > 0) {
      return {
        result: 'REVIEW',
        explanation: `Some licenses need review: ${JSON.stringify(statusMap)}`
      };
    }

    // Default case
    return {
      result: 'REVIEW',
      explanation: 'License requires manual review.'
    };
  }

  /**
   * Calculate overall verdict from individual dependency verdicts
   * @param {Array} dependencyVerdicts - Array of dependency verdicts
   * @returns {string} Overall verdict: COMPLIANT, NON_COMPLIANT, or NEEDS_REVIEW
   */
  calculateOverallVerdict(dependencyVerdicts) {
    const hasFail = dependencyVerdicts.some(v => v.complianceResult === 'FAIL');
    if (hasFail) {
      return 'NON_COMPLIANT';
    }

    const hasReview = dependencyVerdicts.some(v => v.complianceResult === 'REVIEW');
    if (hasReview) {
      return 'NEEDS_REVIEW';
    }

    return 'COMPLIANT';
  }
}

module.exports = new ComplianceEvaluator();
