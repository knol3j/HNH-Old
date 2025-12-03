#!/bin/bash
# Deployment Testing Script
# Tests all health endpoints and API functionality

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URLs (override with arguments)
API_URL=${1:-"http://localhost:10000"}
POOL_URL=${2:-"http://localhost:3333"}

echo "🧪 HashNHedge Deployment Test Suite"
echo "===================================="
echo "API URL: $API_URL"
echo "Pool URL: $POOL_URL"
echo ""

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
test_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" --connect-timeout 10 || echo "000")

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✅ PASS${NC} (HTTP $response)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Expected $expected_code, got $response)"
        ((TESTS_FAILED++))
        return 1
    fi
}

# Test JSON response
test_json_endpoint() {
    local name=$1
    local url=$2
    local expected_key=$3

    echo -n "Testing $name... "

    response=$(curl -s "$url" --connect-timeout 10 || echo "{}")

    if echo "$response" | grep -q "\"$expected_key\""; then
        echo -e "${GREEN}✅ PASS${NC} (Found '$expected_key' in response)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAIL${NC} (Missing '$expected_key' in response)"
        echo "Response: $response"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏥 HEALTH CHECK TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Main API Health" "$API_URL/api/health" 200
test_json_endpoint "Main API Health JSON" "$API_URL/api/health" "success"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 API ENDPOINT TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_endpoint "Community Members List" "$API_URL/api/community/members" 200
test_endpoint "Vendor List" "$API_URL/api/vendor/list" 200

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔒 SECURITY TESTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test protected endpoint without auth (should fail)
echo -n "Testing protected endpoint (should reject)... "
response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/workers" --connect-timeout 10 || echo "000")
if [ "$response" = "401" ] || [ "$response" = "403" ]; then
    echo -e "${GREEN}✅ PASS${NC} (Correctly rejected with $response)"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  WARNING${NC} (Expected 401/403, got $response)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 TEST SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

echo "Total Tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo "✅ Deployment is healthy and ready"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Some tests failed${NC}"
    echo "⚠️  Please check the deployment configuration"
    exit 1
fi
