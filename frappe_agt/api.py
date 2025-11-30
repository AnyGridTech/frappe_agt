
import frappe
import json
import requests
import frappe.utils
from frappe import _

###############################################################
# get_growatt_sn_info
###############################################################

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

###############################################################
# import_movidesk_and_create_entries
###############################################################
@frappe.whitelist(allow_guest=True)
def import_movidesk_and_create_entries(auth_token, company="AnyGrid", warehouse="[AW] Waiting at Customer Site - ANY", stock_entry_type="Material Receipt"):
    """
    Imports data from Movidesk and creates Serial No and Stock Entry for each returned item.
    Args:
        auth_token (str): Movidesk authorization token.
        company (str): Company name.
        warehouse (str): Warehouse name.
        stock_entry_type (str): Stock Entry type.
    """
    try:
        headers = {"authorization": auth_token}
        url = "https://movidesk.growattbrasil.com.br/webhook/lastTenDays"
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        results = []
        for item in data:
            item_code = item.get('item_code')
            serial_no = item.get('serial_no')
            if not item_code or not serial_no:
                continue
            # Create Serial No if it does not exist
            if not frappe.db.exists('Serial No', serial_no):
                serial_doc = frappe.get_doc({
                    "doctype": "Serial No",
                    "serial_no": serial_no,
                    "item_code": item_code,
                    "company": company
                })
                serial_doc.insert()
            # Create Stock Entry
            stock_entry = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": stock_entry_type,
                "items": [{
                    "item_code": item_code,
                    "serial_no": serial_no,
                    "qty": 1,
                    "uom": "Nos",
                    "target_warehouse": warehouse
                }],
                "company": company
            })
            stock_entry.insert()
            stock_entry.submit()
            results.append({"serial_no": serial_no, "item_code": item_code, "stock_entry": stock_entry.name})
        return {"status": "success", "created": results}
    except Exception as e:
        frappe.throw(f"Erro ao importar e criar entradas: {str(e)}")

###############################################################
# backend_get_all
###############################################################
@frappe.whitelist()
def backend_get_all(doctype_name, fields=None, filters=None):
    """
    Fetches records from a doctype with custom filters and fields.
    """
    try:
        fields = fields or []
        filters = filters or {}
        doctypes = frappe.get_all(doctype_name, filters=filters, fields=fields)
        return {"status": "success", "data": doctypes}
    except Exception as e:
        frappe.log_error(title="Get Doctypes Error", message=str(e))
        frappe.throw(f"Erro ao buscar registros: {str(e)}")
        

###############################################################
# check_cep
###############################################################
# NOTE: Only for individual CEP lookups, not for mass queries.
# Example call via URL: https://erp.growatt.app/api/method/check_cep?cep=01310000
# Example call via JS:
# frappe.call({ method: "check_cep", args: { cep: "01001000" } }).then(r => console.log(r.message));

def fetch_cep_data_v1(digits):
    try:
        response = frappe.make_get_request(f"https://brasilapi.com.br/api/cep/v1/{digits}")
        if response.get("erro") is True or response.get("message"):
            return None
        return response
    except Exception:
        return None

def fetch_cep_data_v2(digits):
    try:
        response = frappe.make_get_request(f"https://brasilapi.com.br/api/cep/v2/{digits}")
        if response.get("erro") is True or response.get("message"):
            return None
        return response
    except Exception:
        return None

@frappe.whitelist(allow_guest=True)
def check_cep(cep: str):
    """
    Checks and returns CEP (Brazilian postal code) data.
    """
    digits = ''.join([c for c in (cep or "") if c.isdigit()])
    if len(digits) != 8:
        frappe.throw("CEP must have 8 digits.")
    data = fetch_cep_data_v1(digits)
    if not data:
        data = fetch_cep_data_v2(digits)
    if not data:
        frappe.throw("CEP not found or invalid.")
    return data


