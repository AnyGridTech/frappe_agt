frappe.provide('agt.utils.brazil');
frappe.provide('agt.utils.brazil.cep');
agt.utils.brazil.cep.regex = /^\d{5}-?\d{3}$/;
agt.utils.brazil.cep.format = function (frm, cep_field) {
    let cep = frm.doc[cep_field] || '';
    cep = cep.replace(/\D/g, '');
    if (cep.length === 8) {
        const formatted = `${cep.slice(0, 5)}-${cep.slice(5)}`;
        frm.set_value(cep_field, formatted);
        return formatted;
    }
    return cep;
};
agt.utils.brazil.cep.validate = async function (frm, field, addr, neigh, town, state) {
    const f = frm.fields_dict[field];
    if (!f?.$input)
        return;
    const $input = f.$input;
    const setVisualStyle = (status) => {
        switch (status) {
            case 'warning':
                return `<i class="fa fa-exclamation-circle" style="color:#f1c40f"></i> `;
            case 'error':
                return `<i class="fa fa-times-circle" style="color:#e74c3c"></i> `;
            case 'success':
                return `<i class="fa fa-check-circle" style="color:#27ae60"></i> `;
            default:
                return '';
        }
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
        f['set_description'](icon + (message ? `<b style="color:${color}">${message}</b>` : ''));
    };
    const fetchCepData = async (cep) => {
        try {
            const response = await frappe.call({
                method: 'check_cep',
                args: { cep }
            });
            return response.message;
        }
        catch (err) {
            console.error('Erro ao consultar o CEP via server script:', err);
            return null;
        }
    };
    const validateAndStyle = async (value) => {
        const digits = value.replace(/\D/g, '');
        if (!digits) {
            updateUI('', '');
            return;
        }
        if (digits.length < 8) {
            updateUI('#f1c40f', 'CEP incompleto');
            return;
        }
        const data = await fetchCepData(digits);
        if (!data || data.message === 'CEP não encontrado') {
            updateUI('red', 'CEP não encontrado');
            return;
        }
        frm.set_value(addr, data.street || '');
        frm.set_value(neigh, data.neighborhood || '');
        frm.set_value(town, data.city || '');
        frm.set_value(state, data.state || '');
        updateUI('green', 'CEP válido');
    };
    const formatOnInput = async (e) => {
        const input = e.target;
        const originalValue = input.value;
        const cursorBefore = input.selectionStart || 0;
        const digitsBeforeCursor = originalValue.slice(0, cursorBefore).replace(/\D/g, '').length;
        let digits = originalValue.replace(/\D/g, '').slice(0, 8);
        const currentFieldValue = frm.doc[field]?.toString() || '';
        const isAdding = digits.length > currentFieldValue.replace(/\D/g, '').length;
        let formatted = digits;
        if (isAdding && digits.length > 5) {
            formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
        }
        else if (!isAdding) {
            if (digits.length > 5 && originalValue.includes('-')) {
                formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
            }
            else {
                formatted = digits;
            }
        }
        if (formatted !== originalValue) {
            input.value = formatted;
            frm.doc[field] = formatted;
            let newCursor = 0;
            let countDigits = 0;
            for (const ch of formatted) {
                newCursor++;
                if (/\d/.test(ch))
                    countDigits++;
                if (countDigits >= digitsBeforeCursor)
                    break;
            }
            while (newCursor < formatted.length && formatted[newCursor] && /\D/.test(formatted[newCursor] || '')) {
                newCursor++;
            }
            input.setSelectionRange(newCursor, newCursor);
        }
        await validateAndStyle(formatted);
    };
    $input.off('.zipcode').on('input.zipcode', formatOnInput);
    const currentValue = frm.doc[field]?.toString();
    if (currentValue) {
        $input.trigger('input.zipcode');
    }
};
