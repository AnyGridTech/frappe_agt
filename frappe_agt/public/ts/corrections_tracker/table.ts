import { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

frappe.provide('agt.corrections_tracker_table');

agt.corrections_tracker.table = {
  async mirror_child_tracker_table(frm: FrappeForm, doctypes: string[], field: string): Promise<void> {
    const parent_doc_name = frm.doc.name;
    if (!parent_doc_name) return;

    if (!frm.fields_dict?.['child_tracker_table']) {
      console.warn(`Campo 'child_tracker_table' não encontrado no formulário`);
      return;
    }

    // Função auxiliar para obter meta e verificar workflow_state
    const getDoctypeMeta = async (doctype: string) => {
      await frappe.model.with_doctype(doctype);
      const meta = frappe.get_meta
        ? frappe.get_meta(doctype)
        : ((frappe as any).meta && (frappe as any).meta[doctype]);
      const hasWorkflowState = !!(meta && Array.isArray(meta.fields) && meta.fields.some((f: any) => f.fieldname === 'workflow_state'));
      return { meta, hasWorkflowState };
    };

    // Função auxiliar para buscar docs relacionados
    const fetchRelatedDocs = async (doctype: string, field: string, parent_doc_name: string, frm: FrappeForm) => {
      const { hasWorkflowState } = await getDoctypeMeta(doctype);
      const fieldsToFetch = hasWorkflowState ? ['name', 'workflow_state'] : ['name'];
      const docs = await frappe.db.get_list(doctype, {
        filters: { [field]: parent_doc_name },
        fields: fieldsToFetch
      });
      return docs
        .filter((doc: any) => doc.name !== frm.doc.name)
        .map((doc: any) => ({
          child_tracker_docname: doc.name,
          child_tracker_workflow_state: hasWorkflowState ? (doc.workflow_state || '---') : '---',
          child_tracker_doctype: doctype,
        }));
    };

    // Função para verificar sincronização usando chave composta docname+doctype
    const isChildTrackerSynced = (current: Array<{ child_tracker_docname: string, child_tracker_workflow_state: string, child_tracker_doctype: string }>,
      remote: Array<{ child_tracker_docname: string, child_tracker_workflow_state: string, child_tracker_doctype: string }>): boolean => {
      if (current.length !== remote.length) return false;

      const currentMap = new Map(current.map(row => [`${row.child_tracker_docname}_${row.child_tracker_doctype}`, row]));
      const remoteMap = new Map(remote.map(r => [`${r.child_tracker_docname}_${r.child_tracker_doctype}`, r]));

      const allDocsExist = current.every(row => remoteMap.has(`${row.child_tracker_docname}_${row.child_tracker_doctype}`))
        && remote.every(row => currentMap.has(`${row.child_tracker_docname}_${row.child_tracker_doctype}`));
      if (!allDocsExist) return false;

      return !remote.some(remoteItem => {
        const key = `${remoteItem.child_tracker_docname}_${remoteItem.child_tracker_doctype}`;
        const currentItem = currentMap.get(key);
        return currentItem && currentItem.child_tracker_workflow_state !== remoteItem.child_tracker_workflow_state;
      });
    };

    let allRelatedDocs: Array<{ child_tracker_docname: string, child_tracker_workflow_state: string, child_tracker_doctype: string }> = [];

    for (const doctype of doctypes) {
      try {
        const relatedDocs = await fetchRelatedDocs(doctype, field, parent_doc_name, frm);
        allRelatedDocs = allRelatedDocs.concat(relatedDocs);
      } catch (error) {
        console.error(`Error fetching ${doctype}:`, error);
        continue;
      }
    }

    const currentTable = (frm.doc['child_tracker_table'] || []) as Array<{ child_tracker_docname: string, child_tracker_workflow_state: string, child_tracker_doctype: string }>;
    const needsUpdate = !isChildTrackerSynced(currentTable, allRelatedDocs);

    if (!needsUpdate) {
      console.log(`Tabela 'child_tracker_table' já está sincronizada.`);
      return;
    }

    frm.doc['child_tracker_table'] = allRelatedDocs;
    frm.dirty();
    frm.refresh_field('child_tracker_table');
    await frm.save();
  }
};
