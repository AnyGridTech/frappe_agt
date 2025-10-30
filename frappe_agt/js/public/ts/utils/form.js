frappe.provide('agt.utils.form');
frappe.provide('agt.utils.form.field');
agt.utils.form.field.is_empty = function (value) {
    if (!value)
        return true;
    const text = value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
    return text === '';
};
agt.utils.form.field.set_properties = function (frm, configs) {
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
};
agt.utils.form.field.get_js_visible_fields = function (form) {
    const visible_fields = [];
    for (let field of Object.values(form.fields_dict)) {
        if (['Table', 'Section Break', 'Column Break', 'HTML', 'Fold'].includes(field.df.fieldtype))
            continue;
        if (!field.df.depends_on)
            continue;
        const depends_on_json_fnc = field.df.depends_on.replace('eval:', '');
        const is_visible = frappe.utils.eval(depends_on_json_fnc, {
            doc: form.doc
        });
        if (is_visible)
            visible_fields.push(field);
    }
    return visible_fields;
};
agt.utils.form.field.validate_js_visible_fields = function (form, workflow_state) {
    const js_visible_fields = agt.utils.form.field.get_js_visible_fields(form);
    const title = __('Atenção!');
    const indicator = 'red';
    function validate_js_visible_fields_msg(fields) {
        const throw_html = [];
        for (let field of fields) {
            throw_html.push(`<li>${field.df.label}</li>`);
        }
        const msg = `<p>${__('⚠️ Os campos abaixo são obrigatórios: ')}</p>` + `<ul>${throw_html.join('')}</ul>`;
        return msg;
    }
    const throw_error = () => {
        if (workflow_state !== form.doc.workflow_state)
            return;
        if (!js_visible_fields.length)
            return;
        const message = validate_js_visible_fields_msg(js_visible_fields);
        frappe.throw({ title, message, indicator });
    };
    const msgprint = () => {
        if (workflow_state !== form.doc.workflow_state)
            return;
        if (!js_visible_fields.length)
            return;
        const message = validate_js_visible_fields_msg(js_visible_fields);
        frappe.msgprint({ title, message, indicator });
    };
    return { throw_error, msgprint };
};
agt.utils.form.field.turn_into_link = function (frm, fieldName, docType) {
    const field = frm.fields_dict[fieldName];
    if (field && field.df.read_only && field.$wrapper) {
        const $wrapper = field.$wrapper;
        $wrapper.css("position", "relative");
        $wrapper.find(".serial-link-mask").remove();
        $wrapper.append(`<a class="serial-link-mask" href="/app/${docType}/${encodeURIComponent(frm.doc[fieldName])}" target="_blank"
        style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;z-index:10;cursor:pointer;"></a>`);
    }
};
agt.utils.form.mirror_checklist_table = async function (form, doctype, tableField, childname, docname, workflowStateField) {
    const name = form.doc.name;
    const fields = ['name'];
    if (workflowStateField)
        fields.push('workflow_state');
    const remote = await frappe.db.get_list(doctype, {
        filters: { [childname]: name },
        fields: fields
    }).catch((e) => { console.error(`Error fetching ${doctype}:`, e); return []; });
    const currentTable = (form.doc[tableField] || []);
    let needsUpdate = !await agt.utils.table.is_sync(currentTable, remote, docname, workflowStateField);
    if (!needsUpdate) {
        console.log(`Tabela '${tableField}' já está sincronizada.`);
        return;
    }
    form.doc[tableField] = remote.map((item) => {
        const row = { [docname]: item.name };
        if (workflowStateField && item.workflow_state) {
            row[workflowStateField] = item.workflow_state;
        }
        return row;
    });
    form.dirty();
    form.refresh_field(tableField);
    await form.save();
    console.log(`Tabela '${tableField}' sincronizada.`);
};
agt.utils.form.assign_parent_doc_name = function (_form) {
};
agt.utils.form.adjust_html_elements = function (form, options) {
    if (!form?.doc)
        return;
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
        if (options[option]) {
            const el = document.querySelector(selector);
            if (el) {
                el.style.display = 'none';
                el.remove();
            }
        }
    });
    if (options.removeTabs && !document.querySelector('.form-tabs-list')) {
        document.querySelector('.form-layout')?.setAttribute('style', 'border-top: none');
    }
};
agt.utils.form.render_doc_fields_table = async function (wrapper, docOrRows, fields, meta) {
    if (!wrapper || !docOrRows || !fields?.length) {
        console.error('[render_doc_fields_table] Invalid arguments!');
        return;
    }
    const isTable = Array.isArray(docOrRows) || (typeof docOrRows === 'object' && docOrRows !== null && 'length' in docOrRows && typeof docOrRows.length === 'number');
    const arr = isTable
        ? Array.isArray(docOrRows)
            ? docOrRows.filter((el) => typeof el === 'object' && el !== null)
            : Array.from(docOrRows).filter((el) => typeof el === 'object' && el !== null)
        : [];
    if (!meta) {
        const doctype = isTable && arr.length > 0 ? arr[0]?.['doctype'] : docOrRows?.['doctype'];
        if (doctype)
            meta = await frappe.get_meta?.(doctype);
    }
    const escapeHtml = (value) => {
        if (value === null || value === undefined)
            return '';
        const str = String(value);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    };
    const getFieldMeta = (field) => {
        const metaField = meta?.fields?.find((f) => f.fieldname === field.fieldname);
        return {
            label: field.label || metaField?.label || field.fieldname,
            fieldtype: metaField?.fieldtype || 'Data',
            options: metaField?.options
        };
    };
    const autoFormat = (value, fieldtype, options) => {
        if (value === null || value === undefined || value === '')
            return '<span class="text-muted">—</span>';
        switch (fieldtype) {
            case 'Link':
                if (options && value != null) {
                    const slug = String(options).toLowerCase().replace(/\s+/g, '-');
                    const escapedValue = escapeHtml(value);
                    return `<a href="/app/${escapeHtml(slug)}/${encodeURIComponent(String(value))}" target="_blank">${escapedValue}</a>`;
                }
                return escapeHtml(value);
            case 'Select':
                return `<span class="badge badge-light">${escapeHtml(value)}</span>`;
            case 'Date':
            case 'Datetime':
                const dateValue = frappe?.datetime?.str_to_user ? frappe.datetime.str_to_user(value) : String(value);
                return escapeHtml(dateValue);
            case 'Currency':
            case 'Float':
            case 'Int':
                const formattedValue = window.frappe?.format_value ? window.frappe.format_value(value, { fieldtype }) : String(value);
                return escapeHtml(formattedValue);
            case 'Check':
                return value ? '<span class="text-success">✓ Sim</span>' : '<span class="text-danger">✗ Não</span>';
            default:
                return escapeHtml(value);
        }
    };
    let rows = '';
    let thead = '';
    if (isTable) {
        if (arr.length === 0) {
            rows = `<tr><td colspan="${fields.length}" class="text-center text-muted">Nenhum dado encontrado.</td></tr>`;
        }
        else {
            rows = arr.map(row => '<tr>' + fields.map(field => {
                const metaF = getFieldMeta(field);
                const value = row[field.fieldname];
                const displayValue = field.formatter ? field.formatter(value, row, metaF) : autoFormat(value, metaF.fieldtype, metaF.options);
                return `<td${metaF.fieldtype === 'Link' ? ' data-debug-link="true"' : ''}>${displayValue}</td>`;
            }).join('') + '</tr>').join('');
            thead = '<tr>' + fields.map(field => {
                const metaF = getFieldMeta(field);
                const label = field.label || metaF.label || field.fieldname;
                return `<th class="text-muted">${escapeHtml(label)}</th>`;
            }).join('') + '</tr>';
        }
    }
    else {
        rows = fields.map(field => {
            const metaF = getFieldMeta(field);
            const value = docOrRows[field.fieldname];
            const displayValue = field.formatter ? field.formatter(value, docOrRows, metaF) : autoFormat(value, metaF.fieldtype, metaF.options);
            const label = field.label || metaF.label || field.fieldname;
            return `<tr><td>${escapeHtml(label)}</td><td>${displayValue}</td></tr>`;
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
    if (typeof wrapper.html === 'function') {
        wrapper.html(table_html);
    }
    else if (typeof window !== 'undefined' && window.jQuery && wrapper instanceof window.jQuery) {
        wrapper.html(table_html);
    }
    else if (wrapper instanceof HTMLElement) {
        wrapper.innerHTML = table_html;
    }
};
agt.utils.form.set_button_primary_style = function (frm, fieldname) {
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
    }
    else {
        console.warn(`Campo '${fieldname}' não é do tipo Button.`);
    }
};
agt.utils.form.transport_values = function (targetForm, field) {
    if (!agt.src_frm)
        return;
    if (!targetForm.doc.__islocal)
        return;
    const fieldNames = targetForm.meta.fields.map((f) => f.fieldname);
    Object.entries(agt.src_frm.fields_dict).forEach(([key, field]) => {
        if (!field.value || (typeof field.value === 'string' && field.value.trim() === ''))
            return;
        if (!fieldNames.includes(key))
            return;
        if (targetForm.doc[key] === field.value)
            return;
        console.log(`Setting ${key} to ${field.value}`);
        targetForm.set_value(key, field.value);
    });
    targetForm.set_value(field, agt.src_frm.docname);
    targetForm.save();
};
