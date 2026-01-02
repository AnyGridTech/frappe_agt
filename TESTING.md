# Testing Guide

## Quick Test Commands

### Run All Tests
```bash
cd /workspace/development/frappe-bench
bench --site dev.localhost run-tests --app frappe_agt
```

### Run Specific Test Module
```bash
# Validation tests
bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_validation

# Stock entry tests
bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_stock_entry

# API integration tests (requires ENABLE_GROWATT_API_TESTS=1)
export ENABLE_GROWATT_API_TESTS=1
bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_growatt_api_integration
```

## Test Real Serial Numbers

### Method 1: Shell Script (Easiest)

```bash
cd /workspace/development/frappe-bench/apps/frappe_agt
./scripts/test_sn.sh YOUR_SERIAL_NUMBER inverter
```

**Examples:**
```bash
./scripts/test_sn.sh XZJ6CF806L inverter
./scripts/test_sn.sh ABC1234567890123 battery
./scripts/test_sn.sh XYZ9876543210 ev_charger
```

### Method 2: Bench Execute

```bash
cd /workspace/development
bench --site dev.localhost execute \
  frappe_agt.tests.test_growatt_api_integration.run_manual_test_with_sn \
  --args "['YOUR_SN', 'inverter']"
```

### Method 3: Python Console

```bash
bench --site dev.localhost console
```

Then in console:
```python
from frappe_agt.utils import validate_serial_number, get_growatt_sn_info

# Validate format
is_valid = validate_serial_number('XZJ6CF806L', type='inverter')
print(f"Valid: {is_valid}")

# Get device info
device_info = get_growatt_sn_info('XZJ6CF806L')
if device_info:
    print(f"Model: {device_info['data']['model']}")
    print(f"Warranty: {device_info['data']['warrantyTime']} years")
```

### Method 4: Direct Test Function

```python
from frappe_agt.tests.test_growatt_api_integration import run_manual_test_with_sn
run_manual_test_with_sn('XZJ6CF806L', 'inverter')
```

## Expected Output

When testing a valid serial number:

```
====================================================================
MANUAL TEST - Serial Number: XZJ6CF806L
====================================================================

Step 1: Validating serial number format...
  Format: ✓ VALID
  Type: inverter

Step 2: Fetching from Growatt API...
  ✓ API Response Received

Response Details:
  Code: 200
  Message: ok

Device Information:
  deviceSN: XZJ6CF806L
  model: MIN 10000TL-X
  orderNumber: GBR21922E051
  deliveryTime: 2022-06-27
  warrantyTime: 10 years
  outTime: 2032-06-27
```

## Test Coverage

### Unit Tests (test_validation.py)

- ✅ Empty/None input validation
- ✅ Non-string input validation
- ✅ Inverter format validation (10 chars)
- ✅ Battery format validation (16 chars)
- ✅ EV charger format validation (16 chars)
- ✅ Generic format validation
- ✅ Case-insensitive validation
- ✅ Whitespace trimming
- ✅ API success response handling
- ✅ API failure response handling
- ✅ API exception handling

**Total: 15 tests**

### Integration Tests (test_stock_entry.py)

- ✅ Stock Entry before_save hook execution
- ✅ Hook registration verification

**Total: 2 tests**

### API Integration Tests (test_growatt_api_integration.py)

- ✅ API endpoint reachability
- ✅ Response structure validation
- ✅ Valid/invalid serial number handling
- ✅ Timeout handling
- ✅ Manual testing helpers

**Total: 7 tests (disabled by default)**

## Integration Tests Setup

Integration tests make real API calls and are disabled by default.

### Enable Integration Tests

```bash
export ENABLE_GROWATT_API_TESTS=1
bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_growatt_api_integration
```

### Add Your Serial Numbers to Tests

Edit `frappe_agt/tests/test_growatt_api_integration.py`:

```python
class TestGrowattAPIWithRealSN(FrappeTestCase):
    def test_with_provided_sn(self):
        test_cases = [
            ('XZJ6CF806L', 'inverter', True),
            ('YOUR_BATTERY_SN', 'battery', True),
            # Add more here
        ]
```

Then run:
```bash
export ENABLE_GROWATT_API_TESTS=1
bench --site dev.localhost run-tests --app frappe_agt --test TestGrowattAPIWithRealSN.test_with_provided_sn
```

## Writing New Tests

### Unit Test Example

```python
from frappe.tests.utils import FrappeTestCase
from frappe_agt.utils import validate_serial_number

class TestMyFeature(FrappeTestCase):
    def test_my_validation(self):
        result = validate_serial_number('ABC1234567', type='inverter')
        self.assertTrue(result)
```

### Integration Test with Mocking

```python
from unittest.mock import patch

class TestIntegration(FrappeTestCase):
    @patch('frappe_agt.api.get_growatt_sn_info')
    def test_with_mock(self, mock_api):
        mock_api.return_value = {'code': 200, 'data': {...}}
        # Your test code here
```

## Troubleshooting

### Tests Not Running
```bash
bench --site dev.localhost set-config allow_tests true
```

### Network Issues
- Check connectivity: `ping br.growatt.com`
- If in dev container, test from host machine
- Integration tests require internet access

### Import Errors
- Ensure `__init__.py` files exist in test directories
- Check Python path includes frappe-bench/apps

### Database Issues
Always use `frappe.db.rollback()` in `tearDown()` to clean up test data

## Best Practices

1. **Write tests first** - Follow TDD when adding features
2. **Keep tests isolated** - Each test should be independent
3. **Use fixtures** - Create reusable test data in setUp
4. **Mock external calls** - Use unittest.mock for API calls
5. **Clean up** - Always rollback DB changes in tearDown
6. **Descriptive names** - Use clear test method names
7. **One assertion focus** - Test one specific behavior per test

## Continuous Integration

Run tests in CI/CD:
```bash
bench --site dev.localhost run-tests --app frappe_agt --coverage
```

This generates a coverage report showing tested code.
