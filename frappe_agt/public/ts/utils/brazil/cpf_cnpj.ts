import type { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

frappe.provide('agt.utils.brazil');

agt.utils.brazil.validate_cnpj_or_cpf = function(frm: FrappeForm, field: string, documentType: 'cpf' | 'cnpj'): void {
  if (documentType === 'cpf') {
    agt.utils.brazil.cpf.validate(frm, field);
  } else if (documentType === 'cnpj') {
    agt.utils.brazil.cnpj.validate(frm, field);
  } else {
    // Auto-detect based on length
    let value = frm.doc[field] || '';
    value = value.replace(/\D/g, '');

    if (value.length === 11) {
      agt.utils.brazil.cpf.validate(frm, field);
    } else if (value.length === 14) {
      agt.utils.brazil.cnpj.validate(frm, field);
    }
  }
};

agt.utils.brazil.format_cnpj_or_cpf = function(frm: FrappeForm, field: string, documentType: 'cpf' | 'cnpj'): void {
  if (documentType === 'cpf') {
    agt.utils.brazil.cpf.format(frm, field);
  } else if (documentType === 'cnpj') {
    agt.utils.brazil.cnpj.format(frm, field);
  } else {
    // Auto-detect based on length
    let value = frm.doc[field] || '';
    value = value.replace(/\D/g, '');

    if (value.length === 11) {
      agt.utils.brazil.cpf.format(frm, field);
    } else if (value.length === 14) {
      agt.utils.brazil.cnpj.format(frm, field);
    }
  }
};