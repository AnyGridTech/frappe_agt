"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cnpj.ts
  frappe.provide("agt.utils.brazil.cnpj");
  agt.utils.brazil.cnpj.regex = /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/;
  agt.utils.brazil.cnpj.validate = function(frm, cnpj_field) {
    let cnpj = frm.doc[cnpj_field] || "";
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      frappe.msgprint(__("CNPJ must have 14 digits."));
      frm.set_value(cnpj_field, "");
      return;
    }
    if (agt.utils.brazil.cnpj.regex.test(cnpj)) {
      frappe.msgprint(__("Invalid CNPJ number."));
      frm.set_value(cnpj_field, "");
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
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) {
      frappe.msgprint(__("Invalid CNPJ number."));
      frm.set_value(cnpj_field, "");
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
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) {
      frappe.msgprint(__("Invalid CNPJ number."));
      frm.set_value(cnpj_field, "");
      return;
    }
    agt.utils.brazil.cnpj.format(frm, cnpj_field);
  };
  agt.utils.brazil.cnpj.format = function(frm, cnpj_field) {
    let cnpj = frm.doc[cnpj_field] || "";
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length === 14) {
      frm.set_value(cnpj_field, cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"));
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cpf.ts
  frappe.provide("agt.utils.brazil.cpf");
  agt.utils.brazil.cpf.regex = /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/;
  agt.utils.brazil.cpf.validate = function(frm, cpf_field) {
    let cpf = frm.doc[cpf_field] || "";
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) {
      frappe.msgprint(__("CPF must have 11 digits."));
      frm.set_value(cpf_field, "");
      return;
    }
    if (agt.utils.brazil.cpf.regex.test(cpf)) {
      frappe.msgprint(__("Invalid CPF number."));
      frm.set_value(cpf_field, "");
      return;
    }
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = sum * 10 % 11;
    if (remainder === 10 || remainder === 11)
      remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
      frappe.msgprint(__("Invalid CPF number."));
      frm.set_value(cpf_field, "");
      return;
    }
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = sum * 10 % 11;
    if (remainder === 10 || remainder === 11)
      remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
      frappe.msgprint(__("Invalid CPF number."));
      frm.set_value(cpf_field, "");
      return;
    }
    agt.utils.brazil.cpf.format(frm, cpf_field);
  };
  agt.utils.brazil.cpf.format = function(frm, cpf_field) {
    let cpf = frm.doc[cpf_field] || "";
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length === 11) {
      frm.set_value(cpf_field, cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cpf_cnpj.ts
  frappe.provide("frappe_agt.utils.brazil");
  agt.utils.brazil.format_cnpj_or_cpf = function(frm, field, documentType) {
    if (documentType === "cpf") {
      agt.utils.brazil.cpf.format(frm, field);
    } else if (documentType === "cnpj") {
      agt.utils.brazil.cnpj.format(frm, field);
    }
    let value = frm.doc[field] || "";
    value = value.replace(/\D/g, "");
    if (value.length === 11) {
      agt.utils.brazil.cpf.format(frm, field);
    } else if (value.length === 14) {
      agt.utils.brazil.cnpj.format(frm, field);
    }
  };
  agt.utils.brazil.validate_cnpj_or_cpf = function(frm, field, documentType) {
    if (documentType === "cpf") {
      agt.utils.brazil.cpf.validate(frm, field);
    } else if (documentType === "cnpj") {
      agt.utils.brazil.cnpj.validate(frm, field);
    }
    let value = frm.doc[field] || "";
    value = value.replace(/\D/g, "");
    if (value.length === 11) {
      agt.utils.brazil.cpf.validate(frm, field);
    } else if (value.length === 14) {
      agt.utils.brazil.cnpj.validate(frm, field);
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/db/index.ts
  frappe.provide("agt.db");
  agt.db.filter_join = async function(steps) {
    let results = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step)
        continue;
      const filters = __spreadValues({}, step.filters);
      if (i > 0 && step.joinOn && results.length > 0) {
        if (!step.joinOn) {
          console.warn(`Join step ${i + 1} is missing joinOn details. Skipping join.`);
          continue;
        }
        const joinOn = step.joinOn;
        const joinValues = results.map((item) => item[joinOn.sourceField]);
        filters[joinOn.targetField] = ["in", joinValues];
      }
      if (step.joinOn && results.length === 0) {
        console.warn(`No results found for step ${i + 1}. Skipping further joins.`);
        break;
      }
      const response = await frappe.call({
        method: "backend_get_all",
        args: {
          doctype: step.doctype,
          filters,
          fields: step.fields
        }
      });
      results = response.message.data || [];
    }
    return results;
  };
})();
//# sourceMappingURL=agt.bundle.SDS3VELI.js.map
