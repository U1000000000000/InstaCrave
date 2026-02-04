#!/bin/bash

# Load Testing Setup and Execution Script
# This script prepares the environment and runs all load tests

set -e

echo "========================================"
echo "InstaCrave Load Testing Suite"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Register Food Partners
echo -e "${YELLOW}Step 1: Registering 50 food partners...${NC}"
echo "This creates test1@p.com through test50@p.com"
npx k6 run load-tests/scripts/register-partners.js

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Food partners registered successfully${NC}"
else
  echo -e "${RED}❌ Failed to register food partners${NC}"
  exit 1
fi

echo ""
echo "========================================"
echo -e "${YELLOW}Step 2: Running Load Test Scenarios${NC}"
echo "========================================"
echo ""

# Array of test scenarios
scenarios=(
  "auth.test.js:Authentication"
  "user.test.js:User Endpoints"
  "food.test.js:Food Endpoints"
  "food-partner.test.js:Food Partner Endpoints"
  "order.test.js:Order Endpoints"
  "search.test.js:Search Endpoints"
  "end-to-end-user-journey.test.js:End-to-End User Journey"
  "end-to-end-partner-journey.test.js:End-to-End Partner Journey"
)

failed_tests=()
passed_tests=()

# Run each scenario
for scenario in "${scenarios[@]}"; do
  IFS=':' read -r file name <<< "$scenario"
  
  echo ""
  echo -e "${YELLOW}Running: $name${NC}"
  echo "File: load-tests/scenarios/$file"
  echo "----------------------------------------"
  
  npx k6 run "load-tests/scenarios/$file"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED: $name${NC}"
    passed_tests+=("$name")
  else
    echo -e "${RED}❌ FAILED: $name${NC}"
    failed_tests+=("$name")
  fi
  
  echo ""
  sleep 2  # Brief pause between tests
done

# Summary
echo ""
echo "========================================"
echo "Test Summary"
echo "========================================"
echo ""
echo -e "${GREEN}Passed: ${#passed_tests[@]}${NC}"
for test in "${passed_tests[@]}"; do
  echo "  ✅ $test"
done

echo ""
echo -e "${RED}Failed: ${#failed_tests[@]}${NC}"
for test in "${failed_tests[@]}"; do
  echo "  ❌ $test"
done

echo ""
if [ ${#failed_tests[@]} -eq 0 ]; then
  echo -e "${GREEN}All tests passed! 🎉${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please review the output above.${NC}"
  exit 1
fi
