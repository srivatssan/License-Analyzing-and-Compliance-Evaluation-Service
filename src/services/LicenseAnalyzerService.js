const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');
const dockerConfig = require('../config/docker');
const spdxRegistry = require('./SpdxLicenseRegistry');
const SpdxLicenseSearchUtil = require('../utils/SpdxLicenseSearchUtil');

class LicenseAnalyzerService {
  constructor() {
    this.supportedManifests = [
      // JavaScript/Node.js
      'package.json',           // NPM, Yarn, PNPM
      'bower.json',             // Bower

      // Java
      'pom.xml',                // Maven
      'build.gradle',           // Gradle
      'build.gradle.kts',       // Gradle Kotlin DSL

      // Python
      'requirements.txt',       // pip
      'setup.py',               // setuptools
      'pyproject.toml',         // Poetry, PEP 518
      'Pipfile',                // Pipenv
      'Pipfile.lock',           // Pipenv lockfile

      // Ruby
      'Gemfile',                // Bundler
      'Gemfile.lock',           // Bundler lockfile

      // PHP
      'composer.json',          // Composer

      // .NET/C#
      'packages.config',        // NuGet (old format)
      '*.csproj',               // .NET project files
      '*.fsproj',               // F# project files
      '*.vbproj',               // VB.NET project files

      // Go
      'go.mod',                 // Go modules
      'go.sum',                 // Go modules checksum

      // Rust
      'Cargo.toml',             // Cargo
      'Cargo.lock',             // Cargo lockfile

      // Swift/iOS
      'Package.swift',          // Swift Package Manager
      'Podfile',                // CocoaPods
      'Podfile.lock',           // CocoaPods lockfile
      'Cartfile',               // Carthage

      // Scala
      'build.sbt',              // SBT

      // Haskell
      'stack.yaml',             // Stack
      'cabal.project',          // Cabal

      // Dart/Flutter
      'pubspec.yaml',           // Pub

      // C/C++
      'conanfile.txt',          // Conan
      'conanfile.py',           // Conan
      'WORKSPACE',              // Bazel
      'BUILD',                  // Bazel

      // Generic/SPDX
      '*.spdx',                 // SPDX documents
      '*.spdx.json',            // SPDX JSON
      '*.spdx.yaml',            // SPDX YAML
      '*.spdx.yml'              // SPDX YAML (alternate)
    ];
  }

  /**
   * Analyze a manifest file using ORT
   * @param {string} filePath - Path to manifest file
   * @returns {Promise<Array>} Array of DependencyLicenseInfo objects
   */
  async analyze(filePath) {
    const workDir = this.createWorkingDirectory();

    try {
      // Copy manifest file to working directory
      const fileName = path.basename(filePath);
      const destPath = path.join(workDir, fileName);
      fs.copyFileSync(filePath, destPath);

      logger.info(`Analyzing ${fileName} in ${workDir}`);

      // Execute ORT analysis
      const ortOutput = await this.executeOrt(workDir);

      // Parse ORT result
      const analyzerResultPath = path.join(workDir, 'output', 'analyzer-result.json');

      if (!fs.existsSync(analyzerResultPath)) {
        throw new Error('ORT analysis failed to produce output');
      }

      const analyzerResult = JSON.parse(fs.readFileSync(analyzerResultPath, 'utf8'));

      // Check for ORT issues/errors
      const ortIssues = this.checkOrtIssues(analyzerResult);
      if (ortIssues && ortIssues.length > 0) {
        const errorMessages = ortIssues.map(issue => issue.message).join('; ');
        logger.warn(`ORT reported issues: ${errorMessages}`);

        // If all issues are about lockfiles, provide helpful message
        const lockfileIssues = ortIssues.filter(issue =>
          issue.message.includes('No lockfile found') ||
          issue.message.includes('lockfile')
        );

        if (lockfileIssues.length > 0) {
          throw new Error(
            'Failed to resolve dependencies. The repository does not have a committed lockfile, ' +
            'and automatic lockfile generation failed. This may be due to network issues, ' +
            'invalid package.json, or dependencies that cannot be resolved. ' +
            'Try analyzing a repository with a committed lockfile (package-lock.json, yarn.lock, etc.).'
          );
        }
      }

      // Extract dependency license information
      const dependencies = this.extractDependencies(analyzerResult);

      // Generate license report
      const reportPath = path.join(workDir, 'output', 'license-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(dependencies, null, 2));

      logger.info(`Analysis complete. Found ${dependencies.length} dependencies`);

      return dependencies;
    } catch (error) {
      logger.error('License analysis failed:', error);
      throw error;
    } finally {
      // Optionally cleanup working directory
      // this.cleanupWorkingDirectory(workDir);
    }
  }

  /**
   * Create a unique working directory for ORT analysis
   * @returns {string} Working directory path
   */
  createWorkingDirectory() {
    const timestamp = Date.now();
    const workDir = path.join(dockerConfig.getAnalyzerWorkDir(), `scan-${timestamp}`);

    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, { recursive: true });
    }

    const outputDir = path.join(workDir, 'output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return workDir;
  }

