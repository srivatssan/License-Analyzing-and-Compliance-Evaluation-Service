const express = require('express');
const { body, validationResult } = require('express-validator');
const githubRepoService = require('../services/GitHubRepoService');
const complianceEvaluator = require('../services/ComplianceEvaluator');
const ComplianceRun = require('../models/ComplianceRun');
const PolicyComplianceResult = require('../models/PolicyComplianceResult');
const logger = require('../config/logger');

const router = express.Router();

/**
 * POST /api/github/analyze
 * Analyze a GitHub repository for license compliance
 */
router.post('/analyze',
  body('url').notEmpty().withMessage('GitHub URL is required'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { url } = req.body;

      logger.info(`Analyzing GitHub repository: ${url}`);

      // Step 1: Analyze repository and extract dependencies
      const dependencies = await githubRepoService.analyzeRepository(url);

      // Step 2: Evaluate compliance against policy
      const complianceReport = complianceEvaluator.evaluate(dependencies);

      // Step 3: Save compliance run to database
      const complianceRun = await ComplianceRun.create({
        filePath: url,
        overallVerdict: complianceReport.overallVerdict,
        analyzedAt: new Date()
      });

      // Step 4: Save individual dependency verdicts
      for (const verdict of complianceReport.dependencyVerdicts) {
        await PolicyComplianceResult.create({
          library: verdict.library,
          spdxExpression: verdict.spdxExpression,
          complianceResult: verdict.complianceResult,
          explanation: verdict.explanation,
          complianceRunId: complianceRun.id
        });
      }

      logger.info(`Compliance evaluation complete. UUID: ${complianceRun.uuid}`);

      // Step 5: Return dependencies along with PaaC evaluation metadata
      res.json({
        uuid: complianceRun.uuid,
        overallVerdict: complianceReport.overallVerdict,
        totalDependencies: dependencies.length,
        dependencies
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
