frappe.provide('frappe_agt.utils.brazil')

agt.utils.brazil.format_cnpj_or_cpf = function(frm, field, documentType) {
  if (documentType === 'cpf') {
    agt.utils.brazil.cpf.format(frm, field);
  } else if (documentType === 'cnpj') {
    agt.utils.brazil.cnpj.format(frm, field);
  }
  // If not sure, format based on length

  let value = frm.doc[field] || '';
  value = value.replace(/\D/g, '');

  if (value.length === 11) {
    agt.utils.brazil.cpf.format(frm, field);
  } else if (value.length === 14) {
    agt.utils.brazil.cnpj.format(frm, field);
  }
}