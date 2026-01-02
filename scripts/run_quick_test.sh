#!/bin/bash
# Quick test script for batch API functions
# Run from frappe-bench directory: bash apps/frappe_agt/scripts/run_quick_test.sh

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Navigate to frappe-bench (3 levels up from scripts/)
cd "$SCRIPT_DIR/../../.."

echo "========================================================================"
echo "TESTING batch_get_item_code_by_name function"
echo "========================================================================"

bench --site dev.localhost console <<'EOF'
from frappe_agt.api import batch_get_item_code_by_name

print("\nTest 1: Single item lookup")
print("-" * 60)
result = batch_get_item_code_by_name(["MAX 50K TL3-X L2 (8 MPPT)"])
for name, items in result.items():
    print(f"{name}: {len(items)} item(s)")
    for item in items:
        print(f"  - {item['item_code']}: {item['item_name']}")

print("\n\nTest 2: Multiple items")
print("-" * 60)
test_models = [
    "MAX 50K TL3-X L2 (8 MPPT)",
    "SPF 5000 ES",
    "MIN 6000 TL-X",
    "NONEXISTENT_MODEL"
]
result = batch_get_item_code_by_name(test_models)
for name, items in result.items():
    status = f"{len(items)} item(s)" if items else "Not found"
    print(f"{name}: {status}")

print("\n\nTest 3: Large batch (20 models)")
print("-" * 60)
large_batch = [
    "MAX 50K TL3-X L2 (8 MPPT)", "MAC 50K TL3-X LV", "SPF 5000 ES",
    "SPF 5000 TL HVM-WPV", "MID 20K TL3-XL", "MIN 6000 TL-X",
    "MOD 10000 TL3-X", "MIC 2000 TL-X", "MIN 5000 TL-X",
    "MIC 3000 TL-X", "MIN 6000 TL-X2", "MID 25K TL3-XL2",
    "MID 17K TL3-X", "MIC 1500 TL-X", "MIC 1000 TL-X",
    "MIC 2500 TL-X", "MIN 3000 TL-X", "SPF 8000 T HVM",
    "SPF 12000 T HVM", "SPF 10000 T HVM"
]

import time
start = time.time()
result = batch_get_item_code_by_name(large_batch)
elapsed = (time.time() - start) * 1000

found = sum(1 for items in result.values() if items)
not_found = len(result) - found

print(f"Processed {len(large_batch)} models in {elapsed:.2f}ms")
print(f"Found: {found}, Not found: {not_found}")
print(f"Average per model: {elapsed/len(large_batch):.2f}ms")

print("\n" + "="*60)
print("Tests completed successfully!")
print("="*60)
EOF
