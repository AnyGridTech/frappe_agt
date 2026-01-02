import frappe


def before_save(doc, method):
	"""
	Custom handler for Stock Entry before_save event.
	
	Args:
		doc: The Stock Entry document instance
		method: The method name (before_save)
	"""
	# Add your custom logic here
	frappe.logger().info(f"Stock Entry {doc.name} is being saved")
	
	# Example: Add your custom validation or modifications
	# if doc.some_field:
	#     # Your custom logic
	#     pass
