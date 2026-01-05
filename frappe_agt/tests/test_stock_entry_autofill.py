"""
Test Stock Entry auto-fill functionality
"""
import frappe
from frappe.tests.utils import FrappeTestCase
from unittest.mock import patch, MagicMock


class TestStockEntryAutoFill(FrappeTestCase):
	def setUp(self):
		# Create a test item if it doesn't exist
		if not frappe.db.exists("Item", "TEST-GROWATT-MIN-10000TL-X"):
			self.test_item = frappe.get_doc({
				"doctype": "Item",
				"item_code": "TEST-GROWATT-MIN-10000TL-X",
				"item_name": "MIN 10000TL-X",
				"item_group": "Products",
				"stock_uom": "Nos"
			})
			self.test_item.insert()
		else:
			self.test_item = frappe.get_doc("Item", "TEST-GROWATT-MIN-10000TL-X")
	
	def tearDown(self):
		# Clean up
		frappe.db.rollback()
	
	@patch('frappe_agt.utils.validation.requests.post')
	def test_auto_fill_item_single_match(self, mock_post):
		"""Test auto-fill when exactly one item matches"""
		# Mock API response
		mock_response = MagicMock()
		mock_response.json.return_value = {
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
		mock_post.return_value = mock_response
		
		# Create Stock Entry without item_code
		stock_entry = frappe.get_doc({
			"doctype": "Stock Entry",
			"stock_entry_type": "Material Receipt",
			"company": frappe.defaults.get_defaults().get("company") or "Test Company",
			"items": [{
				"serial_no": "XZJ6CF806L",
				"qty": 1,
				"t_warehouse": "Stores - TC"
			}]
		})
		
		# Before save should auto-fill item_code
		stock_entry.before_save()
		
		# Check if item_code was set
		self.assertEqual(stock_entry.items[0].item_code, "TEST-GROWATT-MIN-10000TL-X")
		self.assertEqual(stock_entry.items[0].item_name, "MIN 10000TL-X")
	
	@patch('frappe_agt.utils.validation.requests.post')
	def test_validation_invalid_serial_number(self, mock_post):
		"""Test that invalid serial numbers are rejected"""
		stock_entry = frappe.get_doc({
			"doctype": "Stock Entry",
			"stock_entry_type": "Material Receipt",
			"company": frappe.defaults.get_defaults().get("company") or "Test Company",
			"items": [{
				"serial_no": "INVALID",
				"qty": 1,
				"t_warehouse": "Stores - TC"
			}]
		})
		
		# Should throw validation error
		with self.assertRaises(frappe.ValidationError):
			stock_entry.before_save()
	
	def test_existing_serial_no_item_code(self):
		"""Test that existing Serial No item_code is used"""
		# Create a Serial No with item_code
		if not frappe.db.exists("Serial No", "TEST-SN-123"):
			serial_no = frappe.get_doc({
				"doctype": "Serial No",
				"serial_no": "TEST-SN-123",
				"item_code": "TEST-GROWATT-MIN-10000TL-X",
				"company": frappe.defaults.get_defaults().get("company") or "Test Company"
			})
			serial_no.insert()
		
		# Create Stock Entry
		stock_entry = frappe.get_doc({
			"doctype": "Stock Entry",
			"stock_entry_type": "Material Receipt",
			"company": frappe.defaults.get_defaults().get("company") or "Test Company",
			"items": [{
				"serial_no": "TEST-SN-123",
				"qty": 1,
				"t_warehouse": "Stores - TC"
			}]
		})
		
		# Should use existing Serial No's item_code
		from frappe_agt.stock_entry import get_item_code_for_serial_number
		item_code = get_item_code_for_serial_number("TEST-SN-123")
		
		self.assertEqual(item_code, "TEST-GROWATT-MIN-10000TL-X")


class TestFindItemsByModel(FrappeTestCase):
	def setUp(self):
		# Create test items
		self.test_items = []
		
		for i, name in enumerate([
			"MIN 10000TL-X",
			"MIN 10000TL-X V2",
			"MIN 10000TL"
		]):
			item_code = f"TEST-ITEM-{i}"
			if not frappe.db.exists("Item", item_code):
				item = frappe.get_doc({
					"doctype": "Item",
					"item_code": item_code,
					"item_name": name,
					"item_group": "Products",
					"stock_uom": "Nos"
				})
				item.insert()
				self.test_items.append(item)
	
	def tearDown(self):
		frappe.db.rollback()
	
	def test_find_multiple_items(self):
		"""Test finding multiple matching items"""
		from frappe_agt.stock_entry import find_items_by_model
		
		items = find_items_by_model("MIN 10000TL-X")
		
		# Should find items with matching names
		self.assertGreaterEqual(len(items), 1)
		
		# Check that test items are in results
		item_names = [item["item_name"] for item in items]
		self.assertIn("MIN 10000TL-X", item_names)
	
	def test_find_no_items(self):
		"""Test when no items match"""
		from frappe_agt.stock_entry import find_items_by_model
		
		items = find_items_by_model("NONEXISTENT-MODEL-XYZ")
		
		self.assertEqual(len(items), 0)
