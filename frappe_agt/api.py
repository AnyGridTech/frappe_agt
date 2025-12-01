
import frappe
import json
import requests
import frappe.utils
from frappe import _
from typing import Any, Dict, List, Optional, Union

###############################################################
# debug_list
###############################################################

@frappe.whitelist(allow_guest=True)
def debug_list() -> Dict[str, Any]:
    """
    Debug helper: retorna o arquivo do módulo e presença de update_workflow_state.
    """
    try:
        attrs = sorted([k for k in globals().keys() if isinstance(k, str)])
        return {
            "module_file": __file__,
            "has_update_workflow_state": "update_workflow_state" in globals(),
            "attrs": [a for a in attrs if 'update' in a.lower() or 'workflow' in a.lower()][:50]
        }
    except Exception as e:
        frappe.log_error(title="Debug List Error", message=str(e))
        return {"error": str(e)}

###############################################################
# get_growatt_sn_info
###############################################################

@frappe.whitelist(allow_guest=True)
def get_growatt_sn_info(deviceSN: str) -> Dict[str, Any]:
    """
    Consulta informações de um SN Growatt na API pública.
    Args:
        deviceSN (str): Serial Number do dispositivo.
    Returns:
        dict: Dados retornados pela API Growatt.
    """
    if not deviceSN:
        frappe.throw(_("O parâmetro deviceSN é obrigatório."))
    try:
        url = "https://br.growatt.com/support/locate"
        payload = {"deviceSN": deviceSN}
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        frappe.log_error(title="Growatt SN Info Error", message=str(e))
        frappe.throw(_("Erro ao consultar SN Growatt: {0}").format(str(e)))

###############################################################
# import_movidesk_and_create_entries
###############################################################
@frappe.whitelist(allow_guest=True)
def import_movidesk_and_create_entries(
    auth_token: str,
    company: str = "AnyGrid",
    warehouse: str = "[AW] Waiting at Customer Site - ANY",
    stock_entry_type: str = "Material Receipt"
) -> Dict[str, Any]:
    """
    Importa dados do Movidesk e cria Serial No e Stock Entry para cada item retornado.
    Args:
        auth_token (str): Token de autorização Movidesk.
        company (str): Nome da empresa.
        warehouse (str): Nome do depósito.
        stock_entry_type (str): Tipo de Stock Entry.
    Returns:
        dict: status e lista de criados.
    """
    if not auth_token:
        frappe.throw(_("O parâmetro auth_token é obrigatório."))
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
            # Cria Serial No se não existir
            if not frappe.db.exists('Serial No', serial_no):
                try:
                    serial_doc = frappe.get_doc({
                        "doctype": "Serial No",
                        "serial_no": serial_no,
                        "item_code": item_code,
                        "company": company
                    })
                    serial_doc.insert()
                except Exception as e:
                    frappe.log_error(title="Movidesk Serial No Error", message=str(e))
            # Cria Stock Entry
            try:
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
            except Exception as e:
                frappe.log_error(title="Movidesk Stock Entry Error", message=str(e))
        return {"status": "success", "created": results}
    except Exception as e:
        frappe.log_error(title="Movidesk Import Error", message=str(e))
        frappe.throw(_("Erro ao importar e criar entradas: {0}").format(str(e)))

