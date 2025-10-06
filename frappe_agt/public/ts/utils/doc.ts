frappe.provide('agt.utils.doc');

agt.utils.doc.create_doc = async function(
  doctype: string,
  fields_target: string[],
  fields_dict: Record<string, any>
): Promise<string | undefined> {
  const meta = await agt.utils.doc.get_doc_meta(doctype);
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

  // Novo formato obrigatório: fields_target é um array de nomes de campos a copiar do cur_frm.doc
  for (const targetField of fields_target) {
    if (!valid_fields.includes(targetField)) continue;

    let value: any;
    if (targetField === "docname" && cur_frm?.docname) {
      value = cur_frm.docname;
    } else if (cur_frm?.doc && targetField in cur_frm.doc) {
      value = (cur_frm.doc as any)[targetField];
    }

    if (value !== undefined) {
      fields_record[targetField] = value;
    }
  }

  // Filtra apenas fields válidos
  const valid_updates: Record<string, any> = {};
  for (const [fieldname, field] of Object.entries(fields_record)) {
    if (!valid_fields.includes(fieldname)) continue;
    // Simple validation: skip empty/null/undefined values
    if (field === undefined || field === null || field === '') continue;
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
};

agt.utils.doc.update_doc = async function(
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
      return await agt.utils.doc.update_doc(doctype, docname, fields_record, retryCount + 1);
    } else {
      console.error(`Error saving document '${docname}':`, error);
    }
  }
};

agt.utils.doc.get_doc = async function(doctype: string, docname: string) {
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
};

agt.utils.doc.share_doc = async function(doctype: string, docname: string, users: any[]) {
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
};

agt.utils.doc.get_doc_meta = async function(doctype: string) {
  await frappe.model.with_doctype(doctype);
  return frappe.get_meta(doctype);
};