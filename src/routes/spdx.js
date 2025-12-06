const express = require('express');
const spdxRegistry = require('../services/SpdxLicenseRegistry');
const SpdxLicenseSearchUtil = require('../utils/SpdxLicenseSearchUtil');

const router = express.Router();

/**
 * GET /api/spdx/all
 * Get all SPDX licenses
 */
router.get('/all', (req, res) => {
  const licenses = spdxRegistry.getAllLicenses();
  res.json(licenses);
});

/**
 * GET /api/spdx/search?q={query}
 * Search licenses by partial text match
 */
router.get('/search', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const allLicenses = spdxRegistry.getAllLicenses();
  const results = SpdxLicenseSearchUtil.searchByPartial(q, allLicenses);

  res.json(results);
});

/**
 * GET /api/spdx/fuzzy?q={query}
 * Fuzzy match license name
 */
router.get('/fuzzy', (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  const allLicenses = spdxRegistry.getAllLicenses();
  const result = SpdxLicenseSearchUtil.fuzzyMatch(q, allLicenses);

  if (!result) {
    return res.status(404).json({ error: 'No fuzzy match found' });
  }

  res.json(result);
});

/**
 * GET /api/spdx/deprecated
 * Get deprecated licenses
 */
router.get('/deprecated', (req, res) => {
  const allLicenses = spdxRegistry.getAllLicenses();
  const deprecated = SpdxLicenseSearchUtil.getDeprecated(allLicenses);

  res.json(deprecated);
});

/**
 * GET /api/spdx/stats
 * Get SPDX registry statistics
 */
router.get('/stats', (req, res) => {
  const allLicenses = spdxRegistry.getAllLicenses();
  const stats = SpdxLicenseSearchUtil.getStats(allLicenses);

  res.json(stats);
});

module.exports = router;