###############################################################
# check_cnpj
###############################################################
# Example call via URL: https://erp.growatt.app/api/method/check_cnpj?cnpj=12345678000195
# Example call via JS:
# frappe.call({ method: "check_cnpj", args: { cnpj: "12345678000195" } }).then(r => console.log(r.message));

def fetch_cnpj_data_v1(digits):
    try:
        response = frappe.make_get_request(f"https://brasilapi.com.br/api/cnpj/v1/{digits}")
        if response.get("message") or response.get("status") == 404:
            return None
        cnpj = ''.join([c for c in response.get("cnpj", "") if c.isdigit()])
        if not cnpj or cnpj != digits:
            return None
        return response
    except Exception:
        return None

@frappe.whitelist(allow_guest=True)
def check_cnpj(cnpj: str):
    """
    Checks and returns CNPJ (Brazilian company registry) data.
    """
    digits = ''.join([c for c in (cnpj or "") if c.isdigit()])
    if len(digits) != 14:
        frappe.throw("CNPJ must have 14 digits.")
    data = fetch_cnpj_data_v1(digits)
    if not data:
        frappe.throw("CNPJ not found or invalid.")
    return data


###############################################################
# check_ibge
###############################################################
# Example call via URL: https://erp.growatt.app/api/method/check_ibge?uf=SP
# Example call via JS:
# frappe.call({ method: "check_ibge", args: { uf: "SP" } }).then(r => console.log(r.message));

def fetch_ibge_data(uf):
    try:
        response = frappe.make_get_request(
            f"https://brasilapi.com.br/api/ibge/municipios/v1/{uf}?providers=dados-abertos-br,gov,wikipedia"
        )
        if not response or (isinstance(response, dict) and response.get("message")):
            return None
        return response
    except Exception:
        return None

@frappe.whitelist(allow_guest=True)
def check_ibge(uf: str):
    """
    Checks and returns IBGE city data for a given state code (UF).
    """
    uf_code = (uf or "").strip().upper()
    if len(uf_code) != 2:
        frappe.throw("UF code must have 2 characters.")
    data = fetch_ibge_data(uf_code)
    if not data:
        frappe.throw("UF code not found or invalid.")
    return data



###############################################################
# create_stock_entry
###############################################################
@frappe.whitelist()
def create_stock_entry(items, company, stock_entry_type):
    """
    Creates, saves, and submits a Stock Entry.
    Args:
        items (list): List of dicts with item_code, qty, source_warehouse, target_warehouse.
        company (str): Company name.
        stock_entry_type (str): Stock Entry type.
    Returns:
        str: Name of the created Stock Entry.
    """
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            frappe.throw(f"Invalid format for 'items'. Expected JSON array, received: {items}")
    if not items or not isinstance(items, list):
        frappe.throw(f"Expected 'items' to be a list of dictionaries, but got: {items}")
    if not company or not stock_entry_type:
        frappe.throw("Company and Stock Entry Type are required parameters.")
    try:
        stock_entry = frappe.get_doc({
            "doctype": "Stock Entry",
            "company": company,
            "stock_entry_type": stock_entry_type,
            "items": items
        })
        stock_entry.insert()
        stock_entry.submit()
        return stock_entry.name
    except Exception as e:
        frappe.log_error(message=str(e), title="Error in Stock Entry Creation")
        frappe.throw("An unexpected error occurred while creating the Stock Entry.")



# API server script

###############################################################
# create_document
###############################################################
@frappe.whitelist()
def create_document(doc_type, data):
    """
    Creates a new document of any type.
    Args:
        doc_type (str): Document type.
        data (dict or str): Document data.
    Returns:
        dict: status, doc_name, msg
    """
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            frappe.throw("Invalid data format. Must be dict or JSON string.")
    if not data:
        frappe.throw("No data received in the request")
    try:
        doc = frappe.new_doc(doc_type)
        for key, value in data.items():
            try:
                doc.set(key, value)
            except Exception as e:
                frappe.log_error(message=str(e), title="Document Creation Error")
        doc.flags.ignore_mandatory = True
        doc.insert()
        frappe.db.commit()
        return {
            "status": "success",
            "doc_name": doc.name,
            "msg": "Document created successfully"
        }
    except Exception as e:
        frappe.log_error(str(e), "Document Creation Error")
        frappe.throw(f"Error creating document: {str(e)}")


