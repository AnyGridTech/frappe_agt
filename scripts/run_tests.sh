#!/bin/bash
# Test runner script for frappe_agt app

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Frappe AGT Test Runner${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Activate virtual environment
cd /workspace/development/frappe-bench
source env/bin/activate

# Ensure tests are enabled
echo -e "${BLUE}Enabling tests for site...${NC}"
bench --site dev.localhost set-config allow_tests true

# Run all tests for frappe_agt
echo ""
echo -e "${BLUE}Running all frappe_agt tests...${NC}"
echo ""

if bench --site dev.localhost run-tests --app frappe_agt; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    exit 1
fi

# Run specific test modules
echo -e "${BLUE}Running validation tests...${NC}"
bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_validation

echo ""
echo -e "${BLUE}Running stock entry tests...${NC}"
bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_stock_entry

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}All tests completed successfully!${NC}"
echo -e "${GREEN}================================${NC}"
