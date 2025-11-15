// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
frappe.provide("agt.corrections_tracker_table");
agt.corrections_tracker.table = {
  async mirror_child_tracker_table(frm, doctypes, field) {
    const parent_doc_name = frm.doc.name;
    if (!parent_doc_name) return;
    if (!frm.fields_dict?.["child_tracker_table"]) {
      console.warn(`Campo 'child_tracker_table' n\xE3o encontrado no formul\xE1rio`);
      return;
    }
    const getDoctypeMeta = async (doctype) => {
      await frappe.model.with_doctype(doctype);
      const meta = frappe.get_meta ? frappe.get_meta(doctype) : frappe.meta && frappe.meta[doctype];
      const hasWorkflowState = !!(meta && Array.isArray(meta.fields) && meta.fields.some((f) => f.fieldname === "workflow_state"));
      return { meta, hasWorkflowState };
    };
    const fetchRelatedDocs = async (doctype, field2, parent_doc_name2, frm2) => {
      const { hasWorkflowState } = await getDoctypeMeta(doctype);
      const fieldsToFetch = hasWorkflowState ? ["name", "workflow_state"] : ["name"];
      const docs = await frappe.db.get_list(doctype, {
        filters: { [field2]: parent_doc_name2 },
        fields: fieldsToFetch
      });
      return docs.filter((doc) => doc.name !== frm2.doc.name).map((doc) => ({
        child_tracker_docname: doc.name,
        child_tracker_workflow_state: hasWorkflowState ? doc.workflow_state || "---" : "---",
        child_tracker_doctype: doctype
      }));
    };
    const isChildTrackerSynced = (current, remote) => {
      if (current.length !== remote.length) return false;
      const currentMap = new Map(current.map((row) => [`${row.child_tracker_docname}_${row.child_tracker_doctype}`, row]));
      const remoteMap = new Map(remote.map((r) => [`${r.child_tracker_docname}_${r.child_tracker_doctype}`, r]));
      const allDocsExist = current.every((row) => remoteMap.has(`${row.child_tracker_docname}_${row.child_tracker_doctype}`)) && remote.every((row) => currentMap.has(`${row.child_tracker_docname}_${row.child_tracker_doctype}`));
      if (!allDocsExist) return false;
      return !remote.some((remoteItem) => {
        const key = `${remoteItem.child_tracker_docname}_${remoteItem.child_tracker_doctype}`;
        const currentItem = currentMap.get(key);
        return currentItem && currentItem.child_tracker_workflow_state !== remoteItem.child_tracker_workflow_state;
      });
    };
    let allRelatedDocs = [];
    for (const doctype of doctypes) {
      try {
        const relatedDocs = await fetchRelatedDocs(doctype, field, parent_doc_name, frm);
        allRelatedDocs = allRelatedDocs.concat(relatedDocs);
      } catch (error) {
        console.error(`Error fetching ${doctype}:`, error);
        continue;
      }
    }
    const currentTable = frm.doc["child_tracker_table"] || [];
    const needsUpdate = !isChildTrackerSynced(currentTable, allRelatedDocs);
    if (!needsUpdate) {
      console.log(`Tabela 'child_tracker_table' j\xE1 est\xE1 sincronizada.`);
      return;
    }
    frm.doc["child_tracker_table"] = allRelatedDocs;
    frm.dirty();
    frm.refresh_field("child_tracker_table");
    await frm.save();
  }
};
