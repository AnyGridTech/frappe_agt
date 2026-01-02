import frappe
from frappe_agt.utils import validate_serial_number, get_growatt_sn_info


def before_save(doc, method):
	"""
	Custom handler for Stock Entry before_save event.
	Validates serial numbers format.
	
	Args:
		doc: The Stock Entry document instance
		method: The method name (before_save)
	"""
	for row in doc.items:
		if not row.serial_no:
			continue
			
		# Parse serial numbers (newline-separated)
		serial_numbers = [sn.strip() for sn in row.serial_no.split('\n') if sn.strip()]
		
		for sn in serial_numbers:
			# Validate serial number format
			if not validate_serial_number(sn):
				frappe.throw(f"Invalid serial number format: {sn}")


def get_item_code_for_serial_number(serial_number):
	"""
	Args:
		serial_number: The serial number to lookup
		
	Returns:
		str: Item code if found, None otherwise
	"""
	# Step 1: Check if Serial No already exists
	existing_serial = frappe.db.get_value(
		"Serial No",
		{"name": serial_number},
		["item_code", "item_name"],
		as_dict=True
	)
	
	if existing_serial and existing_serial.item_code:
		return existing_serial.item_code
	
	# Step 2: Fetch from Growatt API
	device_info = get_growatt_sn_info(serial_number)
	
	if not device_info or not device_info.get("data"):
		frappe.throw(f"Could not fetch device information for serial number: {serial_number}")
	
	model = device_info["data"].get("model")
	if not model:
		frappe.throw(f"No model information found for serial number: {serial_number}")
	
	# Step 3: Find matching items
	matching_items = find_items_by_model(model)
	
	if not matching_items:
		frappe.msgprint(
			f"No items found matching model '{model}' for serial number {serial_number}. "
			f"Please create the item or select manually.",
			indicator="orange",
			alert=True
		)
		return None
	
	# Step 4: Return or ask user to select
	if len(matching_items) == 1:
		item_code = matching_items[0]["item_code"]
		frappe.logger().info(f"Auto-filling item - Code: {item_code}, Name: {matching_items[0]['item_name']}")
		return item_code
	
	# Multiple matches - throw error with selection list
	items_list = "\n".join([
		f"  • {item['item_code']} - {item['item_name']}"
		for item in matching_items
	])
	
	frappe.throw(
		f"<b>Multiple items found for serial number {serial_number} (Model: {model})</b><br><br>"
		f"Please select the correct item manually from:<br><br>"
		f"<pre>{items_list}</pre><br>"
		f"Set the Item Code field before saving.",
		title="Item Selection Required"
	)


def find_items_by_model(model):
	"""
	Find items matching the model name.
	Only returns items that are stock items (maintain_stock = 1).
	
	Args:
		model: Model name from Growatt API (e.g., "MIN 10000TL-X")
		
	Returns:
		list: List of matching items with name and item_name
	"""
	# Search in item_name and item_code - only stock items
	items = frappe.get_all(
		"Item",
		filters=[
			["Item", "disabled", "=", 0],
			["Item", "is_stock_item", "=", 1],
			["Item", "item_name", "like", f"%{model}%"]
		],
		fields=["name", "item_name", "item_code"],
		limit=10
	)
	
	# Also search by item_code if no results
	if not items:
		items = frappe.get_all(
			"Item",
			filters=[
				["Item", "disabled", "=", 0],
				["Item", "is_stock_item", "=", 1],
				["Item", "item_code", "like", f"%{model}%"]
			],
			fields=["name", "item_name", "item_code"],
			limit=10
		)
	
	return items
