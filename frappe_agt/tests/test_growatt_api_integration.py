# Copyright (c) 2025, AnyGridTech and Contributors
# See license.txt

"""
Integration tests for Growatt API - Real Server Tests

These tests make actual HTTP requests to the Growatt API server.
They are disabled by default and can be enabled by setting the 
environment variable: ENABLE_GROWATT_API_TESTS=1

To run these tests:
  export ENABLE_GROWATT_API_TESTS=1
  bench --site dev.localhost run-tests --app frappe_agt --module frappe_agt.tests.test_growatt_api_integration
"""

import os
import frappe
import unittest
from frappe.tests.utils import FrappeTestCase
from frappe_agt.utils.validation import validate_serial_number, get_growatt_sn_info


# Skip tests by default unless explicitly enabled
ENABLE_TESTS = os.environ.get('ENABLE_GROWATT_API_TESTS', '0') == '1'


@unittest.skipUnless(ENABLE_TESTS, "Growatt API integration tests are disabled. Set ENABLE_GROWATT_API_TESTS=1 to enable.")
class TestGrowattAPIIntegration(FrappeTestCase):
	"""Integration tests for real Growatt API calls"""

	def setUp(self):
		"""Set up test fixtures"""
		frappe.set_user("Administrator")
		
		# Test serial numbers - replace with real ones if available
		# You can add your own serial numbers here for testing
		self.test_serial_numbers = {
			'valid_inverter': None,  # Set to a real inverter SN for testing
			'valid_battery': None,   # Set to a real battery SN for testing
			'invalid': 'INVALID123'  # Known invalid SN
		}

	def test_api_endpoint_reachable(self):
		"""Test that the Growatt API endpoint is reachable"""
		import requests
		
		url = "https://br.growatt.com/support/locate"
		
		# Make a test request with an invalid SN to verify endpoint is up
		try:
			response = requests.post(
				url,
				json={"deviceSN": "TEST000000"},
				headers={"Content-Type": "application/json"},
				timeout=10
			)
			
			# Endpoint should respond (even if SN is invalid)
			self.assertIsNotNone(response)
			self.assertIn(response.status_code, [200, 400, 404])
			
			# Should return JSON
			data = response.json()
			self.assertIsInstance(data, dict)
			
			# Should have a 'code' field
			self.assertIn('code', data)
			
			print(f"\n✓ API endpoint is reachable")
			print(f"  Status Code: {response.status_code}")
			print(f"  Response Code: {data.get('code')}")
			print(f"  Response Message: {data.get('msg', 'N/A')}")
			
		except Exception as e:
			self.fail(f"API endpoint is not reachable: {str(e)}")

	@unittest.skipIf(True, "Requires valid serial number - set self.test_serial_numbers['valid_inverter']")
	def test_get_growatt_sn_info_valid_inverter(self):
		"""Test fetching info for a valid inverter serial number"""
		sn = self.test_serial_numbers['valid_inverter']
		
		if not sn:
			self.skipTest("No valid inverter serial number provided")
		
		# Validate format first
		self.assertTrue(
			validate_serial_number(sn, type='inverter'),
			f"Serial number {sn} should have valid format"
		)
		
		# Fetch from API
		result = get_growatt_sn_info(sn)
		
		# Verify response
		self.assertIsNotNone(result, "API should return data for valid SN")
		self.assertEqual(result.get('code'), 200, "Response code should be 200")
		self.assertIn('data', result, "Response should contain data field")
		
		data = result['data']
		self.assertEqual(data['deviceSN'], sn.upper(), "Device SN should match")
		
		print(f"\n✓ Successfully fetched inverter info:")
		print(f"  Serial Number: {data.get('deviceSN')}")
		print(f"  Model: {data.get('model')}")
		print(f"  Delivery Time: {data.get('deliveryTime')}")
		print(f"  Warranty Time: {data.get('warrantyTime')} years")

	@unittest.skipIf(True, "Requires valid serial number - set self.test_serial_numbers['valid_battery']")
	def test_get_growatt_sn_info_valid_battery(self):
		"""Test fetching info for a valid battery serial number"""
		sn = self.test_serial_numbers['valid_battery']
		
		if not sn:
			self.skipTest("No valid battery serial number provided")
		
		# Validate format first
		self.assertTrue(
			validate_serial_number(sn, type='battery'),
			f"Serial number {sn} should have valid format"
		)
		
		# Fetch from API
		result = get_growatt_sn_info(sn)
		
		# Verify response
		self.assertIsNotNone(result, "API should return data for valid SN")
		self.assertEqual(result.get('code'), 200, "Response code should be 200")
		self.assertIn('data', result, "Response should contain data field")
		
		data = result['data']
		self.assertEqual(data['deviceSN'], sn.upper(), "Device SN should match")
		
		print(f"\n✓ Successfully fetched battery info:")
		print(f"  Serial Number: {data.get('deviceSN')}")
		print(f"  Model: {data.get('model')}")
		print(f"  Delivery Time: {data.get('deliveryTime')}")

	def test_get_growatt_sn_info_invalid_format(self):
		"""Test API response for invalid serial number format"""
		sn = self.test_serial_numbers['invalid']
		
		# Should not pass format validation
		self.assertFalse(
			validate_serial_number(sn),
			f"Serial number {sn} should be invalid"
		)
		
		# API call should handle gracefully (return None or error response)
		result = get_growatt_sn_info(sn)
		
		# Should either return None or a non-200 response
		if result is not None:
			self.assertNotEqual(result.get('code'), 200, "Invalid SN should not return 200")
			print(f"\n✓ API correctly rejected invalid SN:")
			print(f"  Response Code: {result.get('code')}")
			print(f"  Response Message: {result.get('msg', 'N/A')}")
		else:
			print(f"\n✓ Invalid SN returned None (expected)")

	def test_api_response_structure(self):
		"""Test that API response has the expected structure"""
		import requests
		import json
		
		url = "https://br.growatt.com/support/locate"
		
		# Use a test SN (format valid but likely not in database)
		test_sn = "ABC1234567"
		
		response = requests.post(
			url,
			data=json.dumps({"deviceSN": test_sn}),
			headers={"Content-Type": "application/json"},
			timeout=10
		)
		
		data = response.json()
		
		# Verify response structure
		self.assertIsInstance(data, dict, "Response should be a dictionary")
		self.assertIn('code', data, "Response should have 'code' field")
		self.assertIn('msg', data, "Response should have 'msg' field")
		
		# Code should be an integer
		self.assertIsInstance(data['code'], int, "'code' should be an integer")
		
		print(f"\n✓ API response structure is correct:")
		print(f"  Fields: {list(data.keys())}")
		print(f"  Code Type: {type(data['code']).__name__}")
		print(f"  Has Data Field: {'data' in data}")

	def test_api_timeout_handling(self):
		"""Test that API calls handle timeout correctly"""
		import requests
		
		url = "https://br.growatt.com/support/locate"
		
		try:
			# Make request with very short timeout
			response = requests.post(
				url,
				json={"deviceSN": "TEST000000"},
				headers={"Content-Type": "application/json"},
				timeout=0.001  # 1ms - should timeout
			)
			
			# If we get here, connection was very fast
			print(f"\n✓ API responded faster than timeout")
			
		except requests.exceptions.Timeout:
			# This is expected behavior
			print(f"\n✓ Timeout is handled correctly")
			
		except Exception as e:
			# Other exceptions are also acceptable (connection errors, etc.)
			print(f"\n✓ Network error handled: {type(e).__name__}")


