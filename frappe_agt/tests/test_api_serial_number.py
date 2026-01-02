"""
Test cases for serial number API functions in frappe_agt.api

Run with:
    cd /workspace/development/frappe-bench
    bench --site dev.localhost run-tests frappe_agt.tests.test_api_serial_number
"""

import frappe
import unittest
from unittest.mock import patch, MagicMock
from frappe_agt.api import get_item_for_serial_number


class TestSerialNumberAPI(unittest.TestCase):
    """Test suite for serial number API functions"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test data"""
        frappe.set_user("Administrator")
    
    @patch('frappe_agt.api.utils_get_sn_info')
    @patch('frappe.db.get_value')
    def test_get_item_for_serial_number_existing(self, mock_db_get, mock_api):
        """Test get_item_for_serial_number with existing serial number"""
        print("\n[TEST] Testing get_item_for_serial_number with existing serial number")
        
        # Mock existing serial number in database
        mock_db_get.return_value = {
            "item_code": "INV-MAX-50K-001",
            "item_name": "MAX 50K TL3-X L2 (8 MPPT)"
        }
        
        result = get_item_for_serial_number("TEST_SERIAL_123")
        
        self.assertIsInstance(result, dict)
        self.assertIn("items", result)
        self.assertIn("model", result)
        
        items = result["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["item_code"], "INV-MAX-50K-001")
        
        print(f"Found existing item: {items[0]['item_code']}")
        # API should not be called if serial exists
        mock_api.assert_not_called()
    
    @patch('frappe_agt.api.find_items_by_model')
    @patch('frappe_agt.api.utils_get_sn_info')
    @patch('frappe.db.get_value')
    def test_get_item_for_serial_number_api_lookup(self, mock_db_get, mock_api, mock_find):
        """Test get_item_for_serial_number with API lookup"""
        print("\n[TEST] Testing get_item_for_serial_number with API lookup")
        
        # Mock no existing serial number
        mock_db_get.return_value = None
        
        # Mock Growatt API response
        mock_api.return_value = {
            "data": {
                "model": "MAX 50K TL3-X L2"
            }
        }
        
        # Mock find_items_by_model result
        mock_find.return_value = [
            {"item_code": "INV-MAX-50K-001", "item_name": "MAX 50K TL3-X L2 (8 MPPT)"},
            {"item_code": "INV-MAX-50K-002", "item_name": "MAX 50K TL3-X L2"}
        ]
        
        result = get_item_for_serial_number("TEST_SERIAL_NEW")
        
        self.assertIsInstance(result, dict)
        self.assertIn("items", result)
        self.assertIn("model", result)
        self.assertEqual(result["model"], "MAX 50K TL3-X L2")
        
        items = result["items"]
        self.assertEqual(len(items), 2)
        
        print(f"API returned model: {result['model']}")
        print(f"Found {len(items)} matching items")
        for item in items:
            print(f"  - {item['item_code']}: {item['item_name']}")
        
        # Verify API was called
        mock_api.assert_called_once_with("TEST_SERIAL_NEW")
    
    @patch('frappe_agt.api.utils_get_sn_info')
    @patch('frappe.db.get_value')
    def test_get_item_for_serial_number_no_data(self, mock_db_get, mock_api):
        """Test get_item_for_serial_number with no API data"""
        print("\n[TEST] Testing get_item_for_serial_number with no API data")
        
        mock_db_get.return_value = None
        mock_api.return_value = None
        
        result = get_item_for_serial_number("INVALID_SERIAL")
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result["items"], [])
        self.assertIsNone(result["model"])
        
        print("Handled invalid serial number correctly")
    
    @patch('frappe_agt.api.utils_get_sn_info')
    @patch('frappe.db.get_value')
    def test_get_item_for_serial_number_no_model(self, mock_db_get, mock_api):
        """Test get_item_for_serial_number with API data but no model"""
        print("\n[TEST] Testing get_item_for_serial_number with no model in API response")
        
        mock_db_get.return_value = None
        mock_api.return_value = {"data": {}}  # No model field
        
        result = get_item_for_serial_number("TEST_SERIAL_NO_MODEL")
        
        self.assertIsInstance(result, dict)
        self.assertEqual(result["items"], [])
        self.assertIsNone(result["model"])
        
        print("Handled missing model correctly")


def run_serial_number_test():
    """
    Simple test function for serial number lookup
    
    Usage:
        bench --site dev.localhost console
        >>> from frappe_agt.tests.test_api_serial_number import run_serial_number_test
        >>> run_serial_number_test()
    """
    print("\n" + "="*60)
    print("MANUAL TEST - Serial Number Lookup")
    print("="*60)
    
    # Note: This requires actual serial numbers from the database
    # You can replace this with actual serial numbers for testing
    
    test_serials = [
        # Add real serial numbers here for testing
        # "DWH1A5002A",
        # "YEDKCHC0N9",
    ]
    
    if not test_serials:
        print("\nNo test serial numbers provided.")
        print("Add serial numbers to the test_serials list to test.")
        print("\nExample:")
        print("  test_serials = ['DWH1A5002A', 'YEDKCHC0N9']")
        return
    
    from frappe_agt.api import get_item_for_serial_number
    
    for sn in test_serials:
        print(f"\n{'='*60}")
        print(f"Testing Serial Number: {sn}")
        print('='*60)
        
        try:
            result = get_item_for_serial_number(sn)
            
            print(f"\nModel: {result.get('model', 'N/A')}")
            
            items = result.get('items', [])
            if items:
                print(f"Found {len(items)} matching item(s):")
                for item in items:
                    print(f"  - {item['item_code']}: {item['item_name']}")
            else:
                print("No matching items found")
        
        except Exception as e:
            print(f"Error: {str(e)}")
    
    print("\n" + "="*60)
    print("TEST COMPLETED")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Allow running tests directly
    frappe.init(site="dev.localhost")
    frappe.connect()
    
    suite = unittest.TestLoader().loadTestsFromTestCase(TestSerialNumberAPI)
    unittest.TextTestRunner(verbosity=2).run(suite)
