# Known Issues & Solutions

## Issue: "Repository analysis requires a lockfile"

### Problem
When analyzing GitHub repositories, you get the error:
```
Repository analysis requires a lockfile (package-lock.json, yarn.lock, etc.).
Please ensure the repository has a lockfile committed, or download the repository locally with a lockfile and analyze it.
```

### Why This Happens
ORT (OSS Review Toolkit) requires lockfiles to ensure consistent dependency resolution. Many repositories don't commit their lockfiles to version control (especially for libraries).

### Solutions

#### Solution 1: Test with Repositories That Have Lockfiles
Use repositories that commit their lockfiles. Examples:
- https://github.com/facebook/create-react-app (has package-lock.json)
- https://github.com/vercel/next.js (has package-lock.json)
- https://github.com/microsoft/vscode (has yarn.lock)

#### Solution 2: Create a Test Repository
1. Create a simple test repository with a lockfile:
```bash
mkdir test-repo
cd test-repo
npm init -y
npm install express lodash
git init
git add .
git commit -m "Initial commit with lockfile"
```

2. Push to GitHub and analyze it

#### Solution 3: Analyze Local Projects
For repositories without lockfiles:

1. Clone the repository locally:
```bash
git clone https://github.com/expressjs/express
cd express
```

2. Generate the lockfile:
```bash
npm install  # Creates package-lock.json
```

3. Create a simple test to use the local analyzer service:
```bash
# Copy the package.json and package-lock.json to a test directory
mkdir -p /tmp/test-analysis
cp package.json package-lock.json /tmp/test-analysis/
```

4. Modify the code to accept local file paths (enhancement needed)

#### Solution 4: Enable Dynamic Versions (Advanced)
Configure ORT to allow analysis without lockfiles:

1. Create ORT config file: `.ort/config.yml`
```yaml
analyzer:
  allowDynamicVersions: true
```

2. Mount this config when running ORT Docker:
```javascript
// In LicenseAnalyzerService.js, modify Docker args:
'-v', `${configPath}:/home/ort/.ort`,
```

### Recommended Repositories for Testing

✅ **Working (have lockfiles):**
- https://github.com/facebook/create-react-app
- https://github.com/vercel/next.js
- https://github.com/microsoft/vscode
- https://github.com/nodejs/node
- https://github.com/webpack/webpack

❌ **Won't Work (no lockfiles):**
- https://github.com/expressjs/express
- https://github.com/lodash/lodash
- https://github.com/axios/axios
- Most library repositories (they don't commit lockfiles)

### Why Libraries Don't Commit Lockfiles

Libraries typically don't commit lockfiles because:
1. They want consumers to get the latest compatible versions
2. Lockfiles can create conflicts in version resolution
3. They use semver ranges instead of exact versions

### Future Enhancements

Possible improvements to handle this better:
1. Add local file upload feature
2. Integrate with GitHub Actions to generate lockfiles
3. Add support for analyzing package.json without lockfiles (less accurate)
4. Provide better UI messaging before analysis starts
