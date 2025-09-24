"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
frappe.provide('agt.utils.brazil.cnpj');
agt.utils.brazil.cnpj.regex = /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/;
agt.utils.brazil.cnpj.validate = function (frm, cnpj_field) {
    let cnpj = frm.doc[cnpj_field] || '';
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) {
        frappe.msgprint(__('CNPJ must have 14 digits.'));
        frm.set_value(cnpj_field, '');
        return;
    }
    if (agt.utils.brazil.cnpj.regex.test(cnpj)) {
        frappe.msgprint(__('Invalid CNPJ number.'));
        frm.set_value(cnpj_field, '');
        return;
    }
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2)
            pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) {
        frappe.msgprint(__('Invalid CNPJ number.'));
        frm.set_value(cnpj_field, '');
        return;
    }
    length += 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2)
            pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) {
        frappe.msgprint(__('Invalid CNPJ number.'));
        frm.set_value(cnpj_field, '');
        return;
    }
    agt.utils.brazil.cnpj.format(frm, cnpj_field);
};
agt.utils.brazil.cnpj.format = function (frm, cnpj_field) {
    let cnpj = frm.doc[cnpj_field] || '';
    cnpj = cnpj.replace(/\D/g, '');
    if (cnpj.length === 14) {
        frm.set_value(cnpj_field, cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'));
    }
};
//# sourceMappingURL=cnpj.js.map