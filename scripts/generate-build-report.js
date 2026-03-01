#!/usr/bin/env node
const fs = require('fs')
const { execSync } = require('child_process')

let commit = 'local'
let branch = 'unknown'
try { commit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim() } catch {}
try { branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim() } catch {}

const report = {
  version: require('../package.json').version || '0.0.0',
  commit,
  branch,
  timestamp: new Date().toISOString(),
  node: process.version,
  env: process.env.NODE_ENV || 'development',
  ci: process.env.CI === 'true',
  status: 'pass',
}

fs.writeFileSync('public/build-report.json', JSON.stringify(report, null, 2))
console.log('[build-report] Generated:', JSON.stringify(report))
