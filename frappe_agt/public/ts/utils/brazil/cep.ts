import type { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";
import type { CepApiResponse, ValidationStatus } from "@anygridtech/frappe-agt-types/agt/client/utils/brazil";

frappe.provide('agt.utils.brazil');
frappe.provide('agt.utils.brazil.cep');

// CEP functions
agt.utils.brazil.cep.regex = /^\d{5}-?\d{3}$/;

/**
 * Formats a Brazilian ZIP code (CEP) to the standard format (xxxxx-xxx).
 * @param frm - The Frappe form instance
 * @param cep_field - The field containing the ZIP code
 * @returns The formatted ZIP code.
 */
agt.utils.brazil.cep.format = function(frm: FrappeForm, cep_field: string): string {
  let cep = frm.doc[cep_field] || '';
  cep = cep.replace(/\D/g, '');
  
  if (cep.length === 8) {
    const formatted = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    frm.set_value(cep_field, formatted);
    return formatted;
  }
  return cep;
};

/**
 * Validates a Brazilian ZIP code (CEP) and auto-fills address fields.
 * Makes an API call to check the ZIP code and update related fields.
 * @param frm - The Frappe form instance
 * @param field - The field containing the ZIP code
 * @param addr - The field to store the address
 * @param neigh - The field to store the neighborhood
 * @param town - The field to store the city
 * @param state - The field to store the state
 */
agt.utils.brazil.cep.validate = async function (
  frm: FrappeForm,
  field: string,
  addr: string,
  neigh: string,
  town: string,
  state: string
): Promise<void> {
  const f = frm.fields_dict[field];
  if (!f?.$input) return;
  const $input = f.$input as JQuery<HTMLInputElement>;

  /**
   * Sets visual style icon based on validation status
   */
  const setVisualStyle = (status: ValidationStatus): string => {
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

  /**
   * Updates UI with validation feedback
   */
  const updateUI = (color: string, message: string): void => {
    let status: ValidationStatus = 'default';
    if (color === '#f1c40f') status = 'warning';
    else if (color === 'red' || color === '#e74c3c') status = 'error';
    else if (color === 'green' || color === '#27ae60') status = 'success';

    const icon = setVisualStyle(status);
    f['set_description'](
      icon + (message ? `<b style="color:${color}">${message}</b>` : '')
    );
  };

  /**
   * Fetches CEP data from server
   */
  const fetchCepData = async (cep: string): Promise<CepApiResponse | null> => {
    try {
      const response = await frappe.call({
        method: 'check_cep',
        args: { cep }
      });
      return response.message;
    } catch (err) {
      console.error('Erro ao consultar o CEP via server script:', err);
      return null;
    }
  };

  /**
   * Validates CEP value and updates UI accordingly
   */
  const validateAndStyle = async (value: string): Promise<void> => {
    const digits = value.replace(/\D/g, '');

    if (!digits) {
      updateUI('', '');
      return;
    }

    if (digits.length < 8) {
      updateUI('#f1c40f', 'CEP incompleto');
      return;
    }

    // Quando tiver 8 dígitos -> consulta
    const data = await fetchCepData(digits);
    if (!data || data.message === 'CEP não encontrado') {
      updateUI('red', 'CEP não encontrado');
      return;
    }

    // CEP válido → preenche campos
    frm.set_value(addr, data.street || '');
    frm.set_value(neigh, data.neighborhood || '');
    frm.set_value(town, data.city || '');
    frm.set_value(state, data.state || '');

    updateUI('green', 'CEP válido');
  };

  /**
   * Formats CEP input and validates in real-time
   */
  const formatOnInput = async (e: Event): Promise<void> => {
    const input = e.target as HTMLInputElement;
    const originalValue = input.value;
    const cursorBefore = input.selectionStart || 0;
    const digitsBeforeCursor = originalValue.slice(0, cursorBefore).replace(/\D/g, '').length;

    // Apenas números
    let digits = originalValue.replace(/\D/g, '').slice(0, 8);

    // Detecta se é adição (digitando) ou remoção
    const currentFieldValue = frm.doc[field as keyof typeof frm.doc]?.toString() || '';
    const isAdding = digits.length > currentFieldValue.replace(/\D/g, '').length;

    let formatted = digits;
    if (isAdding && digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    } else if (!isAdding) {
      // Se está apagando, não forçar traço
      if (digits.length > 5 && originalValue.includes('-')) {
        formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      } else {
        formatted = digits;
      }
    }

    if (formatted !== originalValue) {
      input.value = formatted;
      frm.doc[field as keyof typeof frm.doc] = formatted;

      // Ajusta cursor
      let newCursor = 0;
      let countDigits = 0;
      for (const ch of formatted) {
        newCursor++;
        if (/\d/.test(ch)) countDigits++;
        if (countDigits >= digitsBeforeCursor) break;
      }
      while (newCursor < formatted.length && formatted[newCursor] && /\D/.test(formatted[newCursor] || '')) {
        newCursor++;
      }
      input.setSelectionRange(newCursor, newCursor);
    }

    // Validação dinâmica
    await validateAndStyle(formatted);
  };

  // Remove eventos anteriores e adiciona novos
  $input.off('.zipcode').on('input.zipcode', formatOnInput);

  // Se já tiver valor ao carregar
  const currentValue = frm.doc[field as keyof typeof frm.doc]?.toString();
  if (currentValue) {
    $input.trigger('input.zipcode');
  }
};



