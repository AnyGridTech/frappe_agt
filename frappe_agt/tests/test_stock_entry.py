# Copyright (c) 2025, AnyGridTech and Contributors
# See license.txt

import frappe
import unittest
from unittest.mock import patch, MagicMock
from frappe.tests.utils import FrappeTestCase


class TestStockEntryIntegration(FrappeTestCase):
	"""Integration tests for Stock Entry customizations"""

	def setUp(self):
		"""Set up test fixtures"""
		frappe.set_user("Administrator")

	def tearDown(self):
		"""Clean up after tests"""
		frappe.db.rollback()

	@patch('frappe_agt.stock_entry.frappe.logger')
	def test_before_save_hook_is_called(self, mock_logger):
		"""Test that before_save hook is properly called"""
		from frappe_agt.stock_entry import before_save
		
		# Create a mock document
		mock_doc = MagicMock()
		mock_doc.name = 'TEST-STOCK-001'
		mock_doc.doctype = 'Stock Entry'
		
		# Call the hook
		before_save(mock_doc, 'before_save')
		
		# Verify the logger was called with correct message
		mock_logger.return_value.info.assert_called()
		call_args = mock_logger.return_value.info.call_args[0][0]
		self.assertIn('TEST-STOCK-001', call_args)

	def test_stock_entry_hook_registered(self):
		"""Test that Stock Entry hook is properly registered in hooks.py"""
		from frappe_agt import hooks
		
		# Check that doc_events is configured
		self.assertIsNotNone(hooks.doc_events)
		self.assertIn('Stock Entry', hooks.doc_events)
		self.assertIn('before_save', hooks.doc_events['Stock Entry'])
		self.assertEqual(
			hooks.doc_events['Stock Entry']['before_save'],
			'frappe_agt.stock_entry.before_save'
		)


if __name__ == '__main__':
	unittest.main()
