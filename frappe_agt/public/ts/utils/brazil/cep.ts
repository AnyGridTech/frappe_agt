frappe.provide('agt.utils.brazil');
frappe.provide('agt.utils.brazil.cep');
frappe.provide('agt.utils.brazil.phone');

// CEP functions
agt.utils.brazil.cep.regex = /^\d{5}-?\d{3}$/;

agt.utils.brazil.cep.format = function(frm: any, cep_field: string): string {
  let cep = frm.doc[cep_field] || '';
  cep = cep.replace(/\D/g, '');
  
  if (cep.length === 8) {
    const formatted = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    frm.set_value(cep_field, formatted);
    return formatted;
  }
  return cep;
};

agt.utils.brazil.cep.validate = async function (
  frm: any,
  field: string,
  addr: string,
  neigh: string,
  town: string,
  state: string
) {
  const f = frm.fields_dict[field];
  if (!f?.$input) return;
  const $input = f.$input as any;

  const setVisualStyle = (status: 'warning' | 'error' | 'success' | 'default') => {
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

  const updateUI = (color: string, message: string) => {
    let status: 'warning' | 'error' | 'success' | 'default' = 'default';
    if (color === '#f1c40f') status = 'warning';
    else if (color === 'red' || color === '#e74c3c') status = 'error';
    else if (color === 'green' || color === '#27ae60') status = 'success';

    const icon = setVisualStyle(status);
    f.set_description(
      icon + (message ? `<b style="color:${color}">${message}</b>` : '')
    );
  };

  const fetchCepData = async (cep: string) => {
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

  const validateAndStyle = async (value: string) => {
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

  const formatOnInput = async (e: any) => {
    const input = e.target as HTMLInputElement;
    const originalValue = input.value;
    const cursorBefore = input.selectionStart || 0;
    const digitsBeforeCursor = originalValue.slice(0, cursorBefore).replace(/\D/g, '').length;

    // Apenas números
    let digits = originalValue.replace(/\D/g, '').slice(0, 8);

    // Detecta se é adição (digitando) ou remoção
    const isAdding = digits.length > (frm.doc[field as keyof typeof frm.doc]?.replace(/\D/g, '')?.length || 0);

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

  // Eventos
  $input.off('.zipcode').on('input.zipcode', formatOnInput);

  // Se já tiver valor ao carregar
  if (frm.doc[field as keyof typeof frm.doc]) {
    $input.trigger('input.zipcode');
  }
};

// Phone functions
agt.utils.brazil.phone.regex = /^\(\d{2}\)\s\d{4,5}\-\d{4}$/;

agt.utils.brazil.phone.format = function(frm: any, phone_field: string) {
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

agt.utils.brazil.phone.validate = function(frm: any, phoneField: string): Promise<void> {
  return new Promise<void>(resolve => {
    const field = frm.fields_dict[phoneField];
    if (!field?.$input) {
      console.error(`validate_phone: O campo '${phoneField}' não foi encontrado ou não é um campo de entrada válido.`);
      return resolve();
    }

    const $input = field.$input as any;

    // Função para definir o estilo visual baseado no status da validação
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

    // Atualizar a interface visual com feedback
    const updateUI = (color: string, message: string) => {
      let status: 'default' | 'warning' | 'error' | 'success' = 'default';
      if (color === '#f1c40f') status = 'warning';
      else if (color === 'red' || color === '#e74c3c') status = 'error';
      else if (color === 'green' || color === '#27ae60') status = 'success';
      const icon = setVisualStyle(status);
      field.set_description(icon + (message ? `<b style='color:${color}'>${message}</b>` : ''));
    };

    // Validar o número de telefone brasileiro
    const validatePhoneFormat = (phoneNumber: string): { isValid: boolean; type: 'fixo' | 'celular' | 'invalido' } => {
      // Remover todos os caracteres não numéricos
      const digits = phoneNumber.replace(/\D/g, '');

      // Verificar se tem entre 10 ou 11 dígitos (com DDD)
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

      // Extrair DDD
      const ddd = parseInt(digits.substring(0, 2));

      // Verificar se o DDD NÃO está na lista de DDDs inválidos e está entre 11 e 99
      const hasValidDDD = !invalidDDDs.includes(ddd) && ddd >= 11 && ddd <= 99;
      if (!hasValidDDD) {
        return { isValid: false, type: 'invalido' };
      }

      // Determinar se é celular ou fixo
      // Celular: 11 dígitos e começa com 9 após o DDD
      // Fixo: 10 dígitos e o primeiro dígito após o DDD está entre 2-8
      const firstDigitAfterDDD = parseInt(digits.substring(2, 3));

      if (digits.length === 11 && firstDigitAfterDDD === 9) {
        return { isValid: true, type: 'celular' };
      } else if (digits.length === 10 && firstDigitAfterDDD >= 2 && firstDigitAfterDDD <= 8) {
        return { isValid: true, type: 'fixo' };
      } else {
        return { isValid: false, type: 'invalido' };
      }
    };

    const formatPhoneNumber = (value: string): string => {
      // Extrair apenas os dígitos e limitar a 11 caracteres
      const digits = value.replace(/\D/g, '').slice(0, 11);

      // Aplicar formatação no padrão brasileiro
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
      if (digits.length <= 10) return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
      return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
    };

    // Validação e formatação em tempo real
    const formatOnInput = (e: any) => {
      const input = e.target as HTMLInputElement;
      const originalValue = input.value;

      // Armazenar posição do cursor antes da formatação
      const originalPos = input.selectionStart || 0;
      const digitsBeforeCursor = (originalValue.slice(0, originalPos).replace(/\D/g, '')).length;

      // Extrair apenas dígitos do valor original
      const digits = originalValue.replace(/\D/g, '');

      // Aplicar formatação
      const formattedValue = formatPhoneNumber(digits);

      // Atualizar o campo com o valor formatado
      if (originalValue !== formattedValue) {
        input.value = formattedValue;
        frm.doc[phoneField] = formattedValue;

        // Ajustar posição do cursor
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

      // Validar e atualizar estilo
      const validation = validatePhoneFormat(formattedValue);

      if (!digits) {
        updateUI('', ''); // Limpar UI se não houver dígitos
      } else if (digits.length < 10) {
        updateUI('#f1c40f', 'Número de telefone incompleto');
      } else if (!validation.isValid) {
        updateUI('red', 'DDD ou número de telefone inválido');
      } else if (validation.type === 'celular') {
        updateUI('green', 'Celular válido');
      } else if (validation.type === 'fixo') {
        updateUI('green', 'Telefone fixo válido');
      }
    };

    // Anexar eventos ao campo de entrada
    $input.off('.phone').on('input.phone', formatOnInput);

    // Executar validação inicial
    if (frm.doc[phoneField]) {
      $input.trigger('input.phone');
    }

    // Resolve a Promise uma vez que a configuração inicial esteja concluída
    resolve();
  });
};

// Validation functions
agt.utils.brazil.validate_cnpj_or_cpf = function(frm: any, field: string, documentType: 'cpf' | 'cnpj') {
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

agt.utils.brazil.format_cnpj_or_cpf = function(frm: any, field: string, documentType: 'cpf' | 'cnpj') {
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