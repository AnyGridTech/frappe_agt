// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
frappe.provide("agt.utils.doc");
agt.utils.doc.create_doc = async function(doctype, fields_target, fields_dict) {
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
  }, {});
  const valid_fields = meta.fields.map((field) => field.fieldname);
  for (const [targetField, sourceField] of Object.entries(fields_target)) {
    if (!valid_fields.includes(targetField)) continue;
    let value;
    if (sourceField === "docname" && cur_frm?.docname) {
      value = cur_frm.docname;
    } else if (cur_frm?.doc && sourceField in cur_frm.doc) {
      value = cur_frm.doc[sourceField];
    }
    if (value !== void 0) {
      fields_record[targetField] = value;
    }
  }
  const valid_updates = {};
  for (const [fieldname, field] of Object.entries(fields_record)) {
    if (!valid_fields.includes(fieldname)) continue;
    if (field === void 0 || field === null || field === "") continue;
    valid_updates[fieldname] = field;
  }
  if (Object.keys(valid_updates).length === 0) {
    frappe.throw(`No valid fields to create the document: ${doctype}`);
    return;
  }
  const doc = frappe.model.get_new_doc(doctype);
  for (const [name, value] of Object.entries(valid_updates)) {
    if (name === "workflow_state" || name === "naming_series") continue;
    doc[name] = value;
  }
  const r1 = await frappe.db.insert(doc).catch((e) => console.error(e));
  return r1?.name;
};
agt.utils.doc.update_doc = async function(doctype, docname, fields_record, retryCount = 0) {
  const maxRetries = 3;
  if (retryCount >= maxRetries) {
    console.error(`Max retries (${maxRetries}) reached. Aborting update.`);
    return;
  }
  try {
    const doc = await frappe.db.get_doc(doctype, docname).catch((e) => console.error(e));
    if (!doc) {
      console.error(`Document '${docname}' not found.`);
      return;
    }
    const valid_updates = {};
    const ignore_fields = ["workflow_state", "naming_series", "creation", "doctype", "modified", "name", "owner"];
    for (const [f, v] of Object.entries(fields_record)) {
      if (ignore_fields.includes(f) && doctype !== "Serial No") continue;
      if (doc[f] === void 0) continue;
      if (doc[f] === v) continue;
      if (doc[f] === null && v === "") continue;
      if (doc[f] === "" && v === null) continue;
      console.log(`[${doctype} - ${docname}] Setting ${f} to ${v}`);
      doc[f] = v;
      valid_updates[f] = v;
    }
    if (Object.keys(valid_updates).length === 0) {
      console.log(`[${doctype} - ${docname}] No valid fields to update`);
      return;
    }
    await frappe.call({
      method: "frappe.client.save",
      args: { doc }
    });
    if (doctype === cur_frm.doctype && docname === cur_frm.docname) {
      const updatedDoc = await frappe.call({
        method: "frappe.client.get",
        args: { doctype, name: docname }
      }).then(({ message }) => message);
      frappe.model.sync([updatedDoc]);
      cur_frm.states.frm.refresh();
    }
    console.log(`Document '${docname}' updated successfully.`);
  } catch (error) {
    if (error?.message?.includes("Document has been modified after you have opened it")) {
      console.warn("Timestamp mismatch detected. Refetching document...");
      return await agt.utils.doc.update_doc(doctype, docname, fields_record, retryCount + 1);
    } else {
      console.error(`Error saving document '${docname}':`, error);
    }
  }
};
agt.utils.doc.get_doc = async function(doctype, docname) {
  return await frappe.call({
    method: "frappe.client.get",
    args: { doctype, name: docname }
  }).then(async (doc) => {
    frappe.model.clear_doc(doctype, docname);
    frappe.model.sync([doc.message]);
    cur_frm.states.frm.refresh();
    return doc.message;
  });
};
agt.utils.doc.share_doc = async function(doctype, docname, users) {
  const shared_users = await frappe.call({
    method: "frappe.share.get_users",
    args: { doctype, name: docname }
  }).then(({ message }) => message);
  for (const user of users) {
    const shared = shared_users.find((u) => u.user === user.user);
    if (shared?.read === user.read && shared?.write === user.write && shared?.share === user.share) {
      console.log(`Document '${docname}' already shared with user '${user.user}'`);
      continue;
    }
    await frappe.call({
      method: "frappe.share.add",
      args: {
        doctype,
        name: docname,
        user: user.user,
        read: user.read,
        write: user.write,
        share: user.share,
        owner: user.owner || frappe.session.user_email
      }
    }).then(() => console.log(`Document '${docname}' shared with user '${user.user}'`));
  }
};
agt.utils.doc.get_doc_meta = async function(doctype) {
  await frappe.model.with_doctype(doctype);
  return frappe.get_meta(doctype);
};
