# HashNHedge Security Process

## Overview

This document outlines the ongoing security maintenance process for the HashNHedge project, including automated monitoring, manual audits, and incident response procedures.

---

## 🔒 Security Monitoring System

### 1. Automated Weekly Monitoring (GitHub Actions)

**File**: `.github/workflows/security-monitor.yml`

**Schedule**: Every Monday at 9 AM UTC

**What it does**:
- Runs `npm audit` on all 7 projects automatically
- Checks validator.js advisory status (GHSA-9965-vmph-33xx)
- Generates detailed security summary
- Creates GitHub issue if new vulnerabilities detected
- Stores audit reports as artifacts (90-day retention)

**How to view results**:
1. Go to GitHub Actions tab
2. Click "Security Vulnerability Monitor" workflow
3. View summary or download artifacts

**Manual trigger**:
```bash
# Via GitHub UI: Actions → Security Vulnerability Monitor → Run workflow
# Or via CLI:
gh workflow run security-monitor.yml
```

### 2. Monthly Manual Audit

**File**: `scripts/monthly-security-audit.sh`

**Schedule**: 15th of each month

**How to run**:
```bash
cd /path/to/hashnhedge-consolidated
./scripts/monthly-security-audit.sh
```

**Output**:
- Creates `security-audits/YYYY-MM-DD/` directory
- Generates `AUDIT_SUMMARY.md` report
- Saves JSON reports for each project
- Creates symlink to `security-audits/latest/`

**Review process**:
```bash
# View the summary
cat security-audits/latest/AUDIT_SUMMARY.md

# View detailed JSON for specific project
cat security-audits/latest/Main_Project.json | jq
```

---

## 📋 Monthly Security Checklist

### Week 1 (Days 1-7)
- [ ] Run automated weekly monitor (GitHub Actions)
- [ ] Review any GitHub security alerts
- [ ] Check Dependabot pull requests

### Week 2 (Days 8-14)
- [ ] Review previous month's audit findings
- [ ] Update dependencies if patches available
- [ ] Test critical functionality after updates

### Week 3 (Day 15)
- [ ] **Run monthly security audit script**
- [ ] Review AUDIT_SUMMARY.md
- [ ] Prioritize vulnerabilities by severity
- [ ] Create action plan for fixes

### Week 4 (Days 16-30)
- [ ] Apply security fixes
- [ ] Update SECURITY_AUDIT_COMPLETE.md
- [ ] Run integration tests
- [ ] Deploy security patches to production
- [ ] Document all changes in git commits

---

## 🚨 Vulnerability Response Procedures

### Critical Vulnerabilities

**Timeline**: Fix within 24 hours

**Steps**:
1. **Identify**:
   - Review vulnerability details
   - Check affected versions
   - Determine impact on production

2. **Fix**:
   ```bash
   cd <project-directory>
   npm audit fix --force
   npm test  # Verify functionality
   ```

3. **Test**:
   - Run all automated tests
   - Perform manual smoke testing
   - Check production endpoints

4. **Deploy**:
   ```bash
   git add package.json package-lock.json
   git commit -m "fix: critical security vulnerability [CVE/GHSA-ID]"
   git push origin master
   ```

5. **Document**:
   - Update SECURITY_AUDIT_COMPLETE.md
   - Create incident report
   - Notify team

### High Vulnerabilities

**Timeline**: Fix within 7 days

**Process**: Same as critical, but with more testing time

### Moderate/Low Vulnerabilities

**Timeline**: Fix within 30 days

**Process**: Can be batched with regular maintenance updates

---

## 🔍 Known Issue Tracking

### Current Known Issues

#### 1. validator.js URL Validation Bypass
- **Advisory**: GHSA-9965-vmph-33xx
- **Severity**: Moderate
- **Affected**: orchestration-api
- **Status**: No fix available
- **Monitor**: https://github.com/advisories/GHSA-9965-vmph-33xx

**Monthly Check**:
```bash
# Check if fix is available
npm view class-validator versions --json | jq -r '.[-5:]'
npm view validator versions --json | jq -r '.[-5:]'

# Check advisory status
curl -s "https://api.github.com/advisories/GHSA-9965-vmph-33xx" | jq .patched_versions
```

#### 2. Expo Dev Dependencies (mobile-app)
- **Issues**: semver ReDoS, xml2js prototype pollution
- **Severity**: Moderate/High
- **Status**: Waiting for Expo upstream fixes
- **Impact**: Dev-only, not in production builds

**Monthly Check**:
```bash
cd armageddon/mobile-app
npm outdated expo @expo/webpack-config
```

---

## 📊 Security Metrics

