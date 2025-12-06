const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

class PolicyComplianceResult extends Model {}

PolicyComplianceResult.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  library: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  spdxExpression: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'spdx_expression'
  },
  complianceResult: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'compliance_result'
  },
  explanation: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  complianceRunId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'compliance_run_id',
    references: {
      model: 'compliance_run',
      key: 'id'
    }
  }
}, {
  sequelize,
  modelName: 'PolicyComplianceResult',
  tableName: 'policy_compliance_result',
  timestamps: false,
  indexes: [
    {
      fields: ['compliance_run_id']
    },
    {
      fields: ['compliance_result']
    }
  ]
});

module.exports = PolicyComplianceResult;
