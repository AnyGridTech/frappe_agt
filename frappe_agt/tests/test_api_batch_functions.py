"""
Test cases for batch API functions in frappe_agt.api

Run with:
    cd /workspace/development/frappe-bench
    bench --site dev.localhost run-tests frappe_agt.tests.test_api_batch_functions
    
Or run specific test:
    bench --site dev.localhost run-tests frappe_agt.tests.test_api_batch_functions.TestBatchAPIFunctions.test_batch_get_item_code_by_name_single
"""

import frappe
import unittest
from frappe_agt.api import batch_get_item_code_by_name, get_item_for_serial_number


class TestBatchAPIFunctions(unittest.TestCase):
    """Test suite for batch API functions"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test data"""
        frappe.set_user("Administrator")
        
        # Sample model names from the provided list
        cls.test_models = [
            "MAX 50K TL3-X L2 (8 MPPT)",
            "MAC 50K TL3-X LV",
            "SPF 5000 ES",
            "SPF 5000 TL HVM-WPV",
            "MID 20K TL3-XL",
            "MIN 6000 TL-X",
            "MOD 10000 TL3-X",
            "MIC 2000 TL-X",
            "MIN 5000 TL-X",
            "MIC 3000 TL-X"
        ]
    
    def test_batch_get_item_code_by_name_single(self):
        """Test batch lookup with a single item name"""
        print("\n[TEST] Testing batch_get_item_code_by_name with single item")
        
        result = batch_get_item_code_by_name(["MAX 50K TL3-X L2 (8 MPPT)"])
        
        self.assertIsInstance(result, dict)
        self.assertIn("MAX 50K TL3-X L2 (8 MPPT)", result)
        
        items = result["MAX 50K TL3-X L2 (8 MPPT)"]
        print(f"Found {len(items)} items for 'MAX 50K TL3-X L2 (8 MPPT)'")
        
        for item in items:
            self.assertIn("item_code", item)
            self.assertIn("item_name", item)
            print(f"  - {item['item_code']}: {item['item_name']}")
    
    def test_batch_get_item_code_by_name_multiple(self):
        """Test batch lookup with multiple item names"""
        print("\n[TEST] Testing batch_get_item_code_by_name with multiple items")
        
        test_names = [
            "MAX 50K TL3-X L2 (8 MPPT)",
            "SPF 5000 ES",
            "MIN 6000 TL-X"
        ]
        
        result = batch_get_item_code_by_name(test_names)
        
        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), len(test_names))
        
        for name in test_names:
            self.assertIn(name, result)
            items = result[name]
            print(f"\n{name}: Found {len(items)} item(s)")
            for item in items:
                print(f"  - {item['item_code']}: {item['item_name']}")
    
    def test_batch_get_item_code_by_name_all_models(self):
        """Test batch lookup with all provided models"""
        print("\n[TEST] Testing batch_get_item_code_by_name with all models")
        
        all_models = [
            "MAX 50K TL3-X L2 (8 MPPT)",
            "MAC 50K TL3-X LV",
            "SPF 5000 ES",
            "SPF 5000 TL HVM-WPV",
            "SPF 3000 TL HVM-48",
            "SPF 3500 ES",
            "SPF 3000 TL LVM-48P",
            "SPF 3000 TL LVM-24P",
            "MID 20K TL3-XL",
            "MIN 6000 TL-X",
            "MOD 10000 TL3-X",
            "MOD 15000 TL3-X",
            "MOD 13000 TL3-X",
            "SPF 3000 TL LVM-ES",
            "MIC 2000 TL-X",
            "MIN 5000 TL-X",
            "MIC 3000 TL-X",
            "MIN 6000 TL-X2",
            "MID 25K TL3-XL2",
            "MID 17K TL3-X",
            "MIC 1500 TL-X",
            "MIC 1000 TL-X",
            "MIC 2500 TL-X",
            "MIN 3000 TL-X",
            "SPF 8000 T HVM",
            "SPF 12000 T HVM",
            "SPF 10000 T HVM",
            "SPF 10000 T DVM",
            "SPF 8000 T DVM",
            "SPF 12000 T DVM",
            "NEO 2000M-X",
            "MID 25K TL3-X",
            "MIN 4200 TL-X",
            "NEO 2250M-X2",
            "MID 15K TL3-XL",
            "MIN 8000 TL-X (E)",
            "MIN 7000 TL-X (E)",
            "MAX 75K TL3 LV (7 MPPT)",
            "MIC 3000 TL-X2",
            "MIN 5000 TL-X2",
            "MID 40K TL3-X",
            "MID 36K TL3-X",
            "MID 15K TL3-X",
            "MID 20K TL3-X",
            "MID 30K TL3-X",
            "MIN 10000 TL-X",
            "MIN 3600 TL-X",
            "MAX 75K TL3-X L2 (8 MPPT)",
            "MAC 30K TL3-XL",
            "MAC 25K TL3-XL",
            "MAC 36K TL3-XL",
            "MIN 9000 TL-X",
            "MAX 80K TL3 MV (6 MPPT)",
            "MAX 60K TL3 LV (6 MPPT)",
            "MAX 70K TL3 LV (6 MPPT)",
            "MIN 2500 TL-X",
            "MAX 75K TL3 LV (6 MPPT)",
            "MIN 8000 TL-X2",
            "MIN 10000 TL-X2",
            "MID 36K TL3-X2",
            "MAX 125K TL3-X MV (10 MPPT)",
            "MAX 50K TL3 LV (6 MPPT)",
            "MAX 80K TL3 LV (6 MPPT)",
            "MAX 125K TL3-X LV (10 MPPT)",
            "MAX 100K TL3-X LV (10 MPPT)",
            "MID 22K TL3-X",
            "MID 25K TL3-X2",
            "MID 20K TL3-XL2"
        ]
        
        result = batch_get_item_code_by_name(all_models)
        
        self.assertIsInstance(result, dict)
        
        total_found = 0
        total_not_found = 0
        found_items = []
        not_found_items = []
        
        for model in all_models:
            self.assertIn(model, result)
            items = result[model]
            
            if items:
                total_found += 1
                found_items.append((model, len(items)))
            else:
                total_not_found += 1
                not_found_items.append(model)
        
        print(f"\nResults:")
        print(f"  Total models tested: {len(all_models)}")
        print(f"  Models with items found: {total_found}")
        print(f"  Models with no items: {total_not_found}")
        
        if found_items:
            print(f"\nFound items (showing first 10):")
            for model, count in found_items[:10]:
                print(f"  - {model}: {count} item(s)")
        
        if not_found_items:
            print(f"\nModels with no matching items (showing first 10):")
            for model in not_found_items[:10]:
                print(f"  - {model}")
    
    def test_batch_get_item_code_by_name_empty_list(self):
        """Test batch lookup with empty list"""
        print("\n[TEST] Testing batch_get_item_code_by_name with empty list")
        
        result = batch_get_item_code_by_name([])
        
        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), 0)
        print("Empty list handled correctly")
    
    def test_batch_get_item_code_by_name_nonexistent(self):
        """Test batch lookup with non-existent item name"""
        print("\n[TEST] Testing batch_get_item_code_by_name with non-existent item")
        
        result = batch_get_item_code_by_name(["NONEXISTENT_ITEM_XYZ_999"])
        
        self.assertIsInstance(result, dict)
        self.assertIn("NONEXISTENT_ITEM_XYZ_999", result)
        self.assertEqual(len(result["NONEXISTENT_ITEM_XYZ_999"]), 0)
        print("Non-existent item handled correctly - returned empty list")
    
    def test_batch_get_item_code_by_name_mixed(self):
        """Test batch lookup with mix of existing and non-existing items"""
        print("\n[TEST] Testing batch_get_item_code_by_name with mixed items")
        
        test_names = [
            "MAX 50K TL3-X L2 (8 MPPT)",
            "NONEXISTENT_ITEM_1",
            "SPF 5000 ES",
            "NONEXISTENT_ITEM_2"
        ]
        
        result = batch_get_item_code_by_name(test_names)
        
        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), len(test_names))
        
        for name in test_names:
            self.assertIn(name, result)
            items = result[name]
            status = f"{len(items)} item(s) found" if items else "Not found"
            print(f"  - {name}: {status}")
    
    def test_batch_get_item_code_by_name_json_string(self):
        """Test batch lookup with JSON string input"""
        print("\n[TEST] Testing batch_get_item_code_by_name with JSON string")
        
        import json
        test_names = ["MAX 50K TL3-X L2 (8 MPPT)", "SPF 5000 ES"]
        json_string = json.dumps(test_names)
        
        result = batch_get_item_code_by_name(json_string)
        
        self.assertIsInstance(result, dict)
        self.assertEqual(len(result), len(test_names))
        
        for name in test_names:
            self.assertIn(name, result)
            print(f"  - {name}: {len(result[name])} item(s)")
        
        print("JSON string input handled correctly")
    
    def test_batch_get_item_code_by_name_stock_items_only(self):
        """Test that only stock items are returned"""
        print("\n[TEST] Testing that only stock items are returned")
        
        result = batch_get_item_code_by_name(["MAX 50K TL3-X L2 (8 MPPT)"])
        
        if result["MAX 50K TL3-X L2 (8 MPPT)"]:
            item_code = result["MAX 50K TL3-X L2 (8 MPPT)"][0]["item_code"]
            
            # Verify the item is a stock item
            item_doc = frappe.get_doc("Item", item_code)
            self.assertEqual(item_doc.is_stock_item, 1)
            print(f"Verified {item_code} is a stock item")
    
    def test_batch_get_item_code_by_name_performance(self):
        """Test performance of batch lookup"""
        print("\n[TEST] Testing batch lookup performance")
        
        import time
        
        test_names = [
            "MAX 50K TL3-X L2 (8 MPPT)",
            "SPF 5000 ES",
            "MIN 6000 TL-X",
            "MIC 2000 TL-X",
            "MIN 5000 TL-X"
        ]
        
        start_time = time.time()
        result = batch_get_item_code_by_name(test_names)
        end_time = time.time()
        
        elapsed = (end_time - start_time) * 1000  # Convert to milliseconds
        
        print(f"Batch lookup of {len(test_names)} items took {elapsed:.2f}ms")
        print(f"Average per item: {elapsed/len(test_names):.2f}ms")
        
        # Should complete reasonably fast (less than 1 second for 5 items)
        self.assertLess(elapsed, 1000)
    
    def test_batch_get_item_code_by_name_whitespace(self):
        """Test batch lookup with whitespace in item names"""
        print("\n[TEST] Testing batch_get_item_code_by_name with whitespace")
        
        test_names = [
            "  MAX 50K TL3-X L2 (8 MPPT)  ",  # Leading/trailing spaces
            "MAX 50K TL3-X L2 (8 MPPT)"      # Normal
        ]
        
        result = batch_get_item_code_by_name(test_names)
        
        # Both should return results (whitespace stripped)
        for name in test_names:
            self.assertIn(name, result)
            print(f"  - '{name}': {len(result[name])} item(s)")


