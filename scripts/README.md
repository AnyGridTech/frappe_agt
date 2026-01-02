# Test & Utility Scripts

This directory contains utility scripts for testing and development.

## Available Scripts

### test_sn.sh
Quick test for serial numbers with the Growatt API.

```bash
./scripts/test_sn.sh <serial_number> [device_type]
```

**Examples:**
```bash
./scripts/test_sn.sh XZJ6CF806L inverter
./scripts/test_sn.sh ABC1234567890123 battery
```

### run_tests.sh
Run all frappe_agt unit and integration tests.

```bash
./scripts/run_tests.sh
```

### test_serial_number.py
Python script for testing serial numbers (alternative to test_sn.sh).

```bash
cd /workspace/development/frappe-bench
python3 apps/frappe_agt/scripts/test_serial_number.py <serial_number> [device_type]
```

### EXAMPLES.sh
Display usage examples and help for the testing tools.

```bash
./scripts/EXAMPLES.sh
```

## Usage from Project Root

All scripts should be run from the frappe_agt app directory:

```bash
cd /workspace/development/frappe-bench/apps/frappe_agt
./scripts/test_sn.sh XZJ6CF806L inverter
```

Or use absolute paths:

```bash
/workspace/development/frappe-bench/apps/frappe_agt/scripts/test_sn.sh XZJ6CF806L inverter
```
