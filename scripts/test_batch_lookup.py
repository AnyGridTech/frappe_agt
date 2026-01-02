#!/usr/bin/env python3
"""
Test script for batch_get_item_code_by_name function
Run with: cd /workspace/development/frappe-bench && bench --site dev.localhost execute ../test_batch_lookup.py
"""

import frappe
from frappe_agt.api import batch_get_item_code_by_name

def test_batch_lookup():
    """Test the batch lookup function"""
    print("\n" + "="*60)
    print("Testing batch_get_item_code_by_name")
    print("="*60)
    
    # Test 1: Single item name
    print("\nTest 1: Single item name")
    result = batch_get_item_code_by_name(["MAX 60K TL3-X (12MPPT)"])
    print(f"Result: {result}")
    
    # Test 2: Multiple item names
    print("\nTest 2: Multiple item names")
    result = batch_get_item_code_by_name([
        "MAX 60K TL3-X (12MPPT)",
        "MAX 50K TL3-XE L1",
        "Nonexistent Item"
    ])
    print(f"Result: {result}")
    
    # Test 3: Empty list
    print("\nTest 3: Empty list")
    result = batch_get_item_code_by_name([])
    print(f"Result: {result}")
    
    print("\n" + "="*60)
    print("All tests completed successfully!")
    print("="*60 + "\n")

if __name__ == "__main__":
    test_batch_lookup()
