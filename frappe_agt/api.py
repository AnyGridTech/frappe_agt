import json
import frappe
from frappe import _
from typing import List, Dict, Any, Optional


@frappe.whitelist()
def backend_get_all(doctype: Optional[str] = None, fields: Optional[Any] = None, filters: Optional[Any] = None) -> Dict[str, Any]:
    """
    Fetch documents from a specified doctype with optional filters and fields.
    
    Args:
        doctype: Name of the doctype to query
        fields: List of fields to fetch (default: all fields)
        filters: Dictionary of filters to apply
        
    Returns:
        Dictionary with status and data/error
    """
    # Get parameters from form_dict if not provided directly
    if doctype is None:
        doctype = frappe.form_dict.get("doctype")
    if fields is None:
        fields = frappe.form_dict.get("fields", [])
    if filters is None:
        filters = frappe.form_dict.get("filters", {})

    # If fields/filters were passed as JSON-encoded strings from the client
    # (for example: '["name","parent"]' or '{"status":"Active"}'),
    # parse them into Python objects. This avoids Frappe's typing validation
    # error which occurs when the declared arg type is a list/dict but the
    # incoming value is a string.
    if isinstance(fields, str):
        try:
            parsed = json.loads(fields)
            # ensure list-like; if a single field name string was passed,
            # convert to a one-element list
            if isinstance(parsed, list):
                fields = parsed
            else:
                fields = [parsed]
        except Exception:
            # If parsing fails, try to support comma-separated values as a
            # fallback (e.g. 'name,parent')
            fields = [f.strip() for f in fields.split(",") if f.strip()]

    if isinstance(filters, str):
        try:
            filters = json.loads(filters)
        except Exception:
            # leave filters as string if it can't be parsed; later code will
            # pass None to get_all if filters isn't a dict
            pass
    
    # Validate required parameters
    if not doctype:
        return {
            "status": "error",
            "error": _("Doctype name is required")
        }
    
    # Validate that the doctype exists
    if not frappe.db.exists("DocType", doctype):
        return {
            "status": "error",
            "error": _("Doctype '{0}' does not exist").format(doctype)
        }
    
    try:
        # Check if user has permission to read the doctype
        if not frappe.has_permission(doctype, "read"):
            frappe.throw(_("Insufficient permissions to read {0}").format(doctype))
        
        # Fetch documents
        documents = frappe.get_all(
            doctype, 
            filters=filters if filters else None,
            fields=fields if fields else ["*"]
        )
        
        return {
            "status": "success",
            "data": documents
        }
    except frappe.PermissionError as e:
        frappe.log_error(title="Permission Error - Get Doctypes", message=str(e))
        return {
            "status": "error",
            "error": _("Permission denied: {0}").format(str(e))
        }
    except Exception as e:
        frappe.log_error(title="Get Doctypes Error", message=str(e))
        return {
            "status": "error",
            "error": _("Failed to fetch documents: {0}").format(str(e))
        }