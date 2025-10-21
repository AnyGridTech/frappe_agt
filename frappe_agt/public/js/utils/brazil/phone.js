frappe.provide('agt.utils.brazil');
frappe.provide('agt.utils.brazil.phone');
agt.utils.brazil.phone.regex = /^\(\d{2}\)\s\d{4,5}\-\d{4}$/;
agt.utils.brazil.phone.format = function (frm, phone_field) {
    let phone = frm.doc[phone_field] || '';
    const digits = phone.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) {
        frm.set_value(phone_field, digits);
        return;
    }
    if (digits.length <= 6) {
        frm.set_value(phone_field, `(${digits.substring(0, 2)}) ${digits.substring(2)}`);
        return;
    }
    if (digits.length <= 10) {
        frm.set_value(phone_field, `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`);
        return;
    }
    frm.set_value(phone_field, `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`);
};
agt.utils.brazil.phone.validate = function (frm, phoneField) {
    return new Promise(resolve => {
        const field = frm.fields_dict[phoneField];
        if (!field?.$input) {
            console.error(`validate_phone: O campo '${phoneField}' não foi encontrado ou não é um campo de entrada válido.`);
            return resolve();
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
            field['set_description'](icon + (message ? `<b style='color:${color}'>${message}</b>` : ''));
        };
        const validatePhoneFormat = (phoneNumber) => {
            const digits = phoneNumber.replace(/\D/g, '');
            const hasValidLength = digits.length === 10 || digits.length === 11;
            if (!hasValidLength) {
                return { isValid: false, type: 'invalido' };
            }
            const invalidDDDs = [
                0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
                20, 23, 25, 26, 29, 30,
                36, 39, 40,
                50, 52, 56, 57, 58, 59, 60,
                70, 72, 76, 78, 80, 90
            ];
            const ddd = parseInt(digits.substring(0, 2));
            const hasValidDDD = !invalidDDDs.includes(ddd) && ddd >= 11 && ddd <= 99;
            if (!hasValidDDD) {
                return { isValid: false, type: 'invalido' };
            }
            const firstDigitAfterDDD = parseInt(digits.substring(2, 3));
            if (digits.length === 11 && firstDigitAfterDDD === 9) {
                return { isValid: true, type: 'celular' };
            }
            else if (digits.length === 10 && firstDigitAfterDDD >= 2 && firstDigitAfterDDD <= 8) {
                return { isValid: true, type: 'fixo' };
            }
            else {
                return { isValid: false, type: 'invalido' };
            }
        };
        const formatPhoneNumber = (value) => {
            const digits = value.replace(/\D/g, '').slice(0, 11);
            if (digits.length <= 2)
                return digits;
            if (digits.length <= 6)
                return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
            if (digits.length <= 10)
                return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
            return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
        };
        const formatOnInput = (e) => {
            const input = e.target;
            const originalValue = input.value;
            const originalPos = input.selectionStart || 0;
            const digitsBeforeCursor = (originalValue.slice(0, originalPos).replace(/\D/g, '')).length;
            const digits = originalValue.replace(/\D/g, '');
            const formattedValue = formatPhoneNumber(digits);
            if (originalValue !== formattedValue) {
                input.value = formattedValue;
                frm.doc[phoneField] = formattedValue;
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
            const validation = validatePhoneFormat(formattedValue);
            if (!digits) {
                updateUI('', '');
            }
            else if (digits.length < 10) {
                updateUI('#f1c40f', 'Número de telefone incompleto');
            }
            else if (!validation.isValid) {
                updateUI('red', 'DDD ou número de telefone inválido');
            }
            else if (validation.type === 'celular') {
                updateUI('green', 'Celular válido');
            }
            else if (validation.type === 'fixo') {
                updateUI('green', 'Telefone fixo válido');
            }
        };
        $input.off('.phone').on('input.phone', formatOnInput);
        const currentValue = frm.doc[phoneField]?.toString();
        if (currentValue) {
            $input.trigger('input.phone');
        }
        resolve();
    });
};
//# sourceMappingURL=phone.js.map