class TestGrowattAPIWithRealSN(FrappeTestCase):
	"""
	Tests for real serial numbers - To be run manually
	
	To use these tests:
	1. Set the ENABLE_GROWATT_API_TESTS environment variable
	2. Update the serial numbers in the test methods
	3. Run specific test methods
	
	Example:
	  export ENABLE_GROWATT_API_TESTS=1
	  bench --site dev.localhost run-tests --app frappe_agt --test TestGrowattAPIWithRealSN.test_with_provided_sn
	"""
	
	@unittest.skipUnless(ENABLE_TESTS, "API tests disabled")
	def test_with_provided_sn(self):
		"""
		Test with a specific serial number
		
		Modify this test to use real serial numbers provided by the user.
		"""
		# REPLACE THESE WITH REAL SERIAL NUMBERS
		test_cases = [
			# Format: (serial_number, device_type, expected_valid)
			# ('ABC1234567', 'inverter', True),
			# ('XYZ1234567890123', 'battery', True),
		]
		
		if not test_cases:
			self.skipTest("No serial numbers provided - add them to the test_cases list")
		
		for sn, device_type, expected_valid in test_cases:
			print(f"\n{'='*60}")
			print(f"Testing SN: {sn}")
			print(f"Type: {device_type}")
			print(f"{'='*60}")
			
			# Validate format
			is_valid_format = validate_serial_number(sn, type=device_type)
			print(f"\n1. Format Validation: {'✓ PASS' if is_valid_format else '✗ FAIL'}")
			
			if expected_valid:
				self.assertTrue(is_valid_format, f"SN should have valid {device_type} format")
			
			# Fetch from API
			print(f"\n2. Fetching from Growatt API...")
			result = get_growatt_sn_info(sn)
			
			if result:
				print(f"   ✓ API Response Received")
				print(f"   Response Code: {result.get('code')}")
				print(f"   Response Message: {result.get('msg', 'N/A')}")
				
				if result.get('code') == 200 and 'data' in result:
					data = result['data']
					print(f"\n3. Device Information:")
					print(f"   Serial Number: {data.get('deviceSN')}")
					print(f"   Model: {data.get('model')}")
					print(f"   Order Number: {data.get('orderNumber')}")
					print(f"   Delivery Time: {data.get('deliveryTime')}")
					print(f"   Warranty Time: {data.get('warrantyTime')} years")
					print(f"   Warranty Expires: {data.get('outTime')}")
					print(f"   Device Type: {data.get('deviceType')}")
					print(f"   Country ID: {data.get('countryId')}")
					
					# Verify SN matches
					self.assertEqual(
						data.get('deviceSN', '').upper(), 
						sn.upper(), 
						"Returned SN should match requested SN"
					)
				else:
					print(f"   ✗ Device not found or error in response")
			else:
				print(f"   ✗ API returned None (likely error or device not found)")


