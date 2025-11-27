frappe.provide('agt.utils');

export interface GrowattApiResponse {
  code: number;           // Status code of the response
  msg: string;            // Message describing the response
  data: DeviceInfo;       // Object containing detailed information
}

export interface DeviceInfo {
  id: number;             // Unique ID of the device
  orderNumber: string;    // Order number associated with the device
  accountName: string;    // Account name (partially masked)
  accountName2: string;   // Additional account name (partially masked)
  model: string;          // Model of the device
  deviceSN: string;       // Serial number of the device
  deliveryTime: string;   // Delivery date in ISO format (YYYY-MM-DD)
  warrantyTime: number;   // Warranty duration in years
  outTime: string;        // Warranty expiration date in ISO format (YYYY-MM-DD)
  code: string;           // Device code
  number4Years: string;   // Reserved or additional data (appears to be empty)
  lastUpdateTime: string; // Last updated timestamp (YYYY-MM-DD HH:mm:ss)
  operationName: string;  // Name of the operator or handler
  month: number;          // Reserved data (seems to be a count or metric)
  area: number;           // Area or region ID
  countryId: number;      // Country ID
  deviceType: number;     // Type of the device
  isToShip: number;       // Flag indicating if the device is to be shipped
  isPush: number;         // Flag indicating push notification status
  isPushCount: number;    // Count of push attempts
  isPushOa: number;       // Additional push notification status
}

