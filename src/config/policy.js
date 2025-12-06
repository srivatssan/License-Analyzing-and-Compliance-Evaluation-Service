const logger = require('./logger');

class PolicyConfig {
  constructor() {
    this.approvedLicenses = this.parseLicenses(
      process.env.APPROVED_LICENSES || 'MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,EPL-2.0,MPL-2.0'
    );

    this.deniedLicenses = this.parseLicenses(
      process.env.DENIED_LICENSES || 'SSPL-1.0,BSL-1.1,RPL-1.5,GPL-3.0,AGPL-3.0'
    );

    logger.info(`Loaded ${this.approvedLicenses.length} approved licenses`);
    logger.info(`Loaded ${this.deniedLicenses.length} denied licenses`);
  }

  parseLicenses(licenseString) {
    return licenseString
      .split(',')
      .map(license => license.trim())
      .filter(license => license.length > 0);
  }

  isApproved(licenseId) {
    return this.approvedLicenses.includes(licenseId);
  }

  isDenied(licenseId) {
    return this.deniedLicenses.includes(licenseId);
  }

  getApprovedLicenses() {
    return [...this.approvedLicenses];
  }

  getDeniedLicenses() {
    return [...this.deniedLicenses];
  }
}

module.exports = new PolicyConfig();
