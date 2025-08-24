# Project Badges

Add these badges to your README.md to show the current status of your project:

## CI/CD Status

```markdown
[![CI](https://github.com/{owner}/{repo}/workflows/CI/badge.svg)](https://github.com/{owner}/{repo}/actions?query=workflow%3ACI)
[![Test Coverage](https://codecov.io/gh/{owner}/{repo}/branch/main/graph/badge.svg)](https://codecov.io/gh/{owner}/{repo})
[![Security Scan](https://github.com/{owner}/{repo}/workflows/Security%20Audit/badge.svg)](https://github.com/{owner}/{repo}/actions?query=workflow%3A%22Security+Audit%22)
```

## Code Quality

```markdown
[![Code Quality](https://github.com/{owner}/{repo}/workflows/Quality%20Gates/badge.svg)](https://github.com/{owner}/{repo}/actions?query=workflow%3A%22Quality+Gates%22)
[![Lint Status](https://github.com/{owner}/{repo}/workflows/Lint%20and%20Format%20Check/badge.svg)](https://github.com/{owner}/{repo}/actions?query=workflow%3A%22Lint+and+Format+Check%22)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
```

## Package Information

```markdown
[![npm version](https://badge.fury.io/js/{package-name}.svg)](https://badge.fury.io/js/{package-name})
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
```

## Example README Section

```markdown
# Project Name

[![CI](https://github.com/{owner}/{repo}/workflows/CI/badge.svg)](https://github.com/{owner}/{repo}/actions?query=workflow%3ACI)
[![Test Coverage](https://codecov.io/gh/{owner}/{repo}/branch/main/graph/badge.svg)](https://codecov.io/gh/{owner}/{repo})
[![Code Quality](https://github.com/{owner}/{repo}/workflows/Quality%20Gates/badge.svg)](https://github.com/{owner}/{repo}/actions?query=workflow%3A%22Quality+Gates%22)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Description

Your project description here...

## Quick Start

```bash
npm install
npm test
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and quality checks
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details
```

## Badge Configuration

### Replace Placeholders

- `{owner}`: Your GitHub username or organization name
- `{repo}`: Your repository name
- `{package-name}`: Your npm package name (if applicable)

### Custom Badges

You can create custom badges using [Shields.io](https://shields.io/):

```markdown
[![Custom Badge](https://img.shields.io/badge/Custom-Value-color.svg)](https://your-link.com)
```

### Dynamic Badges

The GitHub Actions badges automatically update based on workflow status:
- 🟢 Green: Success
- 🟡 Yellow: In Progress
- 🔴 Red: Failure
- ⚪ Gray: Skipped

## Integration

1. Copy the badge markdown to your README.md
2. Replace the placeholders with your actual values
3. Commit and push to see the badges in action
4. Badges will automatically update with each workflow run
