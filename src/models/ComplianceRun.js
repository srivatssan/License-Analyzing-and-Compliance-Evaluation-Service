const { DataTypes, Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');

class ComplianceRun extends Model {}

ComplianceRun.init({
  id: {
    type: DataTypes.UUID,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  uuid: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: () => uuidv4()
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false,
    field: 'file_path'
  },
  overallVerdict: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'overall_verdict'
  },
  analyzedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'analyzed_at'
  },
  validatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'validated_at'
  },
  validationVerdict: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'validation_verdict'
  }
}, {
  sequelize,
  modelName: 'ComplianceRun',
  tableName: 'compliance_run',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['uuid']
    },
    {
      fields: ['analyzed_at']
    }
  ]
});

module.exports = ComplianceRun;
