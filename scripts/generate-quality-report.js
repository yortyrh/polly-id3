#!/usr/bin/env node

const fs = require('fs');

/**
 * Generate a comprehensive quality report for the CI pipeline
 */
async function generateQualityReport() {
  const report = {
    timestamp: new Date().toISOString(),
    project: 'polly-id3',
    version: require('../package.json').version,
    quality: {},
  };

  try {
    // Check test coverage
    if (fs.existsSync('coverage/coverage-summary.json')) {
      const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'));
      report.quality.coverage = coverage.total;
    }

    // Check bundle size
    if (fs.existsSync('dist/stats.json')) {
      const stats = JSON.parse(fs.readFileSync('dist/stats.json', 'utf8'));
      report.quality.bundleSize = {
        totalSize: stats.assets.reduce((sum, asset) => sum + asset.size, 0),
        assetCount: stats.assets.length,
      };
    }

    // Check dependencies
    const packageJson = require('../package.json');
    report.quality.dependencies = {
      total:
        Object.keys(packageJson.dependencies || {}).length +
        Object.keys(packageJson.devDependencies || {}).length,
      production: Object.keys(packageJson.dependencies || {}).length,
      development: Object.keys(packageJson.devDependencies || {}).length,
    };

    // Check TypeScript compilation
    try {
      require('child_process').execSync('npx tsc --noEmit', { stdio: 'pipe' });
      report.quality.typescript = { status: 'success', errors: 0 };
    } catch (error) {
      report.quality.typescript = { status: 'error', errors: error.status || 1 };
    }

    // Check linting
    try {
      require('child_process').execSync('npm run lint', { stdio: 'pipe' });
      report.quality.linting = { status: 'success', errors: 0 };
    } catch (error) {
      report.quality.linting = { status: 'error', errors: error.status || 1 };
    }

    // Check formatting
    try {
      require('child_process').execSync('npm run format:check', { stdio: 'pipe' });
      report.quality.formatting = { status: 'success', errors: 0 };
    } catch (error) {
      report.quality.formatting = { status: 'error', errors: error.status || 1 };
    }

    // Calculate overall quality score
    const scores = [];
    if (report.quality.coverage) {
      const coverageScore =
        (report.quality.coverage.lines.pct +
          report.quality.coverage.functions.pct +
          report.quality.coverage.branches.pct +
          report.quality.coverage.statements.pct) /
        4;
      scores.push(coverageScore);
    }

    if (report.quality.typescript?.status === 'success') scores.push(100);
    if (report.quality.linting?.status === 'success') scores.push(100);
    if (report.quality.formatting?.status === 'success') scores.push(100);

    report.quality.overallScore =
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    // Write report to file
    fs.writeFileSync('quality-report.json', JSON.stringify(report, null, 2));

    // Also generate a markdown summary
    const markdown = generateMarkdownSummary(report);
    fs.writeFileSync('quality-report.md', markdown);

    console.log('Quality report generated successfully');
    console.log(`Overall quality score: ${report.quality.overallScore.toFixed(1)}%`);

    return report;
  } catch (error) {
    console.error('Error generating quality report:', error);
    throw error;
  }
}

function generateMarkdownSummary(report) {
  return `# Quality Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Project:** ${report.project}
**Version:** ${report.version}

## Overall Quality Score: ${report.quality.overallScore?.toFixed(1)}%

## Coverage
${
  report.quality.coverage
    ? `
- **Lines:** ${report.quality.coverage.lines.pct}%
- **Functions:** ${report.quality.coverage.functions.pct}%
- **Branches:** ${report.quality.coverage.branches.pct}%
- **Statements:** ${report.quality.coverage.statements.pct}%
`
    : 'No coverage data available'
}

## Code Quality
- **TypeScript:** ${report.quality.typescript?.status || 'Unknown'}
- **Linting:** ${report.quality.linting?.status || 'Unknown'}
- **Formatting:** ${report.quality.formatting?.status || 'Unknown'}

## Dependencies
- **Total:** ${report.quality.dependencies?.total || 0}
- **Production:** ${report.quality.dependencies?.production || 0}
- **Development:** ${report.quality.dependencies?.development || 0}

${
  report.quality.bundleSize
    ? `
## Bundle Analysis
- **Total Size:** ${(report.quality.bundleSize.totalSize / 1024).toFixed(2)} KB
- **Asset Count:** ${report.quality.bundleSize.assetCount}
`
    : ''
}
`;
}

// Run if called directly
if (require.main === module) {
  generateQualityReport()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { generateQualityReport };