###############################################################
# update_workflow_state
###############################################################
# @frappe.whitelist(allow_guest=True)
# def update_workflow_state(doctype, docname, workflow_state, ignore_workflow_validation=False):
#     """
#     Updates the workflow state of a document.
#     Args:
#         doctype (str): Document type.
#         docname (str): Document name.
#         workflow_state (str): New workflow state.
#         ignore_workflow_validation (bool): Ignore workflow validation.
#     Returns:
#         dict: Updated document.
#     """
#     if isinstance(ignore_workflow_validation, str):
#         ignore_workflow_validation = ignore_workflow_validation.lower() in ["true", "1", "yes"]
#     if not doctype or not isinstance(doctype, str):
#         frappe.throw("The 'doctype' parameter is required and must be a string.")
#     if not docname or not isinstance(docname, str):
#         frappe.throw("The 'docname' parameter is required and must be a string.")
#     if not workflow_state or not isinstance(workflow_state, str):
#         frappe.throw("The 'workflow_state' parameter is required and must be a string.")
#     if not isinstance(ignore_workflow_validation, bool):
#         frappe.throw("The 'ignore_workflow_validation' parameter must be a boolean.")
#     try:
#         if ignore_workflow_validation:
#             prev_doc = frappe.get_doc(doctype, docname)
#             try:
#                 prev_workflow_state = prev_doc.workflow_state
#             except Exception:
#                 prev_workflow_state = None
#             frappe.db.set_value(doctype, docname, "workflow_state", workflow_state)
#             frappe.db.commit()
#             version_doc = frappe.get_doc({
#                 "doctype": "Version",
#                 "ref_doctype": doctype,
#                 "docname": docname,
#                 "owner": frappe.session.user,
#                 "creation": frappe.utils.now_datetime(),
#                 "data": json.dumps({
#                     "changed": [["workflow_state", prev_workflow_state, workflow_state]]
#                 })
#             })
#             version_doc.insert(ignore_permissions=True)
#         else:
#             doc = frappe.get_doc(doctype, docname)
#             doc.workflow_state = workflow_state
#             doc.save()
#             frappe.db.commit()
#         updated_doc = frappe.get_doc(doctype, docname)
#         return updated_doc.as_dict()
#     except Exception as e:
#         frappe.log_error(message=str(e), title="Error in Workflow State Update")
#         frappe.throw(f"An error occurred while updating the workflow state: {e}")

@frappe.whitelist(allow_guest=True)
def update_workflow_state(doctype, docname, workflow_state, ignore_workflow_validation=False):
    """
    Updates the workflow state of a document.
    If ignore_workflow_validation = True, it FORCES the state and bypasses workflow rules.
    """

    # Normaliza boolean vindo via API
    if isinstance(ignore_workflow_validation, str):
        ignore_workflow_validation = ignore_workflow_validation.lower() in ["true", "1", "yes"]

    if not doctype or not isinstance(doctype, str):
        frappe.throw("The 'doctype' parameter is required and must be a string.")

    if not docname or not isinstance(docname, str):
        frappe.throw("The 'docname' parameter is required and must be a string.")

    if not workflow_state or not isinstance(workflow_state, str):
        frappe.throw("The 'workflow_state' parameter is required and must be a string.")

    if not isinstance(ignore_workflow_validation, bool):
        frappe.throw("The 'ignore_workflow_validation' parameter must be a boolean.")

    try:
        doc = frappe.get_doc(doctype, docname)

        old_state = doc.workflow_state

        # ===============================
        # 🔥 FORÇAR ESTADO (sem workflow)
        # ===============================
        if ignore_workflow_validation:

            # muda direto no banco
            frappe.db.set_value(doctype, docname, "workflow_state", workflow_state)

            # registra versão (auditoria oficial do Frappe)
            version = frappe.new_doc("Version")
            version.ref_doctype = doctype
            version.docname = docname
            version.data = json.dumps({
                "changed": [
                    ["workflow_state", old_state, workflow_state]
                ],
                "comment": f"FORCED by {frappe.session.user}"
            })
            version.insert(ignore_permissions=True)

        # ===============================
        # ✅ NORMAL (respeitando workflow)
        # ===============================
        else:
            doc.workflow_state = workflow_state
            doc.save()

        frappe.db.commit()

        updated_doc = frappe.get_doc(doctype, docname)

        return {
            "status": "success",
            "doctype": doctype,
            "docname": docname,
            "old_state": old_state,
            "new_state": workflow_state,
            "forced": ignore_workflow_validation
        }

    except Exception as e:
        frappe.log_error(message=str(e), title="Error in Workflow State Update")
        frappe.throw(f"An error occurred while updating the workflow state: {str(e)}")


