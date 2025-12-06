const logger = require('./logger');

class DockerConfig {
  constructor() {
    this.dockerImage = process.env.DOCKER_IMAGE || 'ghcr.io/oss-review-toolkit/ort:latest';
    this.dockerWorkspace = process.env.DOCKER_WORKSPACE || '/workspace';
    this.analyzerWorkDir = process.env.ANALYZER_WORK_DIR || '/tmp/oss-analyzer';

    logger.info(`Docker image: ${this.dockerImage}`);
    logger.info(`Docker workspace: ${this.dockerWorkspace}`);
    logger.info(`Analyzer work directory: ${this.analyzerWorkDir}`);
  }

  getDockerImage() {
    return this.dockerImage;
  }

  getDockerWorkspace() {
    return this.dockerWorkspace;
  }

  getAnalyzerWorkDir() {
    return this.analyzerWorkDir;
  }
}

module.exports = new DockerConfig();
