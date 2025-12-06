# LACES - License Analyzing and Compliance Evaluation Service

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![ORT](https://img.shields.io/badge/ORT-Latest-orange.svg)](https://github.com/oss-review-toolkit/ort)

A comprehensive web-based application for analyzing GitHub repositories for open-source license compliance using the OSS Review Toolkit (ORT) and Policy-as-Code evaluation.

## Overview

LACES (License Analyzing and Compliance Evaluation Service) is a Node.js-based application that automates the process of:
- Analyzing GitHub repositories for dependency licenses
- Evaluating license compliance against configurable policies
- Tracking compliance history
- Providing detailed compliance reports with UUIDs
- Managing compliance verdicts through an intuitive web interface

## Key Features

- **GitHub Repository Analysis**: Automatically analyze any public GitHub repository
- **52+ Manifest File Support**: Supports JavaScript, Java, Python, Ruby, Go, Rust, PHP, .NET, Swift, Scala, Haskell, Dart, C/C++, and SPDX formats
- **Policy-as-Code Evaluation**: Configurable license approval/denial lists
- **SPDX License Database**: Browse and search 500+ SPDX licenses with FSF/OSI approval indicators
- **Compliance Tracking**: Track and update compliance verdicts over time
- **CSV Export**: Download compliance reports as CSV
- **UUID-based Search**: Search and retrieve compliance results by unique identifiers
- **Web-based UI**: Modern, responsive interface built with Alpine.js and Bootstrap 5

## Architecture

```
┌─────────────────┐
│  Web Browser    │
│  (Alpine.js)    │
└────────┬────────┘
         │ HTTP
         ▼
┌─────────────────┐
│  Express.js     │
│  API Server     │
└────────┬────────┘
         │
    ┌────┴─────┬──────────┬────────────┐
    ▼          ▼          ▼            ▼
┌────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│GitHub  │ │  ORT   │ │ Policy   │ │ SQLite   │
│  API   │ │ Docker │ │Evaluator │ │    DB    │
└────────┘ └────────┘ └──────────┘ └──────────┘
```

## Prerequisites

- **Node.js 18 or higher**
- **Docker Desktop** (for ORT analysis)
- **Git** (for repository operations)
- **GitHub Personal Access Token** (optional, for higher API rate limits)

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/srivatssan/License-Analyzing-and-Compliance-Evaluation-Service.git
cd License-Analyzing-and-Compliance-Evaluation-Service
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root:

```bash
# Server Configuration
PORT=8080
NODE_ENV=development

# Security
SHUTDOWN_API_KEY=your-secure-random-key-here

# GitHub API (Optional - for higher rate limits)
GITHUB_TOKEN=ghp_your_github_personal_access_token

# Analysis Configuration
ANALYZER_WORK_DIR=/tmp/oss-analyzer

# Policy Configuration
APPROVED_LICENSES=MIT,Apache-2.0,BSD-2-Clause,BSD-3-Clause,ISC,0BSD,Unlicense,CC0-1.0,EPL-2.0,MPL-2.0
DENIED_LICENSES=SSPL-1.0,BSL-1.1,RPL-1.5,GPL-3.0,AGPL-3.0

# Database
DATABASE_PATH=./data/paacdb.sqlite

# Docker Configuration
DOCKER_IMAGE=ghcr.io/oss-review-toolkit/ort:latest
DOCKER_WORKSPACE=/workspace

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 4. Pull ORT Docker Image
```bash
docker pull ghcr.io/oss-review-toolkit/ort:latest
```

### 5. Start the Application
```bash
npm start
```

The application will be available at `http://localhost:8080`

## Usage

### Analyzing a GitHub Repository

1. Navigate to `http://localhost:8080`
2. Enter a GitHub repository URL (e.g., `https://github.com/expressjs/express`)
3. Click "Analyze Repository"
4. Wait for the analysis to complete (30-120 seconds)
5. View results with overall verdict and dependency details

## Supported Manifest Files

**52+ manifest file types** across **15+ programming languages**:

| Language | Manifest Files |
|----------|----------------|
| **JavaScript/Node.js** | package.json, bower.json |
| **Java** | pom.xml, build.gradle, build.gradle.kts |
| **Python** | requirements.txt, setup.py, pyproject.toml, Pipfile |
| **Ruby** | Gemfile, Gemfile.lock |
| **Go** | go.mod, go.sum |
| **Rust** | Cargo.toml, Cargo.lock |
| **PHP** | composer.json |
| **.NET/C#** | *.csproj, *.fsproj, *.vbproj, packages.config |
| **Swift/iOS** | Package.swift, Podfile, Cartfile |
| **Scala** | build.sbt |
| **Haskell** | stack.yaml, cabal.project |
| **Dart/Flutter** | pubspec.yaml |
| **C/C++** | conanfile.txt, conanfile.py, WORKSPACE, BUILD |
| **SPDX** | *.spdx, *.spdx.json, *.spdx.yaml |

## Project Structure

```
oss-license-analyzer/
├── src/
│   ├── config/          # Configuration (database, logger, policy, docker)
│   ├── models/          # Sequelize models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── utils/           # Utility classes
│   ├── middleware/      # Express middleware
│   ├── data/spdx/       # SPDX license data
│   └── server.js        # Express app entry point
├── public/              # Static files (HTML, CSS, images)
├── data/                # SQLite database
├── logs/                # Application logs
└── package.json
```

## API Endpoints

### GitHub Analysis
- `POST /api/github/analyze` - Analyze GitHub repository

### SPDX Licenses
- `GET /api/spdx/all` - Get all licenses
- `GET /api/spdx/search?q={query}` - Search licenses
- `GET /api/spdx/fuzzy?q={query}` - Fuzzy match license
- `GET /api/spdx/deprecated` - Get deprecated licenses
- `GET /api/spdx/stats` - Get license statistics

### Policy Compliance
- `POST /api/policy/check` - Evaluate compliance
- `GET /api/policy/check` - Get latest report
- `GET /api/policy/check/:uuid` - Get run results
- `GET /api/policy/check/overall/:uuid` - Get overall verdict

### Compliance Runs
- `GET /api/compliance-runs` - List all runs
- `GET /api/compliance-runs/:uuid` - Get run details
- `PUT /api/compliance-runs/:uuid` - Update verdict

### System
- `GET /health` - Health check
- `POST /api/shutdown` - Graceful shutdown (requires API key)

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `PORT` - Server port (default: 8080)
- `GITHUB_TOKEN` - GitHub personal access token
- `APPROVED_LICENSES` - Comma-separated list of approved licenses
- `DENIED_LICENSES` - Comma-separated list of denied licenses
- `DOCKER_IMAGE` - ORT Docker image (default: ghcr.io/oss-review-toolkit/ort:latest)

## Testing

Run tests:
```bash
npm test
```

## License

MIT