###############################################################
# validate_child_row_deletion
###############################################################
@frappe.whitelist(allow_guest=True)
def validate_child_row_deletion(doctype, docname, child_table_field):
    """
    Checks if there was an attempt to delete already saved rows in a child table of a document.
    Returns True if allowed, raises error if not.
    """
    # If the document is new, allow everything
    if not docname or docname.startswith("new-"):
        return True
    try:
        # Get the current document from the database (saved state)
        current_doc = frappe.get_doc(doctype, docname)
        # Get the document being validated (with changes)
        # This needs to be passed as a parameter or obtained from context
        doc_being_saved = frappe.local.form_dict.get('doc') or frappe.get_doc(doctype, docname)
        # If unable to get the previous document, allow
        if not current_doc:
            return True
        # Get rows from the current (saved) state
        old_rows = {d.name for d in getattr(current_doc, child_table_field, []) if d.name}
        # Get rows from the document being saved
        new_rows = {d.name for d in getattr(doc_being_saved, child_table_field, []) if d.name and not d.get("__islocal")}
        # Find deleted rows
        deleted_rows = old_rows - new_rows
        if deleted_rows:
            frappe.throw(
                f"You cannot delete already saved rows from the table '{child_table_field}'. "
                f"Removed rows: {', '.join(deleted_rows)}. "
                "Only new rows can be removed."
            )
        return True
    except Exception as e:
        frappe.log_error(f"Error validating child row deletion: {str(e)}")
        # If there is a validation error, allow saving to avoid blocking the system
        return True


###############################################################
# validate_child_row_deletion_in_doc
###############################################################
def validate_child_row_deletion_in_doc(doc, child_table_field):
    """
    Version that receives the document directly (to use in DocType validate).
    """
    # If the document is new, allow everything
    if doc.get("__islocal") or not doc.name:
        return True
    try:
        # Get the current document from the database (saved state)
        old_doc = frappe.get_doc(doc.doctype, doc.name)
        # Get rows from the current (saved) state
        old_rows = {d.name for d in getattr(old_doc, child_table_field, []) if d.name}
        # Get rows from the document being saved
        new_rows = {d.name for d in getattr(doc, child_table_field, []) if d.name and not d.get("__islocal")}
        # Find deleted rows
        deleted_rows = old_rows - new_rows
        if deleted_rows:
            frappe.throw(
                f"You cannot delete already saved rows from the table '{child_table_field}'. "
                f"Removed rows: {', '.join(deleted_rows)}. "
                "Only new rows can be removed."
            )
        return True
    except frappe.DoesNotExistError:
        # Document does not exist yet, it's new
        return True
    except Exception as e:
        frappe.log_error(f"Error validating child row deletion: {str(e)}")
        # If there is a validation error, allow saving to avoid blocking the system
        return True