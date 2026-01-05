# Frappe AGT - Serial Number Validation & API Integration

Utility functions for validating Growatt device serial numbers and fetching device information from the Growatt API.

## Quick Start

### Test a Serial Number

```bash
cd /workspace/development/frappe-bench/apps/frappe_agt
./scripts/test_sn.sh YOUR_SERIAL_NUMBER inverter
```

### Use in Code

```python
from frappe_agt.utils import validate_serial_number, get_growatt_sn_info

# Validate serial number format
is_valid = validate_serial_number("XZJ6CF806L", type="inverter")  # True/False

# Get device info from Growatt API
device_info = get_growatt_sn_info("XZJ6CF806L")
if device_info:
    print(f"Model: {device_info['data']['model']}")
    print(f"Warranty: {device_info['data']['warrantyTime']} years")
```

## Serial Number Formats

| Type | Length | Format | Example |
|------|--------|--------|---------|
| Inverter | 10 chars | 3 prefix + 7 alphanumeric | `XZJ6CF806L` |
| Battery | 16 chars | 3 prefix + 13 alphanumeric | `ABC1234567890123` |
| EV Charger | 16 chars | 3 prefix + 13 alphanumeric | `XYZ1234567890123` |

## API Response Structure

```json
{
  "code": 200,
  "msg": "ok",
  "data": {
    "deviceSN": "XZJ6CF806L",
    "model": "MIN 10000TL-X",
    "deliveryTime": "2022-06-27",
    "warrantyTime": 10,
    "outTime": "2032-06-27",
    "orderNumber": "GBR21922E051"
  }
}
```

## Testing

### Run All Tests
```bash
cd /workspace/development/frappe-bench
bench --site dev.localhost run-tests --app frappe_agt
```

### Test with Real Serial Number
```bash
# Method 1: Shell script
cd /workspace/development/frappe-bench/apps/frappe_agt
./test_sn.sh XZJ6CF806L inverter

# Method 2: Bench execute
cd /workspace/development
bench --site dev.localhost execute \
  frappe_agt.tests.test_growatt_api_integration.run_manual_test_with_sn \
  --args "['XZJ6CF806L', 'inverter']"

# Method 3: Python console
bench --site dev.localhost console
>>> from frappe_agt.utils import get_growatt_sn_info
>>> get_growatt_sn_info('XZJ6CF806L')
```

## Integration Examples

### Stock Entry Auto-Fill from Serial Numbers

The system automatically fills item codes in Stock Entry based on serial numbers:

**How it works:**
1. When you enter serial numbers in Stock Entry items without setting item_code
2. System validates the serial number format
3. Checks if the serial number already exists in the system
4. If not found, queries the Growatt API for device model
5. Searches for matching items based on model name
6. Auto-fills if single match, or shows selection dialog if multiple matches

**Usage:**
```python
# In Stock Entry form:
# - Add serial number to item row
# - Leave item_code empty
# - System auto-fills on save or use "Auto-fill Items" button
```

**Client-side features:**
- "Auto-fill Items from Serial Numbers" button in Tools menu
- Interactive dialog for selecting from multiple matching items
- Real-time auto-fill when serial number is entered

### Validate in DocType Controller

```python
from frappe_agt.utils import validate_serial_number, get_growatt_sn_info

def validate(self):
    # Validate format
    if not validate_serial_number(self.serial_no, type='inverter'):
        frappe.throw("Invalid serial number format")
    
    # Fetch device info
    device_info = get_growatt_sn_info(self.serial_no)
    if device_info:
        self.model = device_info['data']['model']
        self.warranty_expires = device_info['data']['outTime']
```

### Bulk Validation

```python
@frappe.whitelist()
def bulk_validate_serial_numbers(serial_numbers, device_type=None):
    """Validate multiple serial numbers"""
    if isinstance(serial_numbers, str):
        serial_numbers = [sn.strip() for sn in serial_numbers.split(',')]
    
    results = {'valid': [], 'invalid': []}
    for sn in serial_numbers:
        if validate_serial_number(sn, type=device_type):
            results['valid'].append(sn)
        else:
            results['invalid'].append(sn)
    
    return results
```

## Files Structure

```
frappe_agt/
├── utils/
│   ├── __init__.py
│   └── validation.py          # validate_serial_number(), get_growatt_sn_info()
├── tests/
│   ├── test_validation.py     # 15 unit tests
│   ├── test_stock_entry.py    # Integration tests
│   └── test_growatt_api_integration.py  # API tests
├── scripts/
│   ├── test_sn.sh             # Quick serial number testing
│   ├── run_tests.sh           # Test runner
│   ├── test_serial_number.py  # Python test script
│   └── EXAMPLES.sh            # Usage examples
├── stock_entry.py             # Stock Entry hooks
└── api.py                     # API endpoints
```

## Functions Reference

### `validate_serial_number(sn, type=None)`

Validates serial number format.

**Parameters:**
- `sn` (str): Serial number to validate
- `type` (str, optional): Device type ('inverter', 'battery', 'ev_charger')

**Returns:** `bool` - True if valid, False otherwise

### `get_growatt_sn_info(serial_no)`

Fetches device information from Growatt API.

**Parameters:**
- `serial_no` (str): Serial number to lookup

**Returns:** `dict` or `None` - Device information if found, None otherwise

## API Endpoint

- **URL:** `https://br.growatt.com/support/locate`
- **Method:** POST
- **Payload:** `{"deviceSN": "SERIAL_NUMBER"}`

## Troubleshooting

**Network Issues:**
- Ensure internet connectivity to `br.growatt.com`
- If in dev container without internet, test from host machine

**Invalid Format:**
- Check serial number matches expected format (10 or 16 characters)
- Use `validate_serial_number()` to check format first

**Device Not Found:**
- API returns `None` if device doesn't exist in Growatt database
- Valid format doesn't guarantee device exists

## Development

- All unit tests passing (15 tests)
- Integration tests available in `tests/test_growatt_api_integration.py`
- Enable integration tests: `export ENABLE_GROWATT_API_TESTS=1`

For detailed testing instructions, see [TESTING.md](TESTING.md)
