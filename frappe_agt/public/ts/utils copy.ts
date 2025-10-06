declare global {
  interface Window {
    frappe: any;
    agt: any;
    cur_frm: any;
    $: any;
    __: (text: string) => string;
  }
}

declare const frappe: any;
declare const agt: any;
declare const cur_frm: any;
declare const $: any;
declare const __: (text: string) => string;

frappe.provide('agt.utils');

agt.utils = {
  normalize_text: function(text: string): string {
    return (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[-_\s]/g, '') // remove hífens, underlines e espaços
      .replace(/[^a-z0-9]/g, ''); // remove outros caracteres especiais
  },
  sn_regex: /^[A-Z0-9][A-Z][A-Z0-9]([A-Z0-9]{7}|[A-Z0-9]{13})$/,
  iv_sn_regex: /^[A-Z0-9]{3}[A-Z0-9]{7}$/,
  other_sn_regex: /^[A-Z0-9]{3}[A-Z0-9]{13}$/,

  cpf_regex: /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/,
  cnpj_regex: /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/,
  phone_regex: /^\(\d{2}\)\s\d{4,5}\-\d{4}$/,

  validate_serial_number: (sn: string, type?: 'inverter' | 'battery' | 'ev_charger' | 'transformer' | 'smart_meter' | 'smart_energy_manager' | 'other'): boolean => {
    if (!sn || typeof sn !== 'string') return false;

    sn = sn.trim().toUpperCase();

    const sn_regex = agt.utils.sn_regex;
    const iv_sn_regex = agt.utils.iv_sn_regex;
    const other_sn_regex = agt.utils.other_sn_regex;

    let output = false;
    if (type === 'inverter') {
      output = iv_sn_regex.test(sn);
    } else if (type === 'battery' || type === 'ev_charger') {
      output = other_sn_regex.test(sn);
    } else {
      output = sn_regex.test(sn);
    }
    return output;
  },

  validate_cpf_regex: (cpf: string): boolean => {
    if (!cpf || typeof cpf !== 'string') return false;

    cpf = cpf.trim();

    return agt.utils.cpf_regex.test(cpf);
  },

  validate_cnpj_regex: (cnpj: string): boolean => {
    if (!cnpj || typeof cnpj !== 'string') return false;

    cnpj = cnpj.trim();

    return agt.utils.cnpj_regex.test(cnpj);
  },

  is_valid: (v: any) => v !== null && v !== undefined && (typeof v === 'string' ? v.trim() !== '' : true),
  create_doc: async function(
    doctype: string,
    fields_target: Record<string, string>,
    fields_dict: Record<string, any>
  ): Promise<string | undefined> {
    const meta = await this.get_doc_meta(doctype);
    if (!meta) {
      frappe.throw(`Could not fetch meta for doctype: ${doctype}`);
      return;
    }

    const fields_record = Object.entries(fields_dict).reduce((acc, [k, v]) => {
      if (typeof v.value === "number" || typeof v.value === "string") {
        acc[k] = v.value;
      }
      return acc;
    }, {} as Record<string, string | number>);

    const valid_fields = meta.fields.map((field: any) => field.fieldname);

    // Novo formato obrigatório: { origem: destino }
    for (const [sourceField, targetField] of Object.entries(fields_target)) {
      if (!valid_fields.includes(targetField)) continue;

      let value: any;
      if (sourceField === "docname" && cur_frm?.docname) {
        value = cur_frm.docname;
      } else if (cur_frm?.doc && sourceField in cur_frm.doc) {
        value = (cur_frm.doc as any)[sourceField];
      }

      if (value !== undefined) {
        fields_record[targetField] = value;
      }
    }

    // Filtra apenas fields válidos
    const valid_updates: Record<string, any> = {};
    for (const [fieldname, field] of Object.entries(fields_record)) {
      if (!valid_fields.includes(fieldname)) continue;
      if (!this.is_valid(field)) continue;
      valid_updates[fieldname] = field;
    }

    if (Object.keys(valid_updates).length === 0) {
      frappe.throw(`No valid fields to create the document: ${doctype}`);
      return;
    }

    // Cria doc novo
    const doc = frappe.model.get_new_doc(doctype);

    // Aplica atualizações válidas
    for (const [name, value] of Object.entries(valid_updates)) {
      if (name === "workflow_state" || name === "naming_series") continue;
      doc[name] = value;
    }

    // Salva doc
    const r1 = await frappe.db.insert(doc).catch((e: any) => console.error(e));
    return r1?.name;
  },
  build_doc_url(doctype: string, docname: string): string {
    const doctypeSlug = doctype
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/\s+/g, '-')
      .replace(/_/g, '-')
      .toLowerCase();
    return `${window.location.origin}/app/${doctypeSlug}/${encodeURIComponent(docname)}`;
  },
  redirect_after_create_doc(success: boolean, url: string, docname: string, doctype: string): void {
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
  },
  set_field_properties(frm: any, configs: Record<string, any>): void {
    Object.entries(configs).forEach(([fieldname, opts]) => {
      if (opts.hidden !== undefined) {
        const $el = frm.$wrapper.find(`[data-fieldname='${fieldname}']`);
        $el.toggle(!opts.hidden);
      }
      if (opts.readonly !== undefined) {
        frm.set_df_property(fieldname, 'read_only', opts.readonly ? 1 : 0);
      }
      if (opts.reqd !== undefined) {
        frm.set_df_property(fieldname, 'reqd', opts.reqd ? 1 : 0);
      }
      if (opts.label !== undefined) {
        frm.set_df_property(fieldname, 'label', opts.label);
      }
      if (opts.description !== undefined) {
        frm.set_df_property(fieldname, 'description', opts.description);
      }
    });
    frm.refresh_fields();
  },
  async update_doc(
    doctype: string,
    docname: string,
    fields_record: Record<string, any>,
    retryCount = 0
  ): Promise<void> {
    const maxRetries = 3; // Limit retries to prevent infinite loops
    if (retryCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) reached. Aborting update.`);
      return;
    }
    try {
      // Fetch the latest document
      const doc = await frappe.db.get_doc(doctype, docname).catch((e: any) => console.error(e));
      if (!doc) {
        console.error(`Document '${docname}' not found.`);
        return;
      }

      // Determine valid updates
      const valid_updates: Record<string, any> = {};
      const ignore_fields = ['workflow_state', 'naming_series', 'creation', 'doctype', 'modified', 'name', 'owner'];
      for (const [f, v] of Object.entries(fields_record)) {
        if (ignore_fields.includes(f) && doctype !== 'Serial No') continue;
        if (doc[f] === undefined) continue;
        if (doc[f] === v) continue;
        if (doc[f] === null && v === '') continue;
        if (doc[f] === '' && v === null) continue;
        console.log(`[${doctype} - ${docname}] Setting ${f} to ${v}`);
        doc[f] = v;
        valid_updates[f] = v;
      }

      if (Object.keys(valid_updates).length === 0) {
        console.log(`[${doctype} - ${docname}] No valid fields to update`);
        return;
      }

      // Save the updated document
      await frappe.call({
        method: 'frappe.client.save',
        args: { doc }
      });

      if (doctype === cur_frm.doctype && docname === cur_frm.docname) {
        // Fetch the latest version of the document from the server
        const updatedDoc = (await frappe
          .call({
            method: 'frappe.client.get',
            args: { doctype, name: docname }
          })
          .then(({ message }: any) => message)) as any;

        frappe.model.sync([updatedDoc]);

        cur_frm.states.frm.refresh();
      }

      console.log(`Document '${docname}' updated successfully.`);
    } catch (error) {
      // Check for timestamp mismatch
      if ((error as unknown as any)?.message?.includes('Document has been modified after you have opened it')) {
        console.warn('Timestamp mismatch detected. Refetching document...');
        return await this.update_doc(doctype, docname, fields_record, retryCount + 1);
      } else {
        console.error(`Error saving document '${docname}':`, error);
      }
    }
  },

  get_doc: async function(doctype: string, docname: string) {
    return await frappe
      .call({
        method: 'frappe.client.get',
        args: { doctype, name: docname }
      })
      .then(async (doc: any) => {
        // Update locals manually
        frappe.model.clear_doc(doctype, docname); // Clears old cache
        frappe.model.sync([doc.message]); // Syncs the fresh document
        cur_frm.states.frm.refresh(); // Refresh the form
        return doc.message; // Return the latest document
      });
  },

  share_doc: async function(doctype: string, docname: string, users: any[]) {
    const shared_users = (await frappe
      .call({
        method: 'frappe.share.get_users',
        args: { doctype: doctype, name: docname }
      })
      .then(({ message }: any) => message)) as any[];
    for (const user of users) {
      const shared = shared_users.find(u => u.user === user.user);
      if (shared?.read === user.read && shared?.write === user.write && shared?.share === user.share) {
        console.log(`Document '${docname}' already shared with user '${user.user}'`);
        continue;
      }
      await frappe
        .call({
          method: 'frappe.share.add',
          args: {
            doctype: doctype,
            name: docname,
            user: user.user,
            read: user.read,
            write: user.write,
            share: user.share,
            owner: user.owner || frappe.session.user_email
          }
        })
        .then(() => console.log(`Document '${docname}' shared with user '${user.user}'`));
    }
  },

  get_doc_meta: async function(doctype: string) {
    await frappe.model.with_doctype(doctype);
    return frappe.get_meta(doctype);
  },

  is_table_synced: async function(current: any, remote: any, docname: any, workflowStateField?: string): Promise<boolean> {
    if (current.length !== remote.length) return false;

    const currentMap = new Map(current.map((row: any) => [row[docname], row]));
    const remoteMap = new Map(remote.map((r: any) => [r.name, r]));

    // Verify if all current documents exist in remote and vice versa
    const allDocsExist = current.every((row: any) => remoteMap.get(row[docname]))
      && remote.every((row: any) => currentMap.has(row.name));

    if (!allDocsExist) return false;

    if (workflowStateField) {
      return !remote.some((remoteItem: any) => {
        const currentItem = currentMap.get(remoteItem.name);
        return currentItem && (currentItem as any)[workflowStateField] !== remoteItem.workflow_state;
      });
    }
    return true;
  },

  mirror_checklist_table: async function(form: any, doctype: string, tableField: string, childname: string, docname: string, workflowStateField?: string) {
    const name = form.doc.name;
    // Fetch remote records with the additional workflow_state field if necessary
    const fields = ['name'];
    if (workflowStateField) fields.push('workflow_state');

    const remote = await frappe.db.get_list(doctype, {
      filters: { [childname]: name },
      fields: fields
    }).catch((e: any) => { console.error(`Error fetching ${doctype}:`, e); return []; });

    const currentTable = (form.doc[tableField] || []) as any[];

    // Check for differences between the current table and remote data, including workflow_state if necessary
    let needsUpdate = !await agt.utils.is_table_synced(currentTable, remote, docname, workflowStateField);

    // If there are no differences, do nothing
    if (!needsUpdate) {
      console.log(`Tabela '${tableField}' já está sincronizada.`);
      return;
    }

    // Update the table with the new data
    form.doc[tableField] = remote.map((item: any) => {
      const row = { [docname]: item.name };
      if (workflowStateField && item.workflow_state) {
        row[workflowStateField] = item.workflow_state;
      }
      return row;
    });
    form.dirty();
    form.refresh_field(tableField);
    form.save();
    console.log(`Tabela '${tableField}' sincronizada.`);
  },

  add_row: async function(form: any, child_doctype: string, fields_record: any) {
    const snake_child_doctype = this.to_snake_case(child_doctype);
    const child = form.add_child(snake_child_doctype, fields_record);
    form.dirty(); // Mark as dirty to make sure the changes will be saved
    form.refresh_field(snake_child_doctype);
    await form.save();
    return child;
  },

  add_rows: async function(form: any, child_doctype: string, fields_record_arr: any[]) {
    const snake_child_doctype = this.to_snake_case(child_doctype);
    const children: any[] = [];
    fields_record_arr.forEach((fields_record: any) => {
      const child = form.add_child(snake_child_doctype, fields_record);
      children.push(child);
    });
    form.dirty(); // Mark as dirty to make sure the changes will be saved
    form.refresh_field(snake_child_doctype);
    await form.save();
    return children;
  },

  update_row: async function(frm: any, fields_record: Record<string, string | number | null>) {
    // For child table rows, use the doctype directly, fallback to parenttype if doctype is not available
    const doctype_to_use = frm.doctype || frm.parenttype || 'Unknown';
    Object.entries(fields_record).forEach(async ([fieldname, value]) => {
      frappe.model.set_value(doctype_to_use, frm.name, fieldname, value);
    });
  },

  delete_row: async function(_form: any, child_doctype: string, docname: string) {
    frappe.model.clear_doc(child_doctype, docname);
  },

  get_row: function(form: any, child_doctype: string, filters: Record<string, any>) {
    const snake_case_doctype = this.to_snake_case(child_doctype);
    const childTable = form.doc[snake_case_doctype] as unknown as Array<Record<string, any>>;
    if (!childTable) return;
    return childTable.find(row => {
      for (const [k, v] of Object.entries(filters)) {
        if (row[k] !== v) return false;
      }
      return true;
    });
  },

  get_rows: function(form: any, child_doctype: string, filters: Record<string, any>) {
    const snake_case_doctype = this.to_snake_case(child_doctype);
    const childTable = form.doc[snake_case_doctype] as unknown as Array<Record<string, any>>;
    if (!childTable) return [];
    return childTable.filter(row => {
      for (const [k, v] of Object.entries(filters)) {
        if (row[k] !== v) return false;
      }
      return true;
    });
  },

  update_last_row: async function(
    form: any,
    child_doctype: string,
    fields_record: Record<string, string | number | null>
  ) {
    const lastRow = this.get_last_row(form, child_doctype);
    if (!lastRow) return;
    await this.update_row(lastRow, fields_record);
  },

  get_last_row: function(form: any, child_doctype: string) {
    // Convert to snake_case if not already in that format
    const snake_case_doctype = this.to_snake_case(child_doctype);

    const childTable = form.doc[snake_case_doctype];
    if (!childTable) return;

    return childTable[childTable.length - 1];
  },

  to_snake_case: function(str: string) {
    // Replace spaces with underscores
    str = str.replace(/\s+/g, '_');
    // Convert PascalCase/CamelCase to snake_case
    str = str.replace(/([a-z])([A-Z])/g, '$1_$2');
    return str.toLowerCase();
  },

  to_pascal_case_spaced: function(str: string) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before uppercase letters in camelCase
      .replace(/[^a-zA-Z0-9 ]/g, ' ') // Replace non-alphanumeric characters with spaces
      .split(/\s+/) // Split by spaces
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
      .join(' '); // Join with spaces
  },

  workflow_transition: async function(
    form: any,
    action: string,
    callback?: ((f: any) => void) | ((f: any) => Promise<void>)
  ) {
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
  },

  update_workflow_state: async function(params: {
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
  },

  refresh_force: async function() {
    frappe.model.clear_doc(cur_frm.doc.doctype, cur_frm.doc.name);
    return await agt.utils.get_doc(cur_frm.doc.doctype, cur_frm.doc.name)
      .then((doc: any) => {
        cur_frm.states.frm.refresh(); // Refresh the form
        return doc;
      })
      .catch(() => {
        console.error('Error refreshing document');
        return undefined;
      });
  },

  createdDialogs: [],

  // load_dialog(diagConfig: DialogConfiguration) {
  //   const dialog = new frappe.ui.Dialog(diagConfig);
  //   this.createdDialogs.push(dialog);
  //   this.refresh_dialog_stacking();
  //   dialog.show();
  //   return dialog;
  // },

  load_dialog: function(diagConfig: any) {
    const dialog = new frappe.ui.Dialog(diagConfig);

    // Adiciona ao array de diálogos antes de mostrar
    this.createdDialogs.push(dialog);

    // Configura evento para quando o diálogo fechar (via "×" ou ESC)
    $(dialog.wrapper).on('hidden.bs.modal', () => {
      const index = this.createdDialogs.indexOf(dialog);
      if (index > -1) {
        this.createdDialogs.splice(index, 1);
        this.refresh_dialog_stacking();
      }
    });

    // Mostra o diálogo
    dialog.show();

    // Aplica z-index após o diálogo estar visível
    setTimeout(() => this.refresh_dialog_stacking(), 50);

    return dialog;
  },

  // close_all_dialogs() {
  //   this.createdDialogs.forEach(dialog => dialog.hide());
  // },

  // close_dialog_by_title(title: string) {
  //   const dialog = this.createdDialogs.find(d => d.title === title);
  //   dialog && dialog.hide();
  // },

  close_all_dialogs: function() {
    // Captura os diálogos antes de fechá-los
    const dialogs = [...this.createdDialogs];

    // Fecha cada diálogo
    dialogs.forEach((dialog: any) => {
      dialog.hide();
      // Remova o backdrop manualmente
      const $backdrop = $(dialog.wrapper).data("bs.modal")?.$backdrop;
      $backdrop?.remove();
    });

    // Limpa o array
    this.createdDialogs = [];
  },

  close_dialog_by_title: function(title: string) {
    const dialogIndex = this.createdDialogs.findIndex((d: any) => d.title === title);
    if (dialogIndex >= 0) {
      const dialog = this.createdDialogs[dialogIndex];
      dialog.hide();

      // Remova o backdrop manualmente
      const $backdrop = $(dialog.wrapper).data("bs.modal")?.$backdrop;
      $backdrop?.remove();

      // Remove o diálogo da lista
      this.createdDialogs.splice(dialogIndex, 1);

      // Reaplica o z-index para os diálogos restantes
      this.refresh_dialog_stacking();
    }
  },

  find_on_child_table: function(
    form: any,
    child_doctype: string,
    filters: { or?: Record<string, any>; and?: Record<string, any> }
  ): any[] {
    const childTable = form.doc[child_doctype] as unknown as Array<Record<string, any>>;
    if (!childTable) return [];
    return childTable.filter(row => {
      if (!filters.and && !filters.or) return false;
      if (filters.and) {
        for (const [k, v] of Object.entries(filters.and)) {
          if (row[k] !== v) return false;
        }
      }
      if (filters.or) {
        for (const [k, v] of Object.entries(filters.or)) {
          if (Array.isArray(v) && v.includes(row[k])) return true;
          if (row[k] === v) return true;
        }
      }
      return true;
    });
  },

  transport_values: function(targetForm: any, field: string) {
    if (!agt.src_frm) return;
    if (!targetForm.doc.__islocal) return;

    const fieldNames = targetForm.meta.fields.map((f: any) => f.fieldname);
    Object.entries(agt.src_frm.fields_dict).forEach(([key, field]: any) => {
      if (!this.is_valid(field.value)) return;
      if (!fieldNames.includes(key)) return;
      if (targetForm.doc[key] === field.value) return;
      console.log(`Setting ${key} to ${field.value}`);
      targetForm.set_value(key, field.value);
    });
    targetForm.set_value([field], agt.src_frm.docname);
    targetForm.save();
  },

  get_growatt_sn_info: async function(serial_no: string) {
    const sn = await frappe.call({
      method: 'get_growatt_sn_info',
      args: { deviceSN: serial_no }
    });
    const fail = !sn || !sn.message?.code || sn.message.code !== 200;
    if (fail) return undefined;
    return sn.message;
  },

  get_js_visible_fields: function(form: any) {
    const visible_fields: any[] = [];
    for (let field of Object.values(form.fields_dict) as any[]) {
      if (['Table', 'Section Break', 'Column Break', 'HTML', 'Fold'].includes(field.df.fieldtype)) continue;
      if (!field.df.depends_on) continue;
      const depends_on_json_fnc = field.df.depends_on.replace('eval:', '') as string;
      const is_visible = frappe.utils.eval(depends_on_json_fnc, {
        doc: form.doc
      });
      if (is_visible) visible_fields.push(field);
    }
    return visible_fields;
  },

  validate_js_visible_fields: function(form: any, workflow_state: string) {
    const js_visible_fields = this.get_js_visible_fields(form);
    const title = __('Atenção!');
    const indicator = 'red';
    function validate_js_visible_fields_msg(fields: any[]) {
      const throw_html: string[] = [];
      for (let field of fields as any[]) {
        throw_html.push(`<li>${field.df.label}<li>`);
      }
      const msg = `<p>${__('⚠️ Os campos abaixo são obrigatórios: ')}</p>` + `<ul>${throw_html.join('')}</ul>`;
      return msg;
    }
    const throw_error = () => {
      if (workflow_state !== form.doc.workflow_state) return;
      if (!js_visible_fields.length) return;
      const message = validate_js_visible_fields_msg(js_visible_fields);
      frappe.throw({ title, message, indicator });
    };
    const msgprint = () => {
      if (workflow_state !== form.doc.workflow_state) return;
      if (!js_visible_fields.length) return;
      const message = validate_js_visible_fields_msg(js_visible_fields);
      frappe.msgprint({ title, message, indicator });
    };
    return { throw_error, msgprint };
  },

  get_item_info: async function(item_name: string, sn?: string) {
    const all_items = await frappe.db
      .get_list('Item', {
        fields: ['item_code', 'custom_mppt', 'item_name'],
      })
      .catch((e: any) => console.error(e));

    if (!all_items || !all_items.length) return;

    // Busca flexível usando normalize_text apenas com item_name
    const normalizedInput = agt.utils.normalize_text(item_name);
    const filtered_items = all_items.filter((item: any) =>
      agt.utils.normalize_text(item.item_name) === normalizedInput
    );

    if (!filtered_items.length) return;
    // Se só existe um MPPT, retorna direto
    const uniqueMppts = [...new Set(filtered_items.map((item: any) => item.custom_mppt))];
    if (uniqueMppts.length === 1) return filtered_items[0];

    // Se há mais de um MPPT, mostra o diálogo para seleção
    const dialog_title = `Selecione a quantidade de MPPTs (${item_name}${sn ? ` - ${sn}` : ''})`;
    return new Promise<any>(resolve => {
      agt.utils.load_dialog({
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
          const item = filtered_items.find((item: any) => item.custom_mppt === mppt);
          agt.utils.close_dialog_by_title(dialog_title);
          resolve(item); // Resolve o item selecionado
        }
      });
    });
  },

  // refresh_dialog_stacking() {
  //   if (typeof $ === 'undefined') {
  //     console.error('jQuery is not loaded. Unable to refresh dialog stacking.');
  //     return;
  //   }
  //   $('.modal')?.each(function (index) {
  //     $(this).css('z-index', 1051 + index);
  //   });
  //   $('.modal-backdrop')?.each(function (index) {
  //     $(this).css('z-index', 1050 + index);
  //   });
  // },

  refresh_dialog_stacking: function() {
    if (typeof $ === 'undefined') {
      console.error('jQuery is not loaded. Unable to refresh dialog stacking.');
      return;
    }

    // Base z-index para modal e backdrop
    const baseModalIndex = 1051;
    const baseBackdropIndex = 1050;

    // Para cada diálogo em ordem de criação
    this.createdDialogs.forEach((dialog: any, index: number) => {
      // Verifica se o diálogo está visível
      if ($(dialog.wrapper).is(':visible')) {
        // Configura z-index com incremento para cada diálogo
        const zIndex = baseModalIndex + (index * 2);

        // Aplica ao modal
        $(dialog.wrapper).css('z-index', zIndex);

        // Encontra e aplica ao backdrop correspondente
        const modalId = $(dialog.wrapper).attr('id');
        $(`.modal-backdrop[data-modal-id="${modalId}"]`).css('z-index', baseBackdropIndex + (index * 2));

        // Associa ID do modal ao backdrop para facilitar a correspondência
        const $backdrop = $(dialog.wrapper).data("bs.modal")?.$backdrop;
        if ($backdrop && !$backdrop.attr('data-modal-id')) {
          $backdrop.attr('data-modal-id', modalId);
        }
      }
    });
  },

  assign_parent_doc_name: function(_form: any) {
    // if (!form?.doc || form.doc.__islocal) return;

    // const meta = frappe.get_meta?.(form.doc.doctype);
    // const hasField = meta?.fields?.some(f => f.fieldname === "ref_naming_series");

    // if (hasField && !form.doc.ref_naming_series && form.doc.name) {
    //   form.set_value("ref_naming_series", form.doc.name);
    // }
  },
  adjust_html_elements: function(form: any, options: any): void {
    // if (!form?.doc || form.doc.__islocal) return;
    if (!form?.doc) return;

    const elementsToRemove = {
      removeTabs: '.form-tabs-list',
      removeNavFormsTabs: '.nav.form-tabs',
      removeSidebar: '.col-lg-2.layout-side-section',
      removeAssignments: '.form-assignments',
      removeAssignmentsButton: '.button.add-assignments-btn',
      removeAttachments: '.form-attachments',
      removeAttachmentsButton: '.button.add-attachments-btn',
      removeShared: '.form-shared',
      removeTags: '.form-tags',
      removeSidebarStats: '.form-sidebar-stats',
      removeSidebarMenu: '.list-unstyled.sidebar-menu.text-muted',
      removeSidebarReset: 'button.btn-reset.sidebar-toggle-btn',
      removeSidebarToggle: 'span.sidebar-toggle-btn',
      removeActivityBar: '.form-footer',
    };

    Object.entries(elementsToRemove).forEach(([option, selector]) => {
      if (options[option as keyof typeof options]) {
        const el = document.querySelector(selector);
        if (el) {
          (el as HTMLElement).style.display = 'none';
          el.remove();
        }
      }
    });
    if (options.removeTabs && !document.querySelector('.form-tabs-list')) {
      document.querySelector('.form-layout')?.setAttribute('style', 'border-top: none');
    }
  },
  /**
   * Configura propriedades customizadas para uma tabela (child table)
   * @param frm - Formulário do Frappe
   * @param options - Opções de configuração (hide_add_row, hide_remove_row, etc.)
   * @param fieldname - Nome do campo da tabela
   * @param add_row_label - Texto personalizado para o botão "Add Row"
   * @param default_values - Array de objetos com valores padrão para novas linhas
   * @param apply_only_first - Se true, aplica valores padrão apenas na primeira inserção; se false, aplica em todas
   * 
   * Exemplo de uso com valores padrão:
   * ```
   * // Aplica valores padrão em todas as inserções
   * await growatt.utils.set_table_custom_properties(frm, options, 'items', 'Adicionar Item', [
   *   { item_code: 'ITEM001', qty: 1, rate: 100 },  // Valores para linha 1
   *   { item_code: 'ITEM002', qty: 2, rate: 200 },  // Valores para linha 2
   *   { item_code: 'DEFAULT', qty: 1, rate: 0 }     // Valores padrão para demais linhas
   * ], false);
   * 
   * // Aplica valores padrão apenas na primeira inserção
   * await growatt.utils.set_table_custom_properties(frm, options, 'items', 'Adicionar Item', [
   *   { item_code: 'FIRST_ITEM', qty: 1, rate: 100 }
   * ], true);
   * ```
   */
  set_table_custom_properties: async function(frm: any, options: any, fieldname: string, add_row_label?: string, default_values?: Record<string, any>[], apply_only_first?: boolean): Promise<void> {
    // if (!frm?.doc) return;
    const elementsToHide = {
      hide_add_row: '.grid-add-row',
      hide_remove_row: '.grid-remove-rows',
      hide_remove_all_rows: '.grid-remove-all-rows',
      hide_row_check: '.grid-row-check',
      hide_append_row: '.grid-append-row',
      hide_shortcuts: '.grid-shortcuts',
      hide_check: '.grid-body .grid-row .grid-row-check',
      hide_grid_delete_row: '.grid-delete-row',
      hide_grid_move_row: '.grid-move-row',
    };

    const field = frm.fields_dict[fieldname];
    if (!field?.grid?.wrapper) return;

    // Função para aplicar valores padrão a uma nova linha
    const applyDefaultValues = (rowDoc: any, rowIndex: number) => {
      if (!default_values || !Array.isArray(default_values)) return;

      // Se há valores padrão definidos
      if (default_values.length > 0) {
        // Se há múltiplas opções de valores padrão, usa o índice da linha para determinar qual usar
        // ou usa o último conjunto se o índice exceder o array
        const defaultSet = default_values[Math.min(rowIndex, default_values.length - 1)] || default_values[0];

        // Aplica os valores padrão ao documento da linha
        if (defaultSet) {
          Object.entries(defaultSet).forEach(([key, value]) => {
            if (rowDoc.hasOwnProperty(key) || rowDoc[key] === undefined) {
              rowDoc[key] = value;
            }
          });
        }
      }
    };

    // Função para aplicar as configurações de visibilidade
    const applyVisibilitySettings = () => {
      Object.entries(elementsToHide).forEach(([option, selector]) => {
        if (options[option as keyof typeof options] && field.grid && field.grid.wrapper) {
          field.grid.wrapper.find(selector).hide();
        }
      });

      if (options?.hide_config_columns === true) {
        {
          $(`div[data-fieldname="${fieldname}"] div.col.grid-static-col.d-flex.justify-content-center`).css({ 'visibility': 'hidden' });
          if (frm.fields_dict[fieldname]?.$wrapper) {
            frm.fields_dict[fieldname].$wrapper.find('div.col.grid-static-col.d-flex.justify-content-center').css({ 'visibility': 'hidden' });
          }
        };
      }
    };

    // Additional hook to capture specific grid events
    const gridObj = field.grid as any;
    if (gridObj && !gridObj._visibility_hooks_attached) {
      gridObj._visibility_hooks_attached = true;

      // Override add_new_row method if it exists
      if (typeof gridObj.add_new_row === 'function') {
        const originalAddNewRow = gridObj.add_new_row;
        gridObj.add_new_row = function (...args: any[]) {
          const result = originalAddNewRow.apply(this, args);

          // Aplica valores padrão à nova linha se foi criada
          if (result && default_values && Array.isArray(default_values) && default_values.length > 0) {
            const currentRows = frm.doc[fieldname] || [];
            const newRowIndex = currentRows.length - 1;

            // Verifica se deve aplicar valores padrão baseado no parâmetro apply_only_first
            const shouldApplyDefaults = apply_only_first === undefined || apply_only_first === false ||
              (apply_only_first === true && newRowIndex === 0);

            if (newRowIndex >= 0 && currentRows[newRowIndex] && shouldApplyDefaults) {
              applyDefaultValues(currentRows[newRowIndex], newRowIndex);
              // Refresh o grid para mostrar os valores aplicados
              setTimeout(() => {
                gridObj.refresh();
              }, 100);
            }
          }

          applyVisibilitySettings();
          return result;
        };
      }

      // Override the refresh method if it exists
      if (typeof gridObj.refresh === 'function') {
        const originalRefresh = gridObj.refresh;
        gridObj.refresh = function (...args: any[]) {
          const result = originalRefresh.apply(this, args);
          applyVisibilitySettings();
          return result;
        };
      }
    }

    if (options?.hidden !== undefined) {
      frm.set_df_property(fieldname, 'hidden', options.hidden ? 1 : 0);
    }

    if (options?.read_only !== undefined) {
      frm.set_df_property(fieldname, 'read_only', options.read_only ? 1 : 0);
    }
    if (options?.reqd !== undefined) {
      frm.set_df_property(fieldname, 'reqd', options.reqd ? 1 : 0);
    }
    if (options?.label !== undefined) {
      frm.set_df_property(fieldname, 'label', options.label);
    }
    if (options?.description !== undefined) {
      frm.set_df_property(fieldname, 'description', options.description);
    }
    if (options?.cannot_add_rows !== undefined) {
      frm.set_df_property(fieldname, 'cannot_add_rows', options.cannot_add_rows ? 1 : 0);
    }

    if (options?.cannot_delete_rows !== undefined) {
      frm.set_df_property(fieldname, 'cannot_delete_rows', options.cannot_delete_rows ? 1 : 0);
    }

    if (add_row_label && frm.fields_dict[fieldname] && frm.fields_dict[fieldname].grid) {
      frm.refresh_field(fieldname);
      const grid = frm.fields_dict[fieldname].grid;
      const btn = grid?.wrapper?.find('.grid-add-row');
      if (btn && btn.length) {
        btn.text(add_row_label);
      }
    }
  },
  render_doc_fields_table: async function(
    wrapper: any,
    docOrRows: any,
    fields: any[],
    meta?: any
  ): Promise<void> {
    if (!wrapper || !docOrRows || !fields?.length) {
      console.error('[render_doc_fields_table] Invalid arguments!');
      return;
    }
    const isTable = Array.isArray(docOrRows) || (
      typeof docOrRows === 'object' && docOrRows !== null && 'length' in docOrRows && typeof (docOrRows as any).length === 'number'
    );
    const arr: Record<string, unknown>[] = isTable
      ? Array.isArray(docOrRows)
        ? (docOrRows as unknown[]).filter((el): el is Record<string, unknown> => typeof el === 'object' && el !== null)
        : Array.from(docOrRows as any).filter((el: any): el is Record<string, unknown> => typeof el === 'object' && el !== null)
      : [];
    if (!meta) {
      const doctype = isTable && arr.length > 0 ? arr[0]?.['doctype'] : (docOrRows as any)?.['doctype'];
      if (doctype) meta = await frappe.get_meta?.(doctype as string);
    }
    const getFieldMeta = (field: { fieldname: string; label?: string }) => {
      const metaField = meta?.fields?.find((f: any) => f.fieldname === field.fieldname);
      return {
        label: field.label || metaField?.label || field.fieldname,
        fieldtype: metaField?.fieldtype || 'Data',
        options: metaField?.options
      };
    };
    const autoFormat = (value: unknown, fieldtype: string, options?: unknown): string => {
      if (value === null || value === undefined || value === '') return '<span class="text-muted">—</span>';
      switch (fieldtype) {
        case 'Link':
          if (options && value != null) {
            const slug = String(options).toLowerCase().replace(/\s+/g, '-');
            return `<a href="/app/${slug}/${encodeURIComponent(String(value))}" target="_blank">${String(value)}</a>`;
          }
          return String(value);
        case 'Select':
          return `<span class="badge badge-light">${value}</span>`;
        case 'Date':
        case 'Datetime':
          return frappe?.datetime?.str_to_user ? frappe.datetime.str_to_user(value as string) : String(value);
        case 'Currency':
        case 'Float':
        case 'Int':
          return (window as any).frappe?.format_value ? (window as any).frappe.format_value(value, { fieldtype }) : String(value);
        case 'Check':
          return value ? '<span class="text-success">✓ Sim</span>' : '<span class="text-danger">✗ Não</span>';
        default:
          return String(value);
      }
    };
    let rows = '';
    let thead = '';
    if (isTable) {
      if (arr.length === 0) {
        rows = `<tr><td colspan="${fields.length}" class="text-center text-muted">Nenhum dado encontrado.</td></tr>`;
      } else {
        rows = arr.map(row =>
          '<tr>' + fields.map(field => {
            const metaF = getFieldMeta(field);
            const value = row[field.fieldname];
            const displayValue = field.formatter ? field.formatter(value, row, metaF) : autoFormat(value, metaF.fieldtype, metaF.options);
            return `<td${metaF.fieldtype === 'Link' ? ' data-debug-link="true"' : ''}>${displayValue}</td>`;
          }).join('') + '</tr>'
        ).join('');
        thead = '<tr>' + fields.map(field => {
          const metaF = getFieldMeta(field);
          return `<th class="text-muted">${field.label || metaF.label || field.fieldname}</th>`;
        }).join('') + '</tr>';
      }
    } else {
      rows = fields.map(field => {
        const metaF = getFieldMeta(field);
        const value = (docOrRows as Record<string, unknown>)[field.fieldname];
        const displayValue = field.formatter ? field.formatter(value, docOrRows as Record<string, unknown>, metaF) : autoFormat(value, metaF.fieldtype, metaF.options);
        return `<tr><td>${field.label || metaF.label || field.fieldname}</td><td>${displayValue}</td></tr>`;
      }).join('');
    }
    const table_html = `<div class="form-section" style="margin-bottom: 16px;">
        <div class="table-responsive" style="border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden;">
          <table class="table table-bordered" style="margin: 0; border: none;">
            ${thead ? `<thead class="table-header">${thead}</thead>` : ''}
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>`;
    if (typeof (wrapper as { html: (html: string) => void }).html === 'function') {
      (wrapper as { html: (html: string) => void }).html(table_html);
    } else if (typeof window !== 'undefined' && (window as any).jQuery && wrapper instanceof (window as any).jQuery) {
      (wrapper as any).html(table_html);
    } else if (wrapper instanceof HTMLElement) {
      wrapper.innerHTML = table_html;
    }
  },
  filterJoin: async function(steps: any[]): Promise<any[]> {
    let results: any[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const filters = { ...step.filters };

      // For steps after the first one, add join conditions based on previous results
      if (i > 0 && step.joinOn && results.length > 0) {
        const joinValues = results.map((item: any) => item[step.joinOn!.sourceField]);
        filters[step.joinOn!.targetField] = ["in", joinValues];
      }
      if (step.joinOn && results.length === 0) {
        console.warn(`No results found for step ${i + 1}. Skipping further joins.`);

        break; // No results to join on, exit early

      }
      // Fetch data for current step
      const response = await frappe.call({
        method: "backend_get_all",
        args: {
          doctype: step.doctype,
          filters,
          fields: step.fields as string[],
        }
      });

      results = response.message.data || [];
    }

    return results;
  },
  show_debugger_alert: function(_frm: any, message: string, indicator: string, timeout: number = 10) {
    if (frappe.user.has_role(['IT', 'Administrator', 'System Manager'])) {
      frappe.show_alert({ message: __(message), indicator: indicator }, timeout);
    }
  },
  is_field_empty: function(value: string): boolean {
    if (!value) return true;
    const text = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    return text === '';
  },

  validate_cpf: (cpf: string): boolean => {
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
  },

  validate_cnpj: (cnpj: string): boolean => {
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
  },
  document_id: async function(frm: any, docField: string, typeField: string) {
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
      if (docType !== 'Pessoa Física' && docType !== 'Pessoa Jurídica' && docType !== null) {
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
        frm.set_df_property(docField, 'read_only', 0);
        frm.set_df_property(docField, 'hidden', 0);
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
  },
  format_doc: (doc: string, type?: string): string => {
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
  },

  validate_zipcode: async function (
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
  },
  validate_cnpj_existence: async function (cnpj: string): Promise<boolean> {
    const digits = (cnpj || '').replace(/\D/g, '');
    if (digits.length !== 14) return false;

    try {
      const response = await frappe.call({
        method: 'check_cnpj',
        args: { cnpj: digits }
      });
      const data = response.message;
      // Considera válido se não houver erro e o CNPJ retornado for igual ao consultado
      return !!data && !!data.cnpj && data.cnpj.replace(/\D/g, '') === digits;
    } catch (e) {
      return false;
    }
  },
  redirect_by_ref(ref?: string, title?: string, message?: string, indicator?: string, url?: string, delay = 3000, newTab = true) {
    if (!ref) return;

    frappe.msgprint({
      title: title,
      message: message ?? "",
      indicator: indicator
    });

    setTimeout(() => {
      if (newTab) {
        window.open(url, '_blank');
      } else {
        window.location.href = url || '';
      }
    }, delay);
  },
  make_field_link(frm: any, fieldName: string, docType: string) {
    const field = frm.fields_dict[fieldName];
    if (field && field.df.read_only && field.$wrapper) {
      const $wrapper = field.$wrapper;
      $wrapper.css("position", "relative");
      $wrapper.find(".serial-link-mask").remove();
      $wrapper.append(
        `<a class="serial-link-mask" href="/app/${docType}/${frm.doc[fieldName]}" target="_blank"
          style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;z-index:10;cursor:pointer;"></a>`
      );
    }
  },

  validate_phone: function(frm: any, phoneField: string): Promise<void> {
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
  },

  child_table_custom_add_row: (frm: any, fieldname: string, label: string) => {
    if (frm.fields_dict[fieldname] && frm.fields_dict[fieldname].grid) {
      frm.refresh_field(fieldname);
      const grid = frm.fields_dict[fieldname].grid;
      const btn = grid?.wrapper?.find('.grid-add-row');
      if (btn && btn.length) {
        btn.text(label);
      }
    }
  },

  set_button_primary_style(frm: any, fieldname: string): void {
    const field = frm.fields_dict[fieldname];
    if (!field?.$input) {
      console.warn(`Campo '${fieldname}' não encontrado ou não é um botão válido.`);
      return;
    }

    if (field.df.fieldtype === 'Button') {
      const $button = field.$input;
      if ($button && $button.length) {
        $button.removeClass('btn-default btn-secondary btn-success btn-warning btn-danger btn-info btn-light btn-dark');
        $button.addClass('btn-primary');
      }
    } else {
      console.warn(`Campo '${fieldname}' não é do tipo Button.`);
    }
  },
  get_value_from_any_doc: async function(
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
  },
}