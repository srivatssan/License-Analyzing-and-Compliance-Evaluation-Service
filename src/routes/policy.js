const express = require('express');
const { body, validationResult } = require('express-validator');
const complianceEvaluator = require('../services/ComplianceEvaluator');
const complianceRunService = require('../services/ComplianceRunService');
const logger = require('../config/logger');

const router = express.Router();

// In-memory cache for latest compliance report (optional)
let latestReport = null;

/**
 * POST /api/policy/check
 * Evaluate dependencies against compliance policy
 */
router.post('/check',
  body('dependencies').isArray().withMessage('dependencies must be an array'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { dependencies, filePath } = req.body;

      logger.info(`Evaluating compliance for ${dependencies.length} dependencies`);

      const complianceReport = complianceEvaluator.evaluate(dependencies);

      // Save to database
      const savedReport = await complianceRunService.saveComplianceRun(
        complianceReport,
        filePath || 'unknown'
      );

      // Cache latest report
      latestReport = savedReport;

      res.json(savedReport);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/policy/check
 * Get latest compliance report from cache
 */
router.get('/check', (req, res) => {
  if (!latestReport) {
    return res.status(404).json({ error: 'No compliance report available' });
  }

  res.json(latestReport);
});

/**
 * GET /api/policy/check/:uuid
 * Get detailed results for a compliance run
 */
router.get('/check/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const results = await complianceRunService.getResultsByUuid(uuid);

    if (!results) {
      return res.status(404).json({ error: 'Compliance run not found' });
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/policy/check/overall/:uuid
 * Get overall verdict for a compliance run
 */
router.get('/check/overall/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const verdict = await complianceRunService.getOverallVerdictByUuid(uuid);

    if (!verdict) {
      return res.status(404).json({ error: 'Compliance run not found' });
    }

    res.send(verdict);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
