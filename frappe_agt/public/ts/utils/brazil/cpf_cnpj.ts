import type { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

frappe.provide('agt.utils.brazil');

/**
 * Sets up document ID validation and formatting on a form.
 * Handles both CPF and CNPJ validation depending on the type field.
 * @param frm - The Frappe form instance
 * @param field - The field name containing the document ID
 * @param documentType - The field name containing the document type (CPF/CNPJ)
 */
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

/**
 * Formats a Brazilian document ID (CPF/CNPJ) on a form.
 * @param frm - The Frappe form instance
 * @param field - The field name containing the document ID
 * @param documentType - The type of document ('cpf' or 'cnpj')
 */
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