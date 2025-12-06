const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

class GitHubApiClient {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.baseUrl = 'https://api.github.com';

    if (!this.token) {
      logger.warn('GitHub token not configured - API rate limits will be restrictive');
    }
  }

  getHeaders() {
    const headers = {
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'OSS-License-Analyzer'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async getJson(url) {
    try {
      logger.debug(`Fetching: ${url}`);
      const response = await axios.get(url, {
        headers: this.getHeaders(),
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        if (status === 404) {
          throw new Error('Repository not found or not accessible');
        } else if (status === 403) {
          throw new Error('GitHub API rate limit exceeded or insufficient permissions');
        } else if (status === 401) {
          throw new Error('Invalid GitHub token');
        }
      }
      throw new Error(`GitHub API request failed: ${error.message}`);
    }
  }

  async downloadFileToDirectory(fileUrl, fileName, targetDir) {
    try {
      logger.debug(`Downloading ${fileName} from ${fileUrl}`);

      const response = await axios.get(fileUrl, {
        headers: this.getHeaders(),
        responseType: 'text',
        timeout: 30000
      });

      // Ensure target directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filePath = path.join(targetDir, fileName);
      fs.writeFileSync(filePath, response.data, 'utf8');

      logger.info(`Downloaded ${fileName} to ${filePath}`);
      return filePath;
    } catch (error) {
      throw new Error(`Failed to download file ${fileName}: ${error.message}`);
    }
  }

  async getRepository(owner, repo) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}`;
    return await this.getJson(url);
  }

  async getTree(owner, repo, branch) {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    return await this.getJson(url);
  }

  getRawFileUrl(owner, repo, branch, filePath) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
  }
}

module.exports = GitHubApiClient;
