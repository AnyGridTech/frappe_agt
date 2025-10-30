frappe.provide('agt.utils.brazil.cpf');
agt.utils.brazil.cpf.regex = /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/;
agt.utils.brazil.cpf.validate = function (frm, cpf_field) {
    let cpf = frm.doc[cpf_field] || '';
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11) {
        frappe.msgprint(__('CPF must have 11 digits.'));
        frm.set_value(cpf_field, '');
        return;
    }
    if (agt.utils.brazil.cpf.regex.test(cpf)) {
        frappe.msgprint(__('Invalid CPF number.'));
        frm.set_value(cpf_field, '');
        return;
    }
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
        frappe.msgprint(__('Invalid CPF number.'));
        frm.set_value(cpf_field, '');
        return;
    }
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11)
        remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
        frappe.msgprint(__('Invalid CPF number.'));
        frm.set_value(cpf_field, '');
        return;
    }
    agt.utils.brazil.cpf.format(frm, cpf_field);
};
agt.utils.brazil.cpf.format = function (frm, cpf_field) {
    let cpf = frm.doc[cpf_field] || '';
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length === 11) {
        frm.set_value(cpf_field, cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'));
    }
};
