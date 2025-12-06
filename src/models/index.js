const ComplianceRun = require('./ComplianceRun');
const PolicyComplianceResult = require('./PolicyComplianceResult');

// Define associations
ComplianceRun.hasMany(PolicyComplianceResult, {
  foreignKey: 'complianceRunId',
  as: 'results',
  onDelete: 'CASCADE'
});

PolicyComplianceResult.belongsTo(ComplianceRun, {
  foreignKey: 'complianceRunId',
  as: 'complianceRun'
});

module.exports = {
  ComplianceRun,
  PolicyComplianceResult
};