agt.utils.workflow_transition = async function (
  form: any,
  action: string,
  callback?: ((f: any) => void) | ((f: any) => Promise<void>)
) {
  if (!form || !form.states?.frm || !action) {
    console.error('workflow_transition: Parâmetros inválidos.');
    return;
  }

  // set the workflow_action for use in form scripts
  frappe.dom.freeze();
  form.states.frm.selected_workflow_action = action;
  form.states.frm.script_manager.trigger('before_workflow_action').then(async () => {
    await frappe
      .xcall('frappe.model.workflow.apply_workflow', {
        doc: form.states.frm.doc,
        action: action
      })
      .then((doc: any) => {
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

agt.utils.update_workflow_state = async function (params: {
  doctype: string;
  docname: string;
  workflow_state: string;
  ignore_workflow_validation?: boolean;
  callback?: () => Promise<void>;
}) {
  const { doctype, docname, workflow_state, ignore_workflow_validation, callback } = params;
  return await frappe
    .call({
      method: 'update_workflow_state',
      args: { doctype, docname, workflow_state, ignore_workflow_validation }
    })
    .then(async () => {
      return await agt.utils.refresh_force().then(async (doc: any) => {
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
    .then((doc: any) => {
      if (cur_frm?.states?.frm?.refresh) {
        cur_frm.states.frm.refresh(); // Refresh the form
      }
      return doc;
    })
    .catch((error: any) => {
      console.error('Error refreshing document:', error);
      return undefined;
    });
};

// Validation functions (moved here to avoid circular dependencies)
agt.utils.validate_cpf_regex = function (cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false;
  cpf = cpf.trim();
  return /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/.test(cpf);
};

agt.utils.validate_cnpj_regex = function (cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false;
  cnpj = cnpj.trim();
  return /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/.test(cnpj);
};

agt.utils.validate_cpf = function (cpf: string): boolean {
  const d = (cpf || '').replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += +(d[i] || 0) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== +(d[9] || 0)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += +(d[i] || 0) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  return check === +(d[10] || 0);
};

agt.utils.validate_cnpj = function (cnpj: string): boolean {
  const d = (cnpj || '').replace(/\D/g, '');
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (base: string, weights: number[]) => base.split('').reduce((sum, n, i) => sum + +(n || 0) * (weights[i] || 0), 0);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, ...w1];
  let check = calc(d.slice(0, 12), w1) % 11;
  let digit = check < 2 ? 0 : 11 - check;
  if (digit !== +(d[12] || 0)) return false;
  check = calc(d.slice(0, 13), w2) % 11;
  digit = check < 2 ? 0 : 11 - check;
  return digit === +(d[13] || 0);
};

agt.utils.validate_cnpj_existence = async function (cnpj: string): Promise<boolean> {
  if (!cnpj || typeof cnpj !== 'string') return false;

  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;

  try {
    const response = await frappe.call({
      method: 'check_cnpj',
      args: { cnpj: digits }
    });
    const data = response?.message;
    // Considera válido se não houver erro e o CNPJ retornado for igual ao consultado
    return !!data && !!data.cnpj && data.cnpj.replace(/\D/g, '') === digits;
  } catch (error: any) {
    console.error('Erro ao validar CNPJ:', error);
    return false;
  }
};

agt.utils.format_doc = function (doc: string, type?: string): string {
  let digits = (doc || '').replace(/\D/g, '');

  const formatCpf = (d: string) => {
    let formatted = d.slice(0, 11);
    if (formatted.length > 3) formatted = formatted.replace(/^(\d{3})(\d)/, '$1.$2');
    if (formatted.length > 6) formatted = formatted.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    if (formatted.length > 9) formatted = formatted.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    return formatted;
  };

  const formatCnpj = (d: string) => {
    let formatted = d.slice(0, 14);
    if (formatted.length > 2) formatted = formatted.replace(/^(\d{2})(\d)/, '$1.$2');
    if (formatted.length > 5) formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
    if (formatted.length > 8) formatted = formatted.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4');
    if (formatted.length > 12) formatted = formatted.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
    return formatted;
  };

  if (type === 'Pessoa Física') {
    return formatCpf(digits);
  }
  if (type === 'Pessoa Jurídica') {
    return formatCnpj(digits);
  }
  // Se não houver tipo, formata com base no comprimento
  return digits.length < 12 ? formatCpf(digits) : formatCnpj(digits);
};

// Document ID validation function
agt.utils.document_id = async function (frm: any, docField: string, typeField: string) {
  const field = frm.fields_dict[docField];
  if (!field?.$input) {
    console.error(`document_id: O campo '${docField}' não foi encontrado ou não é um campo de entrada válido.`);
    return;
  }
  const $input = field.$input as any;

  const setVisualStyle = (status: 'default' | 'warning' | 'error' | 'success') => {
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

  const updateUI = (color: string, message: string) => {
    let status: 'default' | 'warning' | 'error' | 'success' = 'default';
    if (color === '#f1c40f') status = 'warning';
    else if (color === 'red' || color === '#e74c3c') status = 'error';
    else if (color === 'green' || color === '#27ae60') status = 'success';
    const icon = setVisualStyle(status);
    field.set_description(icon + (message ? `<b style='color:${color}'>${message}</b>` : ''));
  };

  const validateAndStyle = () => {
    const value = ($input.val() || '') as string;
    const digits = value.replace(/\D/g, '');
    const docType = typeField ? frm.doc[typeField] : null;

    // Make the field read-only and hidden if the document type is not valid  
    if (docType && docType !== 'Pessoa Física' && docType !== 'Pessoa Jurídica') {
      frm.set_df_property(docField, 'read_only', 1);
      frm.set_df_property(docField, 'hidden', 1);
      updateUI('#f1c40f', 'Selecione o tipo de documento antes de preencher.');
      return;
    } else {
      frm.set_df_property(docField, 'read_only', 0);
      frm.set_df_property(docField, 'hidden', 0);
    }

    if (!digits) {
      updateUI('', ''); // Clear the UI if no digits are present
      return;
    }

    // { CPF logic }
    if (docType === 'Pessoa Física') {
      if (digits.length < 11) {
        updateUI('#f1c40f', 'CPF incompleto');
      } else {
        if (agt.utils.validate_cpf(digits)) {
          updateUI('green', 'CPF válido');
        } else {
          updateUI('red', 'CPF inválido. Favor corrigir.');
        }
      }
      return;
    }

    // { CNPJ logic }
    if (docType === 'Pessoa Jurídica') {
      if (digits.length < 14) {
        updateUI('#f1c40f', 'CNPJ incompleto');
      } else {
        if (agt.utils.validate_cnpj(digits)) {
          updateUI('#27ae60', 'CNPJ válido sintaticamente. Verificando existência...');
          agt.utils.validate_cnpj_existence(digits).then((exists: any) => {
            if (exists) {
              updateUI('green', 'CNPJ existe e está ativo');
            } else {
              updateUI('red', 'CNPJ não encontrado na base nacional');
            }
          });
        } else {
          updateUI('red', 'CNPJ inválido. Favor corrigir.');
        }
      }
      return;
    }

    // { Ambiguous logic }
    if (docType === null) {
      if (digits.length < 11 || (digits.length > 11 && digits.length < 14)) {
        updateUI('#f1c40f', 'CPF ou CNPJ incompleto.');
      } else if (digits.length === 11) {
        if (agt.utils.validate_cpf(digits)) {
          updateUI('green', 'CPF válido');
        } else {
          updateUI('red', 'CPF ou CNPJ inválido ou incompleto');
        }
      } else if (digits.length >= 14) {
        const cnpDigits = digits.slice(0, 14);
        if (agt.utils.validate_cnpj(cnpDigits)) {
          updateUI('green', 'CNPJ válido');
        } else {
          updateUI('red', 'CNPJ inválido. Favor corrigir.');
        }
      }
    }
  };

  const formatOnInput = (e: any) => {
    const input = e.target as HTMLInputElement;
    const originalValue = input.value;
    const docType = typeField ? frm.doc[typeField] : null;

    // Store the cursor position before formatting
    const originalPos = input.selectionStart || 0;
    const digitsBeforeCursor = (originalValue.slice(0, originalPos).replace(/\D/g, '')).length;

    // Extract only digits and limit length based on document type
    let digits = originalValue.replace(/\D/g, '');
    const maxLength = docType === 'Pessoa Jurídica' ? 14 : (docType === 'Pessoa Física' ? 11 : 14);
    if (digits.length > maxLength) {
      digits = digits.slice(0, maxLength);
    }

    const formatCpf = (d: string) => d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, '$1.$2.$3-$4');
    const formatCnpj = (d: string) => d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4').replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');

    let formattedValue = digits;
    if (docType === 'Pessoa Física') {
      formattedValue = formatCpf(digits);
    } else if (docType === 'Pessoa Jurídica') {
      formattedValue = formatCnpj(digits);
    } else {
      formattedValue = digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
    }

    // Apply the formatted value and adjust the cursor
    if (originalValue !== formattedValue) {
      input.value = formattedValue;
      frm.doc[docField] = formattedValue;

      // Recalcula a nova posição do cursor
      let newCursorPos = 0;
      let digitsCounted = 0;
      for (const char of formattedValue) {
        newCursorPos++;
        if (/\d/.test(char)) digitsCounted++;
        if (digitsCounted >= digitsBeforeCursor) break;
      }
      while (newCursorPos < formattedValue.length && formattedValue[newCursorPos] && /\D/.test(formattedValue[newCursorPos] || '')) {
        newCursorPos++;
      }
      input.setSelectionRange(newCursorPos, newCursorPos);
    }

    // Performs validation for real-time feedback
    validateAndStyle();
  };

  // Attach events to the input field
  $input.off('.cpfcnpj').on('input.cpfcnpj', formatOnInput);

  // Revalidate if the type field changes
  if (typeField && frm.fields_dict[typeField]?.$input) {
    frm.fields_dict[typeField].$input.off(`.cpfcnpjtype_${docField}`).on(`change.cpfcnpjtype_${docField}`, () => {
      validateAndStyle(); // Directly call the validation/style function
      $input.trigger('input.cpfcnpj'); // Optional: keep formatting if needed
    });
  }
  // Perform initial validation
  validateAndStyle();
};

agt.utils.redirect_by_ref = function (ref?: string, title?: string, message?: string, indicator?: string, url?: string, delay = 3000, newTab = true) {
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
      } else {
        window.location.href = url;
      }
    }
  }, delay);
};

agt.utils.build_doc_url = function (doctype: string, docname: string): string {
  const doctypeSlug = doctype
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .toLowerCase();
  return `${window.location.origin}/app/${doctypeSlug}/${encodeURIComponent(docname)}`;
};

agt.utils.redirect_after_create_doc = function (success: boolean, url: string, docname: string, doctype: string): void {
  if (success) {
    frappe.msgprint({
      title: "Redirecionando...",
      message: `${doctype} criado com sucesso! Você será direcionado para o documento (${docname}).`,
      indicator: "green"
    });
  } else {
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

agt.utils.get_item_info = async function (item_name: string, sn?: string) {
  if (!item_name || typeof item_name !== 'string') {
    console.error('get_item_info: item_name é obrigatório');
    return;
  }

  const all_items = await frappe.db
    .get_list('Item', {
      fields: ['item_code', 'mppt', 'item_name'],
    })
    .catch((e: any) => {
      console.error('Erro ao buscar itens:', e);
      return null;
    });

  if (!all_items || !all_items.length) return;

  // Busca flexível usando normalize_text apenas com item_name
  const normalizedInput = agt.utils.text.normalize(item_name);
  const filtered_items = all_items.filter((item: any) =>
    agt.utils.text.normalize(item.item_name) === normalizedInput
  );

  if (!filtered_items.length) return;
  // Se só existe um MPPT, retorna direto
  const uniqueMppts = [...new Set(filtered_items.map((item: any) => item.mppt))];
  if (uniqueMppts.length === 1) return filtered_items[0];

  // Se há mais de um MPPT, mostra o diálogo para seleção
  const dialog_title = `Selecione a quantidade de MPPTs (${item_name}${sn ? ` - ${sn}` : ''})`;
  return new Promise<any>(resolve => {
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
      primary_action: async function (values: any) {
        const mppt = values.mppt;
        if (!mppt) return;
        const item = filtered_items.find((item: any) => item.mppt === mppt);
        agt.utils.dialog.close_by_title(dialog_title);
        resolve(item); // Resolve o item selecionado
      }
    });
  });
};

agt.utils.get_growatt_sn_info = async function (serial_no: string) {
  const sn = await frappe.call<{ message: GrowattApiResponse }>({
    method: 'frappe_agt.api.get_growatt_sn_info',
    args: { deviceSN: serial_no }
  });
  const fail = !sn || !sn.message?.code || sn.message.code !== 200;
  if (fail) return undefined;
  return sn.message;
};

agt.utils.validate_serial_number = function (sn: string, type?: 'inverter' | 'battery' | 'ev_charger' | 'transformer' | 'smart_meter' | 'smart_energy_manager' | 'other'): boolean {
  if (!sn || typeof sn !== 'string') return false;

  sn = sn.trim().toUpperCase();

  const sn_regex = /^[A-Z0-9][A-Z][A-Z0-9]([A-Z0-9]{7}|[A-Z0-9]{13})$/;
  const iv_sn_regex = /^[A-Z0-9]{3}[A-Z0-9]{7}$/;
  const other_sn_regex = /^[A-Z0-9]{3}[A-Z0-9]{13}$/;

  let output = false;
  if (type === 'inverter') {
    output = iv_sn_regex.test(sn);
  } else if (type === 'battery' || type === 'ev_charger') {
    output = other_sn_regex.test(sn);
  } else {
    output = sn_regex.test(sn);
  }
  return output;
};

agt.utils.get_value_from_any_doc = async function (
  frm: any,
  doctype: string,
  docnameField: string,
  fieldName: string
): Promise<any> {
  const docname = frm.doc[docnameField];
  if (!docname) return null;
  try {
    const result = await frappe.db.get_doc(doctype, docname);
    return result?.[fieldName] ?? null;
  } catch (e) {
    console.error(`Erro ao buscar campo ${fieldName} do ${doctype}:`, e);
    return null;
  }
};