const express = require('express');
const { body, validationResult } = require('express-validator');
const complianceRunService = require('../services/ComplianceRunService');
const logger = require('../config/logger');

const router = express.Router();

/**
 * GET /api/compliance-runs
 * List all compliance runs
 */
router.get('/', async (req, res, next) => {
  try {
    const runs = await complianceRunService.getAllRuns();
    res.json(runs);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/compliance-runs/:uuid
 * Get specific compliance run with results
 */
router.get('/:uuid', async (req, res, next) => {
  try {
    const { uuid } = req.params;

    const run = await complianceRunService.getRunByUuid(uuid);

    if (!run) {
      return res.status(404).json({ error: 'Compliance run not found' });
    }

    res.json(run);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/compliance-runs/:uuid
 * Update overall verdict for a compliance run
 */
router.put('/:uuid',
  body('overallVerdict').notEmpty().withMessage('overallVerdict field is required')
    .isIn(['COMPLIANT', 'NEEDS_REVIEW', 'NON_COMPLIANT'])
    .withMessage('overallVerdict must be COMPLIANT, NEEDS_REVIEW, or NON_COMPLIANT'),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
      }

      const { uuid } = req.params;
      const { overallVerdict } = req.body;

      logger.info(`Updating verdict for run ${uuid} to ${overallVerdict}`);

      const updatedRun = await complianceRunService.updateVerdict(uuid, overallVerdict);

      if (!updatedRun) {
        return res.status(404).json({ error: 'Compliance run not found' });
      }

      res.json(updatedRun);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
