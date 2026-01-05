import re
import frappe
from typing import Optional, Literal


def validate_serial_number( 
	sn: str, 
	type: Optional[Literal['inverter', 'battery', 'ev_charger', 'transformer', 'smart_meter', 'smart_energy_manager', 'other']] = None
) -> bool:
	"""
	Validate serial number based on regex patterns and optional type.
	
	Args:
		sn: Serial number string to validate
		type: Optional device type to apply specific validation rules
		
	Returns:
		bool: True if serial number is valid, False otherwise
	"""
	if not sn or not isinstance(sn, str):
		return False
	
	sn = sn.strip().upper()
	
	# Regex patterns
	sn_regex = re.compile(r'^[A-Z0-9][A-Z][A-Z0-9]([A-Z0-9]{7}|[A-Z0-9]{13})$')
	iv_sn_regex = re.compile(r'^[A-Z0-9]{3}[A-Z0-9]{7}$')
	other_sn_regex = re.compile(r'^[A-Z0-9]{3}[A-Z0-9]{13}$')
	
	output = False
	if type == 'inverter':
		output = bool(iv_sn_regex.match(sn))
	elif type in ('battery', 'ev_charger'):
		output = bool(other_sn_regex.match(sn))
	else:
		output = bool(sn_regex.match(sn))
	
	return output


def get_growatt_sn_info(serial_no: str) -> Optional[dict]:
	"""
	Get Growatt serial number information from API.
	
	Args:
		serial_no: Serial number to look up
		
	Returns:
		dict: API response if successful (with 'code', 'msg', and optionally 'data' fields), None otherwise
	
	Example response structure:
		{
			'code': 200,
			'msg': 'success',
			'data': {
				'deviceSN': 'ABC1234567',
				'model': 'MID 25KTL3-X',
				'deliveryTime': '2024-01-15',
				...
			}
		}
	"""
	try:
		# Import the API method and call it directly (server-side)
		from frappe_agt.api import get_growatt_sn_info as api_get_growatt_sn_info
		
		# Call the API method directly
		response = api_get_growatt_sn_info(serial_no)
		
		# Check if response is valid (should have 'code' field)
		if not response or not isinstance(response, dict):
			return None
		
		# Return None if code field is missing
		if 'code' not in response:
			return None
		
		# Return None for non-200 responses (device not found, etc.)
		if response['code'] != 200:
			return None
		
		return response
		
	except Exception as e:
		frappe.log_error(title="Growatt API Error", message=f"Error fetching Growatt SN info: {str(e)}")
		return None
