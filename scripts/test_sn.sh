#!/bin/bash
# Script to test Growatt API with real serial numbers

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Growatt API Integration Test Runner             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if serial number is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <serial_number> [device_type]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 ABC1234567"
    echo "  $0 ABC1234567 inverter"
    echo "  $0 XYZ1234567890123 battery"
    echo ""
    echo "Available device types: inverter, battery, ev_charger"
    echo ""
    exit 1
fi

SERIAL_NUMBER="$1"
DEVICE_TYPE="${2:-}"

cd /workspace/development/frappe-bench
source env/bin/activate

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Growatt API Integration Test Runner             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if serial number is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <serial_number> [device_type]${NC}"
    echo ""
    echo "Examples:"
    echo "  $0 ABC1234567"
    echo "  $0 ABC1234567 inverter"
    echo "  $0 XYZ1234567890123 battery"
    echo ""
    echo "Available device types: inverter, battery, ev_charger"
    echo ""
    exit 1
fi

SERIAL_NUMBER="$1"
DEVICE_TYPE="${2:-}"

echo -e "${BLUE}Testing Serial Number: ${YELLOW}${SERIAL_NUMBER}${NC}"
if [ -n "$DEVICE_TYPE" ]; then
    echo -e "${BLUE}Device Type: ${YELLOW}${DEVICE_TYPE}${NC}"
fi
echo ""

# Use bench execute to run the test
if [ -n "$DEVICE_TYPE" ]; then
    bench --site dev.localhost execute frappe_agt.tests.test_growatt_api_integration.run_manual_test_with_sn --args "['$SERIAL_NUMBER', '$DEVICE_TYPE']"
else
    bench --site dev.localhost execute frappe_agt.tests.test_growatt_api_integration.run_manual_test_with_sn --args "['$SERIAL_NUMBER', None]"
fi

echo ""
echo -e "${GREEN}Test completed!${NC}"
