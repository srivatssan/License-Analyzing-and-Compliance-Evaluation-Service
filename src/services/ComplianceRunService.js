const { v4: uuidv4 } = require('uuid');
const { ComplianceRun, PolicyComplianceResult } = require('../models');
const logger = require('../config/logger');

class ComplianceRunService {
  /**
   * Save compliance report to database
   * @param {Object} complianceReport - Compliance report object
   * @param {string} filePath - Path to analyzed file
   * @returns {Promise<Object>} Saved compliance run with UUID
   */
  async saveComplianceRun(complianceReport, filePath) {
    try {
      const runUuid = uuidv4();

      // Create compliance run
      const complianceRun = await ComplianceRun.create({
        uuid: runUuid,
        filePath: filePath,
        overallVerdict: complianceReport.overallVerdict,
        analyzedAt: new Date()
      });

      // Create policy compliance results
      for (const verdict of complianceReport.dependencyVerdicts) {
        await PolicyComplianceResult.create({
          library: verdict.library,
          spdxExpression: verdict.spdxExpression,
          complianceResult: verdict.complianceResult,
          explanation: verdict.explanation,
          complianceRunId: complianceRun.id
        });
      }

      logger.info(`Saved compliance run with UUID: ${runUuid}`);

      return {
        uuid: runUuid,
        ...complianceReport
      };
    } catch (error) {
      logger.error('Failed to save compliance run:', error);
      throw error;
    }
  }

  /**
   * Get all compliance runs
   * @returns {Promise<Array>} Array of compliance runs
   */
  async getAllRuns() {
    try {
      const runs = await ComplianceRun.findAll({
        attributes: ['uuid', 'filePath', 'overallVerdict', 'analyzedAt', 'validatedAt', 'validationVerdict'],
        order: [['analyzedAt', 'DESC']]
      });

      return runs.map(run => run.toJSON());
    } catch (error) {
      logger.error('Failed to fetch compliance runs:', error);
      throw error;
    }
  }

  /**
   * Get compliance run by UUID
   * @param {string} uuid - Compliance run UUID
   * @returns {Promise<Object|null>} Compliance run with results or null
   */
  async getRunByUuid(uuid) {
    try {
      const run = await ComplianceRun.findOne({
        where: { uuid },
        include: [{
          model: PolicyComplianceResult,
          as: 'results',
          attributes: ['id', 'library', 'spdxExpression', 'complianceResult', 'explanation']
        }]
      });

      if (!run) {
        return null;
      }

      return run.toJSON();
    } catch (error) {
      logger.error(`Failed to fetch compliance run ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Get only results for a compliance run
   * @param {string} uuid - Compliance run UUID
   * @returns {Promise<Array|null>} Array of results or null
   */
  async getResultsByUuid(uuid) {
    try {
      const run = await ComplianceRun.findOne({
        where: { uuid }
      });

      if (!run) {
        return null;
      }

      const results = await PolicyComplianceResult.findAll({
        where: { complianceRunId: run.id },
        attributes: ['id', 'library', 'spdxExpression', 'complianceResult', 'explanation']
      });

      return results.map(r => r.toJSON());
    } catch (error) {
      logger.error(`Failed to fetch results for run ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Get overall verdict for a compliance run
   * @param {string} uuid - Compliance run UUID
   * @returns {Promise<string|null>} Overall verdict or null
   */
  async getOverallVerdictByUuid(uuid) {
    try {
      const run = await ComplianceRun.findOne({
        where: { uuid },
        attributes: ['overallVerdict']
      });

      return run ? run.overallVerdict : null;
    } catch (error) {
      logger.error(`Failed to fetch overall verdict for run ${uuid}:`, error);
      throw error;
    }
  }

  /**
   * Update overall verdict for a compliance run
   * @param {string} uuid - Compliance run UUID
   * @param {string} newVerdict - New overall verdict
   * @returns {Promise<Object|null>} Updated compliance run or null
   */
  async updateVerdict(uuid, newVerdict) {
    try {
      const run = await ComplianceRun.findOne({
        where: { uuid }
      });

      if (!run) {
        return null;
      }

      await run.update({
        overallVerdict: newVerdict,
        validatedAt: new Date(),
        validationVerdict: newVerdict
      });

      logger.info(`Updated verdict for run ${uuid} to ${newVerdict}`);

      return run.toJSON();
    } catch (error) {
      logger.error(`Failed to update verdict for run ${uuid}:`, error);
      throw error;
    }
  }
}

module.exports = new ComplianceRunService();
