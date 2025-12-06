const path = require('path');
const logger = require('../config/logger');
const GitHubApiClient = require('../utils/GitHubApiClient');
const licenseAnalyzer = require('./LicenseAnalyzerService');

class GitHubRepoService {
  constructor() {
    this.githubClient = new GitHubApiClient();
  }

  /**
   * Analyze a GitHub repository for license compliance
   * @param {string} repoUrl - GitHub repository URL
   * @returns {Promise<Array>} Array of DependencyLicenseInfo objects
   */
  async analyzeRepository(repoUrl) {
    logger.info(`Starting analysis of repository: ${repoUrl}`);

    // Parse GitHub URL
    const { owner, repo } = this.parseGitHubUrl(repoUrl);

    // Get repository information
    const repoInfo = await this.githubClient.getRepository(owner, repo);
    const defaultBranch = repoInfo.default_branch || 'main';

    logger.info(`Repository: ${owner}/${repo}, Branch: ${defaultBranch}`);

    // Get repository tree
    const tree = await this.githubClient.getTree(owner, repo, defaultBranch);

    // Find supported manifest files
    const manifestFiles = this.findManifestFiles(tree.tree);

    if (manifestFiles.length === 0) {
      const supportedFormats = licenseAnalyzer.getSupportedManifests();
      const examples = [
        'JavaScript/Node.js: package.json',
        'Java: pom.xml, build.gradle',
        'Python: requirements.txt, setup.py, pyproject.toml',
        'Ruby: Gemfile',
        'Go: go.mod',
        'Rust: Cargo.toml',
        '.NET: *.csproj, packages.config',
        'PHP: composer.json',
        'Swift: Package.swift, Podfile'
      ];

      throw new Error(
        `No supported dependency manifest files found in repository '${owner}/${repo}'.\n\n` +
        `Supported manifest files include:\n${examples.join('\n')}\n\n` +
        `This repository may be:\n` +
        `• A library/application without declared dependencies\n` +
        `• Using an unsupported package manager\n` +
        `• A documentation-only or non-code repository\n\n` +
        `Please ensure the repository contains one of the supported manifest files in its root or subdirectories.`
      );
    }

    logger.info(`Found ${manifestFiles.length} manifest file(s): ${manifestFiles.join(', ')}`);

    // Create working directory for analysis
    const workDir = licenseAnalyzer.createWorkingDirectory();

    // Download manifest files
    for (const manifestFile of manifestFiles) {
      const fileUrl = this.githubClient.getRawFileUrl(owner, repo, defaultBranch, manifestFile);
      await this.githubClient.downloadFileToDirectory(fileUrl, path.basename(manifestFile), workDir);
    }

    // Download lockfiles if they exist
    const lockfilesFound = await this.downloadLockfiles(tree.tree, owner, repo, defaultBranch, workDir);

    // If no lockfile found for package.json, try to generate it
    if (!lockfilesFound && manifestFiles[0].endsWith('package.json')) {
      logger.info('No lockfile found, attempting to generate package-lock.json...');
      await this.generateNpmLockfile(workDir);
    }

    // Initialize git repository in working directory (ORT requires VCS info)
    await this.initializeGitRepo(workDir, owner, repo, defaultBranch);

    // Analyze using the working directory we already prepared
    // Pass the working directory so it doesn't create a new one
    const dependencies = await this.analyzeInPlace(workDir);

    logger.info(`Analysis complete for ${owner}/${repo}`);

    return dependencies;
  }