def run_simple_test():
    """
    Simple test function that can be run directly from bench console
    
    Usage:
        bench --site dev.localhost console
        >>> from frappe_agt.tests.test_api_batch_functions import run_simple_test
        >>> run_simple_test()
    """
    print("\n" + "="*60)
    print("SIMPLE TEST - batch_get_item_code_by_name")
    print("="*60)
    
    from frappe_agt.api import batch_get_item_code_by_name
    
    test_models = [
        "MAX 50K TL3-X L2 (8 MPPT)",
        "SPF 5000 ES",
        "MIN 6000 TL-X",
        "NONEXISTENT_MODEL_XYZ"
    ]
    
    print(f"\nTesting with {len(test_models)} models...")
    result = batch_get_item_code_by_name(test_models)
    
    print("\nResults:")
    for model in test_models:
        items = result.get(model, [])
        if items:
            print(f"\n✓ {model}:")
            for item in items:
                print(f"    - {item['item_code']}: {item['item_name']}")
        else:
            print(f"\n✗ {model}: No items found")
    
    print("\n" + "="*60)
    print("TEST COMPLETED")
    print("="*60 + "\n")
    
    return result


if __name__ == "__main__":
    # Allow running tests directly
    frappe.init(site="dev.localhost")
    frappe.connect()
    
    suite = unittest.TestLoader().loadTestsFromTestCase(TestBatchAPIFunctions)
    unittest.TextTestRunner(verbosity=2).run(suite)
