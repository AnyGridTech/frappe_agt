
import frappe
import json
import requests

@frappe.whitelist(allow_guest=True)
def get_growatt_sn_info(deviceSN):
    try:
        url = "https://br.growatt.com/support/locate"
        payload = {"deviceSN": deviceSN}
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        frappe.throw(f"Error: {str(e)}")