  /**
   * Parse GitHub URL to extract owner and repo
   * @param {string} url - GitHub repository URL
   * @returns {Object} Object with owner and repo
   */
  parseGitHubUrl(url) {
    if (!url || !url.includes('github.com')) {
      throw new Error('Invalid GitHub repository URL');
    }

    // Handle different GitHub URL formats
    // https://github.com/owner/repo
    // https://github.com/owner/repo.git
    // github.com/owner/repo

    let cleanUrl = url.replace(/\.git$/, '');
    cleanUrl = cleanUrl.replace(/^https?:\/\//, '');
    cleanUrl = cleanUrl.replace(/^github\.com\//, '');

    const parts = cleanUrl.split('/');

    if (parts.length < 2) {
      throw new Error('Invalid GitHub repository URL format');
    }

    return {
      owner: parts[0],
      repo: parts[1]
    };
  }

  /**
   * Find supported manifest files in repository tree
   * @param {Array} tree - GitHub tree array
   * @returns {Array} Array of manifest file paths
   */
  findManifestFiles(tree) {
    const supportedManifests = licenseAnalyzer.getSupportedManifests();
    const manifestFiles = [];

    for (const item of tree) {
      if (item.type === 'blob') {
        const fileName = path.basename(item.path);

        // Check for exact match
        if (supportedManifests.includes(fileName)) {
          manifestFiles.push(item.path);
          continue;
        }

        // Check for wildcard patterns (*.csproj, *.spdx, etc.)
        for (const pattern of supportedManifests) {
          if (pattern.startsWith('*.')) {
            const extension = pattern.substring(1); // Remove the *
            if (fileName.endsWith(extension)) {
              manifestFiles.push(item.path);
              break;
            }
          }
        }
      }
    }

    return manifestFiles;
  }

  /**
   * Download lockfiles from repository (package-lock.json, yarn.lock, etc.)
   * @param {Array} tree - GitHub tree array
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name
   * @param {string} workDir - Working directory
   * @returns {Promise<boolean>} True if lockfiles were found and downloaded
   */
  async downloadLockfiles(tree, owner, repo, branch, workDir) {
    const lockfiles = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'Gemfile.lock',
      'Cargo.lock',
      'poetry.lock',
      'Pipfile.lock'
    ];

    const foundLockfiles = [];

    for (const item of tree) {
      if (item.type === 'blob') {
        const fileName = path.basename(item.path);

        if (lockfiles.includes(fileName)) {
          foundLockfiles.push(item.path);
        }
      }
    }

    if (foundLockfiles.length > 0) {
      logger.info(`Found ${foundLockfiles.length} lockfile(s): ${foundLockfiles.join(', ')}`);

      for (const lockfile of foundLockfiles) {
        try {
          const fileUrl = this.githubClient.getRawFileUrl(owner, repo, branch, lockfile);
          await this.githubClient.downloadFileToDirectory(fileUrl, path.basename(lockfile), workDir);
        } catch (error) {
          logger.warn(`Failed to download lockfile ${lockfile}: ${error.message}`);
        }
      }
      return true;
    } else {
      logger.warn('No lockfiles found in repository');
      return false;
    }
  }

  /**
   * Analyze files in an existing working directory (without copying)
   * @param {string} workDir - Working directory with manifest and lockfiles
   * @returns {Promise<Array>} Array of DependencyLicenseInfo objects
   */
  async analyzeInPlace(workDir) {
    logger.info(`Analyzing files in ${workDir}`);

    // Ensure output directory exists
    const outputDir = path.join(workDir, 'output');
    if (!require('fs').existsSync(outputDir)) {
      require('fs').mkdirSync(outputDir, { recursive: true });
    }

    // Execute ORT analysis
    const ortOutput = await licenseAnalyzer.executeOrt(workDir);

    // Parse ORT result
    const analyzerResultPath = path.join(workDir, 'output', 'analyzer-result.json');

    if (!require('fs').existsSync(analyzerResultPath)) {
      throw new Error('ORT analysis failed to produce output');
    }

    const analyzerResult = JSON.parse(require('fs').readFileSync(analyzerResultPath, 'utf8'));

    // Check for ORT issues/errors
    const ortIssues = licenseAnalyzer.checkOrtIssues(analyzerResult);
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
    const dependencies = licenseAnalyzer.extractDependencies(analyzerResult);

    logger.info(`Analysis complete. Found ${dependencies.length} dependencies`);

    return dependencies;
  }

  /**
   * Initialize a Git repository in the working directory
   * ORT requires VCS information to function properly
   * @param {string} workDir - Working directory
   * @param {string} owner - Repository owner
   * @param {string} repo - Repository name
   * @param {string} branch - Branch name
   */
  async initializeGitRepo(workDir, owner, repo, branch) {
    const { execSync } = require('child_process');

    try {
      logger.info('Initializing Git repository for ORT...');

      // Initialize git repo
      execSync('git init', { cwd: workDir, stdio: 'ignore' });

      // Configure git (required for commit)
      execSync('git config user.name "OSS Analyzer"', { cwd: workDir, stdio: 'ignore' });
      execSync('git config user.email "analyzer@localhost"', { cwd: workDir, stdio: 'ignore' });

      // Add remote origin (provides VCS info to ORT)
      const remoteUrl = `https://github.com/${owner}/${repo}.git`;
      execSync(`git remote add origin ${remoteUrl}`, { cwd: workDir, stdio: 'ignore' });

      // Add all files and commit (ORT needs a commit)
      execSync('git add .', { cwd: workDir, stdio: 'ignore' });
      execSync('git commit -m "Initial commit for analysis"', { cwd: workDir, stdio: 'ignore' });

      // Create a branch with the same name as the source
      if (branch !== 'master' && branch !== 'main') {
        execSync(`git branch -M ${branch}`, { cwd: workDir, stdio: 'ignore' });
      }

      logger.info(`Git repository initialized with origin ${remoteUrl}`);
    } catch (error) {
      logger.warn(`Failed to initialize Git repository: ${error.message}`);
      // Don't fail the analysis, ORT might still work
    }
  }

  /**
   * Generate npm lockfile by running npm install
   * @param {string} workDir - Working directory containing package.json
   */
  async generateNpmLockfile(workDir) {
    const { spawn } = require('child_process');
    const fs = require('fs');

    return new Promise((resolve, reject) => {
      logger.info('Running npm install to generate package-lock.json...');

      const npmProcess = spawn('npm', ['install', '--package-lock-only', '--ignore-scripts'], {
        cwd: workDir,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      npmProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        logger.debug(`npm: ${data.toString().trim()}`);
      });

      npmProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        logger.debug(`npm stderr: ${data.toString().trim()}`);
      });

      npmProcess.on('close', (code) => {
        if (code === 0) {
          const lockfilePath = `${workDir}/package-lock.json`;
          if (fs.existsSync(lockfilePath)) {
            logger.info('Successfully generated package-lock.json');
            resolve();
          } else {
            logger.warn('npm install succeeded but package-lock.json was not created');
            resolve(); // Don't fail, let ORT handle it
          }
        } else {
          logger.warn(`npm install failed with exit code ${code}: ${stderr}`);
          resolve(); // Don't fail, let ORT handle it
        }
      });

      npmProcess.on('error', (error) => {
        logger.warn(`Failed to run npm install: ${error.message}`);
        resolve(); // Don't fail, let ORT handle it
      });
    });
  }
}

module.exports = new GitHubRepoService();
