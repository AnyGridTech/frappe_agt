frappe.provide('agt.utils.table');
frappe.provide('agt.utils.table.row');

// Temporary fix for TypeScript issues - use any type for agt.utils
declare const agt: any;

agt.utils.table.row.add_one = async function<T>(form: any, child_doctype: string, fields_record: T): Promise<T> {
  const snake_child_doctype = agt.utils.text.to_snake_case(child_doctype);
  const child = form.add_child(snake_child_doctype, fields_record);
  form.dirty(); // Mark as dirty to make sure the changes will be saved
  form.refresh_field(snake_child_doctype);
  await form.save();
  return child as T;
};

agt.utils.table.row.add_many = async function<T>(form: any, child_doctype: string, fields_record_arr: T[]): Promise<T[]> {
  const snake_child_doctype = agt.utils.text.to_snake_case(child_doctype);
  const children: T[] = [];
  fields_record_arr.forEach((fields_record: T) => {
    const child = form.add_child(snake_child_doctype, fields_record);
    children.push(child as T);
  });
  form.dirty(); // Mark as dirty to make sure the changes will be saved
  form.refresh_field(snake_child_doctype);
  await form.save();
  return children;
};

agt.utils.table.row.update_one = async function(frm: any, fields_record: Record<string, string | number | null>) {
  // For child table rows, use the doctype directly, fallback to parenttype if doctype is not available
  const doctype_to_use = frm.doctype || frm.parenttype || 'Unknown';
  await Promise.all(
    Object.entries(fields_record).map(([fieldname, value]) =>
      frappe.model.set_value(doctype_to_use, frm.name, fieldname, value)
    )
  );
};

agt.utils.table.row.delete_one = async function(_form: any, child_doctype: string, docname: string) {
  frappe.model.clear_doc(child_doctype, docname);
};

agt.utils.table.row.get_one = function<T>(form: any, child_doctype: string, filters: Record<string, any>): T | undefined {
  const snake_case_doctype = agt.utils.text.to_snake_case(child_doctype);
  const childTable = form.doc[snake_case_doctype] as unknown as Array<Record<string, any>>;
  if (!childTable) return;
  return childTable.find(row => {
    for (const [k, v] of Object.entries(filters)) {
      if (row[k] !== v) return false;
    }
    return true;
  }) as T | undefined;
};

agt.utils.table.row.get_last = function<T>(form: any, child_doctype: string): T | undefined {
  // Convert to snake_case if not already in that format
  const snake_case_doctype = agt.utils.text.to_snake_case(child_doctype);

  const childTable = form.doc[snake_case_doctype];
  if (!childTable) return;

  return childTable[childTable.length - 1] as T | undefined;
};

agt.utils.table.row.find = function(
  form: any,
  child_doctype: string,
  filters: { or?: Record<string, any>; and?: Record<string, any> }
) {
  const snake_case_doctype = agt.utils.text.to_snake_case(child_doctype);
  const childTable = form.doc[snake_case_doctype] as unknown as Array<Record<string, any>>;
  if (!childTable) return [];
  return childTable.filter(row => {
    if (!filters.and && !filters.or) return false;
    
    let andPassed = true;
    let orPassed = false;
    
    if (filters.and) {
      for (const [k, v] of Object.entries(filters.and)) {
        if (row[k] !== v) {
          andPassed = false;
          break;
        }
      }
    }
    
    if (filters.or) {
      for (const [k, v] of Object.entries(filters.or)) {
        if (Array.isArray(v) && v.includes(row[k])) {
          orPassed = true;
          break;
        }
        if (row[k] === v) {
          orPassed = true;
          break;
        }
      }
    } else {
      orPassed = true; // If there are no OR filters, consider as true
    }
    
    return andPassed && orPassed;
  });
};

agt.utils.table.row.update_last = async function(
  form: any,
  child_doctype: string,
  fields_record: Record<string, string | number | null>
) {
  const lastRow = agt.utils.table.row.get_last(form, child_doctype);
  if (!lastRow) return;
  await agt.utils.table.row.update_one(lastRow as any, fields_record);
};

agt.utils.table.is_sync = async function(current: any, remote: any, docname: any, workflowStateField?: string): Promise<boolean> {
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
};

agt.utils.table.set_custom_properties = async function(frm: any, options: any, fieldname: string, add_row_label?: string, default_values?: Record<string, any>[], apply_only_first?: boolean): Promise<void> {
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

  // Function to apply default values to a new row
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
          if (!(key in rowDoc) || rowDoc[key] === undefined) {
            rowDoc[key] = value;
          }
        });
      }
    }
  };

  // Function to apply visibility settings
  const applyVisibilitySettings = () => {
    Object.entries(elementsToHide).forEach(([option, selector]) => {
      if (options[option as keyof typeof options] && field.grid && field.grid.wrapper) {
        field.grid.wrapper.find(selector).hide();
      }
    });

    if (options?.hide_config_columns === true) {
      $(`div[data-fieldname="${fieldname}"] div.col.grid-static-col.d-flex.justify-content-center`).css({ 'visibility': 'hidden' });
      if (frm.fields_dict[fieldname]?.$wrapper) {
        frm.fields_dict[fieldname].$wrapper.find('div.col.grid-static-col.d-flex.justify-content-center').css({ 'visibility': 'hidden' });
      }
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
};

agt.utils.table.custom_add_row_button = function(frm: any, fieldname: string, label: string) {
  if (frm.fields_dict[fieldname] && frm.fields_dict[fieldname].grid) {
    frm.refresh_field(fieldname);
    const grid = frm.fields_dict[fieldname].grid;
    const btn = grid?.wrapper?.find('.grid-add-row');
    if (btn && btn.length) {
      btn.text(label);
    }
  }
};