  /**
   * Execute ORT analyzer using ephemeral Docker container
   * @param {string} workDir - Working directory path
   * @returns {Promise<string>} ORT output
   */
  async executeOrt(workDir) {
    return new Promise((resolve, reject) => {
      const dockerImage = dockerConfig.getDockerImage();

      // Docker run command with volume mount
      const dockerArgs = [
        'run',
        '--rm',
        '-v', `${workDir}:/workspace`,
        dockerImage,
        'analyze',
        '-i', '/workspace',
        '-o', '/workspace/output',
        '--output-formats', 'JSON'
      ];

      logger.debug(`Executing: docker ${dockerArgs.join(' ')}`);

      const ortProcess = spawn('docker', dockerArgs);

      let stdout = '';
      let stderr = '';

      ortProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        logger.debug(`ORT: ${output.trim()}`);
      });

      ortProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        logger.debug(`ORT Error: ${output.trim()}`);
      });

      ortProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('ORT analysis completed successfully');
          resolve(stdout);
        } else {
          // ORT may produce output even with non-zero exit code
          // Log the error but don't reject immediately
          logger.warn(`ORT analysis completed with exit code ${code}`);
          if (stderr) {
            logger.warn(`ORT STDERR: ${stderr}`);
          }
          resolve(stdout); // Resolve anyway, let downstream handle partial results
        }
      });

      ortProcess.on('error', (error) => {
        logger.error('Failed to start ORT process:', error);
        reject(new Error(`Failed to execute ORT: ${error.message}`));
      });
    });
  }

  /**
   * Check for issues in ORT analyzer result
   * @param {Object} analyzerResult - ORT analyzer result JSON
   * @returns {Array} Array of issues
   */
  checkOrtIssues(analyzerResult) {
    const allIssues = [];

    if (analyzerResult.analyzer && analyzerResult.analyzer.result && analyzerResult.analyzer.result.issues) {
      const issues = analyzerResult.analyzer.result.issues;

      // Collect all issues from all projects
      for (const projectId in issues) {
        if (Array.isArray(issues[projectId])) {
          allIssues.push(...issues[projectId]);
        }
      }
    }

    return allIssues;
  }

  /**
   * Extract dependency license information from ORT analyzer result
   * @param {Object} analyzerResult - ORT analyzer result JSON
   * @returns {Array} Array of DependencyLicenseInfo objects
   */
  extractDependencies(analyzerResult) {
    const dependencies = [];

    if (!analyzerResult.analyzer || !analyzerResult.analyzer.result) {
      logger.warn('No analyzer result found in ORT output');
      return dependencies;
    }

    const packages = analyzerResult.analyzer.result.packages || [];

    for (const pkg of packages) {
      // The id is a string like "NPM::accepts:2.0.0"
      const id = pkg.id || '';
      const name = id;

      // Extract version from the id string (last part after last colon)
      const parts = id.split(':');
      const version = parts[parts.length - 1] || 'unknown';

      // Extract license information
      const declaredLicenses = pkg.declared_licenses_processed?.spdx_expression ||
                               pkg.declared_licenses?.[0] ||
                               'NOASSERTION';

      const spdxExpression = declaredLicenses;

      // Try to find SPDX URL
      const licenseUrl = this.findSpdxUrl(spdxExpression);

      dependencies.push({
        name,
        version,
        license: spdxExpression,
        licenseUrl,
        spdxExpression
      });
    }

    return dependencies;
  }

  /**
   * Find SPDX URL for a license expression
   * @param {string} spdxExpression - SPDX license expression
   * @returns {string} SPDX URL
   */
  findSpdxUrl(spdxExpression) {
    // Extract first license ID from expression
    const tokens = spdxExpression.match(/[A-Za-z0-9.\-+]+/g) || [];

    for (const token of tokens) {
      if (token === 'AND' || token === 'OR' || token === 'WITH') continue;

      const url = spdxRegistry.getSpdxUrl(token);
      if (url) return url;

      // Try fuzzy matching
      const allLicenses = spdxRegistry.getAllLicenses();
      const fuzzyMatch = SpdxLicenseSearchUtil.fuzzyMatch(token, allLicenses);
      if (fuzzyMatch) {
        return spdxRegistry.getSpdxUrl(fuzzyMatch.licenseId);
      }
    }

    return `https://spdx.org/licenses/${spdxExpression}.html`;
  }

  /**
   * Cleanup working directory
   * @param {string} workDir - Working directory to cleanup
   */
  cleanupWorkingDirectory(workDir) {
    try {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true, force: true });
        logger.debug(`Cleaned up working directory: ${workDir}`);
      }
    } catch (error) {
      logger.warn(`Failed to cleanup working directory ${workDir}:`, error);
    }
  }

  /**
   * Check if a file is a supported manifest
   * @param {string} fileName - File name to check
   * @returns {boolean} True if supported
   */
  isSupportedManifest(fileName) {
    return this.supportedManifests.includes(fileName);
  }

  /**
   * Get list of supported manifest files
   * @returns {Array} Array of supported manifest file names
   */
  getSupportedManifests() {
    return [...this.supportedManifests];
  }
}

module.exports = new LicenseAnalyzerService();
