frappe.provide('agt.utils');
agt.utils.workflow_transition = async function (form, action, callback) {
    if (!form || !form.states?.frm || !action) {
        console.error('workflow_transition: Parâmetros inválidos.');
        return;
    }
    frappe.dom.freeze();
    form.states.frm.selected_workflow_action = action;
    form.states.frm.script_manager.trigger('before_workflow_action').then(async () => {
        await frappe
            .xcall('frappe.model.workflow.apply_workflow', {
            doc: form.states.frm.doc,
            action: action
        })
            .then((doc) => {
            frappe.model.sync(doc);
            form.states.frm.refresh();
            form.states.frm.selected_workflow_action = null;
            form.states.frm.script_manager.trigger('after_workflow_action');
        })
            .finally(async () => {
            frappe.dom.unfreeze();
            callback && (await callback(form));
        });
    });
};
agt.utils.update_workflow_state = async function (params) {
    const { doctype, docname, workflow_state, ignore_workflow_validation, callback } = params;
    return await frappe
        .call({
        method: 'update_workflow_state',
        args: { doctype, docname, workflow_state, ignore_workflow_validation }
    })
        .then(async () => {
        return await agt.utils.refresh_force().then(async (doc) => {
            callback && (await callback());
            return doc;
        });
    });
};
agt.utils.refresh_force = async function () {
    if (!cur_frm?.doc?.doctype || !cur_frm?.doc?.name) {
        console.error('refresh_force: cur_frm ou documento inválido');
        return undefined;
    }
    frappe.model.clear_doc(cur_frm.doc.doctype, cur_frm.doc.name);
    return await agt.utils.doc.get_doc(cur_frm.doc.doctype, cur_frm.doc.name)
        .then((doc) => {
        if (cur_frm?.states?.frm?.refresh) {
            cur_frm.states.frm.refresh();
        }
        return doc;
    })
        .catch((error) => {
        console.error('Error refreshing document:', error);
        return undefined;
    });
};
agt.utils.validate_cpf_regex = function (cpf) {
    if (!cpf || typeof cpf !== 'string')
        return false;
    cpf = cpf.trim();
    return /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/.test(cpf);
};
agt.utils.validate_cnpj_regex = function (cnpj) {
    if (!cnpj || typeof cnpj !== 'string')
        return false;
    cnpj = cnpj.trim();
    return /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/.test(cnpj);
};
agt.utils.validate_cpf = function (cpf) {
    const d = (cpf || '').replace(/\D/g, '');
    if (d.length !== 11 || /^(\d)\1+$/.test(d))
        return false;
    let sum = 0;
    for (let i = 0; i < 9; i++)
        sum += +(d[i] || 0) * (10 - i);
    let check = (sum * 10) % 11;
    if (check === 10)
        check = 0;
    if (check !== +(d[9] || 0))
        return false;
    sum = 0;
    for (let i = 0; i < 10; i++)
        sum += +(d[i] || 0) * (11 - i);
    check = (sum * 10) % 11;
    if (check === 10)
        check = 0;
    return check === +(d[10] || 0);
};
agt.utils.validate_cnpj = function (cnpj) {
    const d = (cnpj || '').replace(/\D/g, '');
    if (d.length !== 14 || /^(\d)\1+$/.test(d))
        return false;
    const calc = (base, weights) => base.split('').reduce((sum, n, i) => sum + +(n || 0) * (weights[i] || 0), 0);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, ...w1];
    let check = calc(d.slice(0, 12), w1) % 11;
    let digit = check < 2 ? 0 : 11 - check;
    if (digit !== +(d[12] || 0))
        return false;
    check = calc(d.slice(0, 13), w2) % 11;
    digit = check < 2 ? 0 : 11 - check;
    return digit === +(d[13] || 0);
};
agt.utils.validate_cnpj_existence = async function (cnpj) {
    if (!cnpj || typeof cnpj !== 'string')
        return false;
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14)
        return false;
    try {
        const response = await frappe.call({
            method: 'check_cnpj',
            args: { cnpj: digits }
        });
        const data = response?.message;
        return !!data && !!data.cnpj && data.cnpj.replace(/\D/g, '') === digits;
    }
    catch (error) {
        console.error('Erro ao validar CNPJ:', error);
        return false;
    }
};
agt.utils.format_doc = function (doc, type) {
    let digits = (doc || '').replace(/\D/g, '');
    const formatCpf = (d) => {
        let formatted = d.slice(0, 11);
        if (formatted.length > 3)
            formatted = formatted.replace(/^(\d{3})(\d)/, '$1.$2');
        if (formatted.length > 6)
            formatted = formatted.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
        if (formatted.length > 9)
            formatted = formatted.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
        return formatted;
    };
    const formatCnpj = (d) => {
        let formatted = d.slice(0, 14);
        if (formatted.length > 2)
            formatted = formatted.replace(/^(\d{2})(\d)/, '$1.$2');
        if (formatted.length > 5)
            formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
        if (formatted.length > 8)
            formatted = formatted.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4');
        if (formatted.length > 12)
            formatted = formatted.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
        return formatted;
    };
    if (type === 'Pessoa Física') {
        return formatCpf(digits);
    }
    if (type === 'Pessoa Jurídica') {
        return formatCnpj(digits);
    }
    return digits.length < 12 ? formatCpf(digits) : formatCnpj(digits);
};
agt.utils.document_id = async function (frm, docField, typeField) {
    const field = frm.fields_dict[docField];
    if (!field?.$input) {
        console.error(`document_id: O campo '${docField}' não foi encontrado ou não é um campo de entrada válido.`);
        return;
    }
    const $input = field.$input;
    const setVisualStyle = (status) => {
        let icon = '';
        switch (status) {
            case 'warning':
                icon = '<i class="fa fa-exclamation-circle" style="color:#f1c40f"></i> ';
                break;
            case 'error':
                icon = '<i class="fa fa-times-circle" style="color:#e74c3c"></i> ';
                break;
            case 'success':
                icon = '<i class="fa fa-check-circle" style="color:#27ae60"></i> ';
                break;
            default:
                icon = '';
        }
        return icon;
    };
    const updateUI = (color, message) => {
        let status = 'default';
        if (color === '#f1c40f')
            status = 'warning';
        else if (color === 'red' || color === '#e74c3c')
            status = 'error';
        else if (color === 'green' || color === '#27ae60')
            status = 'success';
        const icon = setVisualStyle(status);
        field.set_description(icon + (message ? `<b style='color:${color}'>${message}</b>` : ''));
    };
    const validateAndStyle = () => {
        const value = ($input.val() || '');
        const digits = value.replace(/\D/g, '');
        const docType = typeField ? frm.doc[typeField] : null;
        if (docType && docType !== 'Pessoa Física' && docType !== 'Pessoa Jurídica') {
            frm.set_df_property(docField, 'read_only', 1);
            frm.set_df_property(docField, 'hidden', 1);
            updateUI('#f1c40f', 'Selecione o tipo de documento antes de preencher.');
            return;
        }
        else {
            frm.set_df_property(docField, 'read_only', 0);
            frm.set_df_property(docField, 'hidden', 0);
        }
        if (!digits) {
            updateUI('', '');
            return;
        }
        if (docType === 'Pessoa Física') {
            if (digits.length < 11) {
                updateUI('#f1c40f', 'CPF incompleto');
            }
            else {
                if (agt.utils.validate_cpf(digits)) {
                    updateUI('green', 'CPF válido');
                }
                else {
                    updateUI('red', 'CPF inválido. Favor corrigir.');
                }
            }
            return;
        }
        if (docType === 'Pessoa Jurídica') {
            if (digits.length < 14) {
                updateUI('#f1c40f', 'CNPJ incompleto');
            }
            else {
                if (agt.utils.validate_cnpj(digits)) {
                    updateUI('#27ae60', 'CNPJ válido sintaticamente. Verificando existência...');
                    agt.utils.validate_cnpj_existence(digits).then((exists) => {
                        if (exists) {
                            updateUI('green', 'CNPJ existe e está ativo');
                        }
                        else {
                            updateUI('red', 'CNPJ não encontrado na base nacional');
                        }
                    });
                }
                else {
                    updateUI('red', 'CNPJ inválido. Favor corrigir.');
                }
            }
            return;
        }
        if (docType === null) {
            if (digits.length < 11 || (digits.length > 11 && digits.length < 14)) {
                updateUI('#f1c40f', 'CPF ou CNPJ incompleto.');
            }
            else if (digits.length === 11) {
                if (agt.utils.validate_cpf(digits)) {
                    updateUI('green', 'CPF válido');
                }
                else {
                    updateUI('red', 'CPF ou CNPJ inválido ou incompleto');
                }
            }
            else if (digits.length >= 14) {
                const cnpDigits = digits.slice(0, 14);
                if (agt.utils.validate_cnpj(cnpDigits)) {
                    updateUI('green', 'CNPJ válido');
                }
                else {
                    updateUI('red', 'CNPJ inválido. Favor corrigir.');
                }
            }
        }
    };
    const formatOnInput = (e) => {
        const input = e.target;
        const originalValue = input.value;
        const docType = typeField ? frm.doc[typeField] : null;
        const originalPos = input.selectionStart || 0;
        const digitsBeforeCursor = (originalValue.slice(0, originalPos).replace(/\D/g, '')).length;
        let digits = originalValue.replace(/\D/g, '');
        const maxLength = docType === 'Pessoa Jurídica' ? 14 : (docType === 'Pessoa Física' ? 11 : 14);
        if (digits.length > maxLength) {
            digits = digits.slice(0, maxLength);
        }
        const formatCpf = (d) => d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
        const formatCnpj = (d) => d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4').replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
        let formattedValue = digits;
        if (docType === 'Pessoa Física') {
            formattedValue = formatCpf(digits);
        }
        else if (docType === 'Pessoa Jurídica') {
            formattedValue = formatCnpj(digits);
        }
        else {
            formattedValue = digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
        }
        if (originalValue !== formattedValue) {
            input.value = formattedValue;
            frm.doc[docField] = formattedValue;
            let newCursorPos = 0;
            let digitsCounted = 0;
            for (const char of formattedValue) {
                newCursorPos++;
                if (/\d/.test(char))
                    digitsCounted++;
                if (digitsCounted >= digitsBeforeCursor)
                    break;
            }
            while (newCursorPos < formattedValue.length && formattedValue[newCursorPos] && /\D/.test(formattedValue[newCursorPos] || '')) {
                newCursorPos++;
            }
            input.setSelectionRange(newCursorPos, newCursorPos);
        }
        validateAndStyle();
    };
    $input.off('.cpfcnpj').on('input.cpfcnpj', formatOnInput);
    if (typeField && frm.fields_dict[typeField]?.$input) {
        frm.fields_dict[typeField].$input.off(`.cpfcnpjtype_${docField}`).on(`change.cpfcnpjtype_${docField}`, () => {
            validateAndStyle();
            $input.trigger('input.cpfcnpj');
        });
    }
    validateAndStyle();
};
agt.utils.redirect_by_ref = function (ref, title, message, indicator, url, delay = 3000, newTab = true) {
    if (!ref || !url) {
        console.error('redirect_by_ref: ref e url são obrigatórios');
        return;
    }
    frappe.msgprint({
        title: title || 'Redirecionando...',
        message: message ?? "",
        indicator: indicator || 'blue'
    });
    setTimeout(() => {
        if (url) {
            if (newTab) {
                window.open(url, '_blank');
            }
            else {
                window.location.href = url;
            }
        }
    }, delay);
};
agt.utils.build_doc_url = function (doctype, docname) {
    const doctypeSlug = doctype
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/\s+/g, '-')
        .replace(/_/g, '-')
        .toLowerCase();
    return `${window.location.origin}/app/${doctypeSlug}/${encodeURIComponent(docname)}`;
};
agt.utils.redirect_after_create_doc = function (success, url, docname, doctype) {
    if (success) {
        frappe.msgprint({
            title: "Redirecionando...",
            message: `${doctype} criado com sucesso! Você será direcionado para o documento (${docname}).`,
            indicator: "green"
        });
    }
    else {
        frappe.msgprint({
            title: "Redirecionando...",
            message: `Você será direcionado para o documento já existente (${docname}).`,
            indicator: "blue"
        });
    }
    setTimeout(() => {
        window.location.href = url;
    }, 2000);
};
agt.utils.get_item_info = async function (item_name, sn) {
    if (!item_name || typeof item_name !== 'string') {
        console.error('get_item_info: item_name é obrigatório');
        return;
    }
    const all_items = await frappe.db
        .get_list('Item', {
        fields: ['item_code', 'custom_mppt', 'item_name'],
    })
        .catch((e) => {
        console.error('Erro ao buscar itens:', e);
        return null;
    });
    if (!all_items || !all_items.length)
        return;
    const normalizedInput = agt.utils.text.normalize(item_name);
    const filtered_items = all_items.filter((item) => agt.utils.text.normalize(item.item_name) === normalizedInput);
    if (!filtered_items.length)
        return;
    const uniqueMppts = [...new Set(filtered_items.map((item) => item.custom_mppt))];
    if (uniqueMppts.length === 1)
        return filtered_items[0];
    const dialog_title = `Selecione a quantidade de MPPTs (${item_name}${sn ? ` - ${sn}` : ''})`;
    return new Promise(resolve => {
        agt.utils.dialog.load({
            title: dialog_title,
            fields: [
                {
                    fieldname: 'mppt',
                    label: 'MPPT',
                    fieldtype: 'Select',
                    options: uniqueMppts,
                    reqd: true
                }
            ],
            static: false,
            draggable: false,
            lockClose: true,
            primary_action: async function (values) {
                const mppt = values.mppt;
                if (!mppt)
                    return;
                const item = filtered_items.find((item) => item.custom_mppt === mppt);
                agt.utils.dialog.close_by_title(dialog_title);
                resolve(item);
            }
        });
    });
};
agt.utils.get_growatt_sn_info = async function (serial_no) {
    if (!serial_no || typeof serial_no !== 'string') {
        console.error('get_growatt_sn_info: serial_no é obrigatório');
        return undefined;
    }
    try {
        const sn = await frappe.call({
            method: 'get_growatt_sn_info',
            args: { deviceSN: serial_no }
        });
        const fail = !sn || !sn.message?.code || sn.message.code !== 200;
        if (fail)
            return undefined;
        return sn.message;
    }
    catch (error) {
        console.error('Erro ao buscar informações do SN Growatt:', error);
        return undefined;
    }
};
agt.utils.validate_serial_number = function (sn, type) {
    if (!sn || typeof sn !== 'string')
        return false;
    sn = sn.trim().toUpperCase();
    const sn_regex = /^[A-Z0-9][A-Z][A-Z0-9]([A-Z0-9]{7}|[A-Z0-9]{13})$/;
    const iv_sn_regex = /^[A-Z0-9]{3}[A-Z0-9]{7}$/;
    const other_sn_regex = /^[A-Z0-9]{3}[A-Z0-9]{13}$/;
    let output = false;
    if (type === 'inverter') {
        output = iv_sn_regex.test(sn);
    }
    else if (type === 'battery' || type === 'ev_charger') {
        output = other_sn_regex.test(sn);
    }
    else {
        output = sn_regex.test(sn);
    }
    return output;
};
agt.utils.get_value_from_any_doc = async function (frm, doctype, docnameField, fieldName) {
    const docname = frm.doc[docnameField];
    if (!docname)
        return null;
    try {
        const result = await frappe.db.get_doc(doctype, docname);
        return result?.[fieldName] ?? null;
    }
    catch (e) {
        console.error(`Erro ao buscar campo ${fieldName} do ${doctype}:`, e);
        return null;
    }
};
