#!/bin/bash

# HashNHedge Monthly Security Audit Script
# Run this script on the 15th of each month
# Usage: ./scripts/monthly-security-audit.sh

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Date stamp
DATE=$(date +%Y-%m-%d)
AUDIT_DIR="security-audits/${DATE}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                       ║${NC}"
echo -e "${BLUE}║     HashNHedge Monthly Security Audit                ║${NC}"
echo -e "${BLUE}║     Date: ${DATE}                              ║${NC}"
echo -e "${BLUE}║                                                       ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Create audit directory
mkdir -p "${AUDIT_DIR}"

# Initialize counters
TOTAL_VULNS=0
CRITICAL_VULNS=0
HIGH_VULNS=0
MODERATE_VULNS=0
LOW_VULNS=0

# Projects to audit
PROJECTS=(
    ".:Main Project"
    "HNH-pool:HNH Pool"
    "hybrid-pool:Hybrid Pool"
    "armageddon/pool:Armageddon Pool"
    "orchestration-api:Orchestration API"
    "armageddon/mobile-app:Mobile App"
    "hnh-vendor-portal:Vendor Portal"
)

# Function to audit a project
audit_project() {
    local PROJECT_PATH=$1
    local PROJECT_NAME=$2
    local AUDIT_FILE="${AUDIT_DIR}/${PROJECT_NAME// /_}.json"

    echo -e "${YELLOW}Auditing: ${PROJECT_NAME}${NC}"
    echo "Path: ${PROJECT_PATH}"

    if [ ! -f "${PROJECT_PATH}/package.json" ]; then
        echo -e "${RED}  ✗ No package.json found, skipping${NC}"
        echo ""
        return
    fi

    cd "${PROJECT_PATH}"

    # Run audit and save to file
    npm audit --json > "${AUDIT_FILE}" 2>/dev/null || true

    # Parse results
    local TOTAL=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.total // 0')
    local CRITICAL=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.critical // 0')
    local HIGH=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.high // 0')
    local MODERATE=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.moderate // 0')
    local LOW=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.low // 0')

    # Update global counters
    TOTAL_VULNS=$((TOTAL_VULNS + TOTAL))
    CRITICAL_VULNS=$((CRITICAL_VULNS + CRITICAL))
    HIGH_VULNS=$((HIGH_VULNS + HIGH))
    MODERATE_VULNS=$((MODERATE_VULNS + MODERATE))
    LOW_VULNS=$((LOW_VULNS + LOW))

    # Display results
    if [ "$TOTAL" -eq 0 ]; then
        echo -e "  ${GREEN}✓ No vulnerabilities found${NC}"
    else
        echo -e "  ${RED}✗ Total vulnerabilities: ${TOTAL}${NC}"
        [ "$CRITICAL" -gt 0 ] && echo -e "    ${RED}Critical: ${CRITICAL}${NC}"
        [ "$HIGH" -gt 0 ] && echo -e "    ${YELLOW}High: ${HIGH}${NC}"
        [ "$MODERATE" -gt 0 ] && echo -e "    ${YELLOW}Moderate: ${MODERATE}${NC}"
        [ "$LOW" -gt 0 ] && echo "    Low: ${LOW}"
    fi

    # Check for specific known issues
    if grep -q "validator" "${AUDIT_FILE}"; then
        echo -e "  ${YELLOW}⚠️  validator.js issue still present${NC}"
    fi

    echo ""

    cd - > /dev/null
}

# Run audits on all projects
for PROJECT in "${PROJECTS[@]}"; do
    IFS=':' read -r PATH NAME <<< "${PROJECT}"
    audit_project "${PATH}" "${NAME}"
done

# Generate summary report
REPORT_FILE="${AUDIT_DIR}/AUDIT_SUMMARY.md"

cat > "${REPORT_FILE}" << EOF
# Monthly Security Audit Report

**Date**: ${DATE}
**Audited By**: Automated Script

---

## Executive Summary

| Severity  | Count |
|-----------|-------|
| Critical  | ${CRITICAL_VULNS} |
| High      | ${HIGH_VULNS} |
| Moderate  | ${MODERATE_VULNS} |
| Low       | ${LOW_VULNS} |
| **Total** | **${TOTAL_VULNS}** |

---

## Project Breakdown

EOF

# Add details for each project
for PROJECT in "${PROJECTS[@]}"; do
    IFS=':' read -r PATH NAME <<< "${PROJECT}"
    AUDIT_FILE="${AUDIT_DIR}/${NAME// /_}.json"

    if [ -f "${AUDIT_FILE}" ]; then
        TOTAL=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.total // 0')
        CRITICAL=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.critical // 0')
        HIGH=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.high // 0')
        MODERATE=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.moderate // 0')
        LOW=$(cat "${AUDIT_FILE}" | jq -r '.metadata.vulnerabilities.low // 0')

        cat >> "${REPORT_FILE}" << EOF