### Target Goals
- **Critical vulnerabilities**: 0 (always)
- **High vulnerabilities**: < 5
- **Moderate vulnerabilities**: < 10
- **Low vulnerabilities**: < 15

### Tracking
- Baseline (2025-10-15): 20 total vulnerabilities
- Current: Check `security-audits/latest/AUDIT_SUMMARY.md`

### Reporting
- Monthly metrics in audit summary
- Quarterly security review presentation
- Annual security report for stakeholders

---

## 🛠️ Tools and Commands

### Quick Audit (All Projects)
```bash
./scripts/monthly-security-audit.sh
```

### Individual Project Audit
```bash
cd <project-directory>
npm audit
npm audit --json > audit.json
npm audit fix
npm audit fix --force  # For breaking changes
```

### Check Specific Package
```bash
npm view <package-name> versions
npm view <package-name> security
```

### Update All Dependencies
```bash
npm outdated
npm update
# or for major versions:
npx npm-check-updates -u
npm install
```

### GitHub Advisory Check
```bash
gh api repos/knol3j/HNH/dependabot/alerts
```

---

## 📚 Documentation

### Security Documentation Files
- `SECURITY_AUDIT_COMPLETE.md` - Latest comprehensive audit
- `RENDER_BUILD_FIX.md` - Render deployment security fixes
- `SECURITY_PROCESS.md` - This file
- `security-audits/` - Historical audit reports

### External Resources
- [GitHub Security Advisories](https://github.com/advisories)
- [NPM Security Advisories](https://www.npmjs.com/advisories)
- [Snyk Vulnerability Database](https://security.snyk.io/)
- [NIST National Vulnerability Database](https://nvd.nist.gov/)

---

## 🔐 Security Best Practices

### Development
1. **Never commit secrets**
   - Use `.env` files (in `.gitignore`)
   - Use environment variables in Render
   - Rotate API keys regularly

2. **Keep dependencies updated**
   - Review Dependabot PRs weekly
   - Test updates in staging first
   - Document breaking changes

3. **Use security linters**
   ```bash
   npm install --save-dev eslint-plugin-security
   ```

### Deployment
1. **Secure environment variables**
   - Set all secrets in Render dashboard
   - Use `generateValue: true` for random keys
   - Never log sensitive values

2. **Rate limiting**
   - All API routes protected
   - Worker routes have tighter limits
   - Monitor for abuse patterns

3. **Authentication**
   - JWT for worker routes
   - Secure session management
   - Regular key rotation

---

## 🚀 Quick Start Guide

### For New Team Members

1. **Setup monitoring**:
   ```bash
   # Enable GitHub Actions notifications
   # Watch repository for security alerts
   ```

2. **Run first audit**:
   ```bash
   ./scripts/monthly-security-audit.sh
   ```

3. **Review documentation**:
   - Read SECURITY_AUDIT_COMPLETE.md
   - Understand current vulnerabilities
   - Learn response procedures

4. **Set calendar reminders**:
   - Weekly: Check GitHub Actions results
   - Monthly (15th): Run manual audit
   - Quarterly: Security review meeting

### For Security Incidents

1. **Assess severity** (Critical/High/Moderate/Low)
2. **Follow response timeline** (see above)
3. **Create incident report**
4. **Apply fix**
5. **Test thoroughly**
6. **Deploy**
7. **Document**
8. **Post-mortem** (for critical issues)

---

## 📞 Contacts

### Security Team
- Primary: [Your contact]
- Secondary: [Backup contact]

### Reporting Security Issues
- Email: security@hashnhedge.com (if available)
- GitHub: Use private security advisory
- Urgent: [Emergency contact]

---

## 📅 Maintenance Schedule

| Task | Frequency | Day | Owner |
|------|-----------|-----|-------|
| Automated Scan | Weekly | Monday | GitHub Actions |
| Review Alerts | Weekly | Monday | Security Team |
| Manual Audit | Monthly | 15th | Security Lead |
| Update Docs | Monthly | 20th | Dev Team |
| Quarterly Review | Quarterly | Last Friday | All Team |
| Annual Report | Yearly | January | Security Lead |

---

## ✅ Success Criteria

### Project is secure when:
- ✅ 0 critical vulnerabilities
- ✅ < 5 high vulnerabilities
- ✅ All production systems patched
- ✅ Documentation up to date
- ✅ Team trained on procedures
- ✅ Monitoring active
- ✅ Response plan tested

---

**Last Updated**: 2025-10-15
**Next Review**: 2025-11-15
**Version**: 1.0

*For questions or updates to this process, create a GitHub issue with the `security` label.*