###############################################################
# backend_get_all
###############################################################
@frappe.whitelist()
def backend_get_all(doctype_name: str, fields: Optional[List[str]] = None, filters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Busca registros de um doctype com filtros e campos customizados.
    Args:
        doctype_name (str): Nome do DocType.
        fields (list): Lista de campos a retornar.
        filters (dict): Filtros para a busca.
    Returns:
        dict: status e dados encontrados.
    """
    if not doctype_name:
        frappe.throw(_("O parâmetro doctype_name é obrigatório."))
    try:
        fields = fields or []
        filters = filters or {}
        doctypes = frappe.get_all(doctype_name, filters=filters, fields=fields)
        return {"status": "success", "data": doctypes}
    except Exception as e:
        frappe.log_error(title="Get Doctypes Error", message=str(e))
        frappe.throw(_("Erro ao buscar registros: {0}").format(str(e)))
        

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
def check_cep(cep: str) -> Dict[str, Any]:
    """
    Consulta e retorna dados de um CEP (código postal brasileiro).
    Args:
        cep (str): CEP a consultar.
    Returns:
        dict: Dados do CEP.
    """
    digits = ''.join([c for c in (cep or "") if c.isdigit()])
    if len(digits) != 8:
        frappe.throw(_("O CEP deve conter 8 dígitos."))
    data = fetch_cep_data_v1(digits)
    if not data:
        data = fetch_cep_data_v2(digits)
    if not data:
        frappe.throw(_("CEP não encontrado ou inválido."))
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
def check_cnpj(cnpj: str) -> Dict[str, Any]:
    """
    Consulta e retorna dados de um CNPJ (cadastro nacional de pessoa jurídica).
    Args:
        cnpj (str): CNPJ a consultar.
    Returns:
        dict: Dados do CNPJ.
    """
    digits = ''.join([c for c in (cnpj or "") if c.isdigit()])
    if len(digits) != 14:
        frappe.throw(_("O CNPJ deve conter 14 dígitos."))
    data = fetch_cnpj_data_v1(digits)
    if not data:
        frappe.throw(_("CNPJ não encontrado ou inválido."))
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
def check_ibge(uf: str) -> Any:
    """
    Consulta e retorna dados de municípios IBGE para um UF.
    Args:
        uf (str): Código UF (estado).
    Returns:
        list: Lista de municípios.
    """
    uf_code = (uf or "").strip().upper()
    if len(uf_code) != 2:
        frappe.throw(_("O código UF deve ter 2 caracteres."))
    data = fetch_ibge_data(uf_code)
    if not data:
        frappe.throw(_("UF não encontrado ou inválido."))
    return data



###############################################################
# create_stock_entry
###############################################################
@frappe.whitelist()
def create_stock_entry(
    items: Union[str, List[Dict[str, Any]]],
    company: str,
    stock_entry_type: str
) -> str:
    """
    Cria, salva e submete um Stock Entry.
    Args:
        items (list|str): Lista de dicts com item_code, qty, source_warehouse, target_warehouse.
        company (str): Nome da empresa.
        stock_entry_type (str): Tipo do Stock Entry.
    Returns:
        str: Nome do Stock Entry criado.
    """
    if isinstance(items, str):
        try:
            items = json.loads(items)
        except Exception:
            frappe.throw(_("Formato inválido para 'items'. Esperado JSON array, recebido: {0}").format(items))
    if not items or not isinstance(items, list):
        frappe.throw(_("Esperado 'items' como lista de dicionários, recebido: {0}").format(items))
    if not company or not stock_entry_type:
        frappe.throw(_("Os parâmetros Company e Stock Entry Type são obrigatórios."))
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
        frappe.throw(_("Ocorreu um erro ao criar o Stock Entry."))



# API server script

###############################################################
# create_document
###############################################################
@frappe.whitelist()
def create_document(doc_type: str, data: Union[Dict[str, Any], str]) -> Dict[str, Any]:
    """
    Cria um novo documento de qualquer tipo.
    Args:
        doc_type (str): Tipo do documento.
        data (dict|str): Dados do documento.
    Returns:
        dict: status, doc_name, msg
    """
    if not doc_type:
        frappe.throw(_("O parâmetro doc_type é obrigatório."))
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except Exception:
            frappe.throw(_("Formato inválido para os dados. Deve ser dict ou string JSON."))
    if not data:
        frappe.throw(_("Nenhum dado recebido na requisição."))
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
            "msg": _("Documento criado com sucesso")
        }
    except Exception as e:
        frappe.log_error(str(e), "Document Creation Error")
        frappe.throw(_("Erro ao criar documento: {0}").format(str(e)))


###############################################################
# update_workflow_state
###############################################################
@frappe.whitelist(allow_guest=True)
def update_workflow_state(
    doctype: str,
    docname: str,
    workflow_state: str,
    ignore_workflow_validation: Union[bool, str] = False
) -> Dict[str, Any]:
    """
    Atualiza o estado do workflow de um documento.
    Args:
        doctype (str): Tipo do documento.
        docname (str): Nome do documento.
        workflow_state (str): Novo estado do workflow.
        ignore_workflow_validation (bool): Ignorar validação de workflow.
    Returns:
        dict: Documento atualizado.
    """
    if isinstance(ignore_workflow_validation, str):
        ignore_workflow_validation = ignore_workflow_validation.lower() in ["true", "1", "yes"]
    if not doctype or not isinstance(doctype, str):
        frappe.throw(_("O parâmetro 'doctype' é obrigatório e deve ser string."))
    if not docname or not isinstance(docname, str):
        frappe.throw(_("O parâmetro 'docname' é obrigatório e deve ser string."))
    if not workflow_state or not isinstance(workflow_state, str):
        frappe.throw(_("O parâmetro 'workflow_state' é obrigatório e deve ser string."))
    if not isinstance(ignore_workflow_validation, bool):
        frappe.throw(_("O parâmetro 'ignore_workflow_validation' deve ser boolean."))
    try:
        if ignore_workflow_validation:
            prev_doc = frappe.get_doc(doctype, docname)
            try:
                prev_workflow_state = prev_doc.workflow_state
            except Exception:
                prev_workflow_state = None
            frappe.db.set_value(doctype, docname, "workflow_state", workflow_state)
            frappe.db.commit()
            version_doc = frappe.get_doc({
                "doctype": "Version",
                "ref_doctype": doctype,
                "docname": docname,
                "owner": frappe.session.user,
                "creation": frappe.utils.now_datetime(),
                "data": json.dumps({
                    "changed": [["workflow_state", prev_workflow_state, workflow_state]]
                })
            })
            version_doc.insert(ignore_permissions=True)
        else:
            doc = frappe.get_doc(doctype, docname)
            doc.workflow_state = workflow_state
            doc.save()
            frappe.db.commit()
        updated_doc = frappe.get_doc(doctype, docname)
        return updated_doc.as_dict()
    except Exception as e:
        frappe.log_error(message=str(e), title="Error in Workflow State Update")
        frappe.throw(_("Erro ao atualizar o estado do workflow: {0}").format(e))

###############################################################
# validate_child_row_deletion
###############################################################
@frappe.whitelist(allow_guest=True)
def validate_child_row_deletion(doctype: str, docname: str, child_table_field: str) -> bool:
    """
    Verifica se houve tentativa de deletar linhas já salvas em uma tabela filha de um documento.
    Args:
        doctype (str): Tipo do documento.
        docname (str): Nome do documento.
        child_table_field (str): Campo da tabela filha.
    Returns:
        bool: True se permitido, lança erro se não.
    """
    if not docname or docname.startswith("new-"):
        return True
    try:
        current_doc = frappe.get_doc(doctype, docname)
        doc_being_saved = frappe.local.form_dict.get('doc') or frappe.get_doc(doctype, docname)
        if not current_doc:
            return True
        old_rows = {d.name for d in getattr(current_doc, child_table_field, []) if d.name}
        new_rows = {d.name for d in getattr(doc_being_saved, child_table_field, []) if d.name and not d.get("__islocal")}
        deleted_rows = old_rows - new_rows
        if deleted_rows:
            frappe.throw(_(
                "Não é permitido remover linhas já salvas da tabela '{0}'. Removidas: {1}. Apenas novas linhas podem ser removidas."
            ).format(child_table_field, ', '.join(deleted_rows)))
        return True
    except Exception as e:
        frappe.log_error(f"Erro ao validar deleção de linha filha: {str(e)}")
        return True


###############################################################
# validate_child_row_deletion_in_doc
###############################################################
def validate_child_row_deletion_in_doc(doc: Any, child_table_field: str) -> bool:
    """
    Versão que recebe o documento diretamente (para usar no validate do DocType).
    Args:
        doc (Document): Documento a ser validado.
        child_table_field (str): Campo da tabela filha.
    Returns:
        bool: True se permitido, lança erro se não.
    """
    if doc.get("__islocal") or not doc.name:
        return True
    try:
        old_doc = frappe.get_doc(doc.doctype, doc.name)
        old_rows = {d.name for d in getattr(old_doc, child_table_field, []) if d.name}
        new_rows = {d.name for d in getattr(doc, child_table_field, []) if d.name and not d.get("__islocal")}
        deleted_rows = old_rows - new_rows
        if deleted_rows:
            frappe.throw(_(
                "Não é permitido remover linhas já salvas da tabela '{0}'. Removidas: {1}. Apenas novas linhas podem ser removidas."
            ).format(child_table_field, ', '.join(deleted_rows)))
        return True
    except frappe.DoesNotExistError:
        return True
    except Exception as e:
        frappe.log_error(f"Erro ao validar deleção de linha filha: {str(e)}")
        return True