### ${NAME}

| Severity | Count |
|----------|-------|
| Critical | ${CRITICAL} |
| High     | ${HIGH} |
| Moderate | ${MODERATE} |
| Low      | ${LOW} |
| **Total**| **${TOTAL}** |

EOF

        if [ "$TOTAL" -gt 0 ]; then
            echo "**Action Required**: Run \`npm audit fix\` in \`${PATH}\`" >> "${REPORT_FILE}"
            echo "" >> "${REPORT_FILE}"
        fi
    fi
done

# Add recommendations
cat >> "${REPORT_FILE}" << EOF

---

## Recommendations

EOF

if [ "$TOTAL_VULNS" -eq 0 ]; then
    cat >> "${REPORT_FILE}" << EOF
✅ **Excellent!** No vulnerabilities detected across all projects.

**Maintenance Tasks**:
- Continue monthly security audits
- Keep all dependencies up to date
- Monitor GitHub Security Advisories
EOF
elif [ "$CRITICAL_VULNS" -gt 0 ]; then
    cat >> "${REPORT_FILE}" << EOF
🚨 **URGENT**: Critical vulnerabilities detected!

**Immediate Actions**:
1. Review critical vulnerabilities in detail
2. Apply fixes immediately using \`npm audit fix --force\`
3. Test all affected applications
4. Deploy security patches ASAP

**Next Steps**:
- Run \`npm audit\` in each affected project
- Document all changes made
- Update SECURITY_AUDIT_COMPLETE.md
EOF
else
    cat >> "${REPORT_FILE}" << EOF
⚠️ **Action Recommended**: Some vulnerabilities detected.

**Actions**:
1. Review vulnerability details in audit JSON files
2. Run \`npm audit fix\` in affected projects
3. For force-required fixes, run \`npm audit fix --force\`
4. Update SECURITY_AUDIT_COMPLETE.md with changes

**Timeline**: Address within 7 days
EOF
fi

# Check for validator.js specifically
if grep -r "validator" "${AUDIT_DIR}"/*.json > /dev/null 2>&1; then
    cat >> "${REPORT_FILE}" << EOF

---

## Known Issues

### validator.js (GHSA-9965-vmph-33xx)

**Status**: No fix available from upstream
**Severity**: Moderate
**Affected Projects**: Orchestration API
**Description**: URL validation bypass vulnerability in validator.js

**Monitoring**:
- Check monthly for updates: https://github.com/advisories/GHSA-9965-vmph-33xx
- Monitor class-validator releases: https://github.com/typestack/class-validator
- Consider alternative validation libraries if issue persists

EOF
fi

# Add footer
cat >> "${REPORT_FILE}" << EOF

---

## Audit Details

Detailed JSON reports for each project are available in:
\`${AUDIT_DIR}/\`

**Next Audit**: ${DATE} + 1 month

---

*Generated by HashNHedge Monthly Security Audit Script*
*For issues or questions, refer to SECURITY_AUDIT_COMPLETE.md*
EOF

# Display final summary
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                  AUDIT SUMMARY                        ${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Total Vulnerabilities: ${TOTAL_VULNS}"
echo -e "  Critical: ${CRITICAL_VULNS}"
echo -e "  High: ${HIGH_VULNS}"
echo -e "  Moderate: ${MODERATE_VULNS}"
echo -e "  Low: ${LOW_VULNS}"
echo ""

if [ "$TOTAL_VULNS" -eq 0 ]; then
    echo -e "${GREEN}✅ All projects are secure!${NC}"
elif [ "$CRITICAL_VULNS" -gt 0 ]; then
    echo -e "${RED}🚨 CRITICAL VULNERABILITIES DETECTED - IMMEDIATE ACTION REQUIRED${NC}"
else
    echo -e "${YELLOW}⚠️  Vulnerabilities detected - review recommended${NC}"
fi

echo ""
echo -e "Report saved to: ${GREEN}${REPORT_FILE}${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Create symlink to latest audit
ln -sf "${DATE}" "security-audits/latest"

echo ""
echo -e "✅ Audit complete!"
echo ""
echo "Next steps:"
echo "  1. Review the report: cat ${REPORT_FILE}"
echo "  2. Fix vulnerabilities: npm audit fix (in each affected project)"
echo "  3. Update documentation: SECURITY_AUDIT_COMPLETE.md"
echo ""