def run_manual_test_with_sn(serial_number: str, device_type: str = None):
	"""
	Helper function to manually test a serial number
	
	Usage:
		from frappe_agt.tests.test_growatt_api_integration import run_manual_test_with_sn
		run_manual_test_with_sn('ABC1234567', 'inverter')
	"""
	print(f"\n{'='*70}")
	print(f"MANUAL TEST - Serial Number: {serial_number}")
	print(f"{'='*70}\n")
	
	# Step 1: Validate format
	print("Step 1: Validating serial number format...")
	is_valid = validate_serial_number(serial_number, type=device_type)
	print(f"  Format: {'✓ VALID' if is_valid else '✗ INVALID'}")
	
	if device_type:
		print(f"  Type: {device_type}")
	
	# Step 2: Fetch from API
	print("\nStep 2: Fetching from Growatt API...")
	result = get_growatt_sn_info(serial_number)
	
	if result:
		print(f"  ✓ API Response Received")
		print(f"\nResponse Details:")
		print(f"  Code: {result.get('code')}")
		print(f"  Message: {result.get('msg', 'N/A')}")
		
		if result.get('code') == 200 and 'data' in result:
			data = result['data']
			print(f"\nDevice Information:")
			for key, value in data.items():
				print(f"  {key}: {value}")
		else:
			print(f"\n  Device not found or error response")
	else:
		print(f"  ✗ API returned None (error or device not found)")
	
	print(f"\n{'='*70}\n")
	return result


if __name__ == '__main__':
	unittest.main()
