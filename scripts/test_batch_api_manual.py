#!/usr/bin/env python3
"""
Manual test script for batch API functions
Can be run directly without bench framework for quick testing

Run with:
    cd /workspace/development/frappe-bench
    ./env/bin/python apps/frappe_agt/scripts/test_batch_api_manual.py
"""

import sys
import os

# Get the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
# Navigate to frappe-bench (3 levels up from scripts/)
bench_dir = os.path.abspath(os.path.join(script_dir, '../../..'))

# Add frappe-bench to path
sys.path.insert(0, os.path.join(bench_dir, 'apps'))
sys.path.insert(0, os.path.join(bench_dir, 'apps/frappe'))

import frappe
from frappe_agt.api import batch_get_item_code_by_name

def test_batch_lookup():
    """Test the batch_get_item_code_by_name function"""
    
    print("\n" + "="*70)
    print("BATCH API FUNCTION TEST")
    print("="*70)
    
    # Initialize Frappe
    print("\nInitializing Frappe...")
    frappe.init(site='dev.localhost')
    frappe.connect()
    frappe.set_user("Administrator")
    
    # Test cases
    test_cases = [
        {
            "name": "Single item",
            "items": ["MAX 50K TL3-X L2 (8 MPPT)"]
        },
        {
            "name": "Multiple items (small batch)",
            "items": [
                "MAX 50K TL3-X L2 (8 MPPT)",
                "SPF 5000 ES",
                "MIN 6000 TL-X"
            ]
        },
        {
            "name": "Mixed existing and non-existing",
            "items": [
                "MAX 50K TL3-X L2 (8 MPPT)",
                "NONEXISTENT_MODEL_XYZ",
                "SPF 5000 ES"
            ]
        },
        {
            "name": "Large batch (10 items)",
            "items": [
                "MAX 50K TL3-X L2 (8 MPPT)",
                "MAC 50K TL3-X LV",
                "SPF 5000 ES",
                "MID 20K TL3-XL",
                "MIN 6000 TL-X",
                "MOD 10000 TL3-X",
                "MIC 2000 TL-X",
                "MIN 5000 TL-X",
                "MIC 3000 TL-X",
                "MIN 6000 TL-X2"
            ]
        },
        {
            "name": "Empty list",
            "items": []
        }
    ]
    
    # Run tests
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"Test {i}: {test_case['name']}")
        print('='*70)
        
        try:
            print(f"Testing with {len(test_case['items'])} item(s)...")
            
            import time
            start_time = time.time()
            result = batch_get_item_code_by_name(test_case['items'])
            end_time = time.time()
            
            elapsed = (end_time - start_time) * 1000
            
            print(f"\n✓ Completed in {elapsed:.2f}ms")
            
            # Analyze results
            found_count = 0
            not_found_count = 0
            
            for item_name in test_case['items']:
                items = result.get(item_name, [])
                if items:
                    found_count += 1
                    print(f"\n✓ {item_name}:")
                    for item in items:
                        print(f"    - {item['item_code']}: {item['item_name']}")
                else:
                    not_found_count += 1
                    print(f"\n✗ {item_name}: Not found")
            
            if test_case['items']:
                print(f"\nSummary:")
                print(f"  Found: {found_count}/{len(test_case['items'])}")
                print(f"  Not found: {not_found_count}/{len(test_case['items'])}")
            
        except Exception as e:
            print(f"\n✗ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*70)
    print("ALL TESTS COMPLETED")
    print("="*70 + "\n")
    
    frappe.destroy()


if __name__ == "__main__":
    test_batch_lookup()
