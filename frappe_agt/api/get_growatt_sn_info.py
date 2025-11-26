import frappe
from frappe import _
from frappe.utils import make_post_request

@frappe.whitelist(allow_guest=True)
def get_growatt_sn_info(deviceSN: str):
    """
    Query the Growatt API to locate information for the provided serial number.
    """
    try:
        url = "https://br.growatt.com/support/locate"
        payload = {"deviceSN": deviceSN}
        headers = {"Content-Type": "application/json"}
        response = make_post_request(url, data=payload, headers=headers)
        return response
    except Exception as e:
        frappe.throw(_(f"Error querying Growatt: {str(e)}"))
