# Copyright (c) 2025, AnyGridTech and Contributors
# See license.txt

import frappe
import unittest
from unittest.mock import patch, MagicMock
from frappe.tests.utils import FrappeTestCase
from frappe_agt.utils.validation import validate_serial_number, get_growatt_sn_info


class TestValidation(FrappeTestCase):
	"""Test cases for validation utility functions"""

	def test_validate_serial_number_empty_string(self):
		"""Test that empty string returns False"""
		self.assertFalse(validate_serial_number(""))
		self.assertFalse(validate_serial_number(None))

	def test_validate_serial_number_non_string(self):
		"""Test that non-string input returns False"""
		self.assertFalse(validate_serial_number(123))
		self.assertFalse(validate_serial_number([]))
		self.assertFalse(validate_serial_number({}))

	def test_validate_serial_number_inverter_valid(self):
		"""Test valid inverter serial numbers"""
		# Valid inverter: 10 characters (3 prefix + 7 digits)
		self.assertTrue(validate_serial_number("ABC1234567", type="inverter"))
		self.assertTrue(validate_serial_number("1BC1234567", type="inverter"))
		self.assertTrue(validate_serial_number("AB11234567", type="inverter"))

	def test_validate_serial_number_inverter_invalid(self):
		"""Test invalid inverter serial numbers"""
		# Too short
		self.assertFalse(validate_serial_number("ABC123456", type="inverter"))
		# Too long
		self.assertFalse(validate_serial_number("ABC12345678", type="inverter"))
		# Wrong format
		self.assertFalse(validate_serial_number("ABC12345678901234", type="inverter"))

	def test_validate_serial_number_battery_valid(self):
		"""Test valid battery serial numbers"""
		# Valid battery: 16 characters (3 prefix + 13 digits)
		self.assertTrue(validate_serial_number("ABC1234567890123", type="battery"))
		self.assertTrue(validate_serial_number("1BC1234567890123", type="battery"))

	def test_validate_serial_number_battery_invalid(self):
		"""Test invalid battery serial numbers"""
		# Too short
		self.assertFalse(validate_serial_number("ABC123456789012", type="battery"))
		# Too long
		self.assertFalse(validate_serial_number("ABC12345678901234", type="battery"))
		# Wrong format
		self.assertFalse(validate_serial_number("ABC1234567", type="battery"))

	def test_validate_serial_number_ev_charger_valid(self):
		"""Test valid EV charger serial numbers"""
		# Valid ev_charger: 16 characters (3 prefix + 13 digits)
		self.assertTrue(validate_serial_number("ABC1234567890123", type="ev_charger"))

	def test_validate_serial_number_generic_valid(self):
		"""Test valid generic serial numbers (no type specified)"""
		# Can be either 10 or 16 characters
		self.assertTrue(validate_serial_number("ABC1234567"))  # 10 chars
		self.assertTrue(validate_serial_number("ABC1234567890123"))  # 16 chars

	def test_validate_serial_number_case_insensitive(self):
		"""Test that serial number validation is case-insensitive"""
		self.assertTrue(validate_serial_number("abc1234567", type="inverter"))
		self.assertTrue(validate_serial_number("AbC1234567", type="inverter"))
		self.assertTrue(validate_serial_number("ABC1234567", type="inverter"))

	def test_validate_serial_number_trim_whitespace(self):
		"""Test that whitespace is trimmed"""
		self.assertTrue(validate_serial_number("  ABC1234567  ", type="inverter"))
		self.assertTrue(validate_serial_number("\tABC1234567\n", type="inverter"))

	@patch('frappe_agt.api.get_growatt_sn_info')
	def test_get_growatt_sn_info_success(self, mock_api):
		"""Test successful Growatt SN info retrieval"""
		mock_response = {
			'code': 200,
			'data': {
				'deviceSN': 'ABC1234567',
				'deviceType': 'Inverter'
			}
		}
		mock_api.return_value = mock_response

		result = get_growatt_sn_info('ABC1234567')
		
		self.assertIsNotNone(result)
		self.assertEqual(result['code'], 200)
		self.assertIn('data', result)
		mock_api.assert_called_once_with('ABC1234567')

	@patch('frappe_agt.api.get_growatt_sn_info')
	def test_get_growatt_sn_info_failure(self, mock_api):
		"""Test failed Growatt SN info retrieval"""
		mock_response = {
			'code': 404,
			'msg': 'Device not found'
		}
		mock_api.return_value = mock_response

		result = get_growatt_sn_info('INVALID123')
		
		self.assertIsNone(result)

	@patch('frappe_agt.api.get_growatt_sn_info')
	def test_get_growatt_sn_info_no_code(self, mock_api):
		"""Test Growatt SN info with no code in response"""
		mock_api.return_value = {}

		result = get_growatt_sn_info('ABC1234567')
		
		self.assertIsNone(result)

	@patch('frappe_agt.utils.validation.frappe.log_error')
	@patch('frappe_agt.api.get_growatt_sn_info')
	def test_get_growatt_sn_info_exception(self, mock_api, mock_log_error):
		"""Test Growatt SN info when exception occurs"""
		mock_api.side_effect = Exception('Network error')

		result = get_growatt_sn_info('ABC1234567')
		
		self.assertIsNone(result)
		mock_log_error.assert_called_once()


class TestStockEntryHooks(FrappeTestCase):
	"""Test cases for Stock Entry hooks"""

	@patch('frappe_agt.stock_entry.frappe.logger')
	def test_stock_entry_before_save(self, mock_logger):
		"""Test Stock Entry before_save hook"""
		from frappe_agt.stock_entry import before_save
		
		# Create a mock Stock Entry document
		mock_doc = MagicMock()
		mock_doc.name = 'TEST-SE-001'
		
		# Call the before_save function
		before_save(mock_doc, 'before_save')
		
		# Verify logger was called
		mock_logger.return_value.info.assert_called()


def run_tests():
	"""Run all validation tests"""
	frappe.flags.in_test = True
	unittest.main()


if __name__ == '__main__':
	run_tests()
