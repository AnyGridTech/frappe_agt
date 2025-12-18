import { CorrectionsTrackerDoc } from "@anygridtech/frappe-agt-types/agt/doctype";
import { DocField, FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

frappe.provide('agt.corrections_tracker');

const STATUS = {
  WORKFLOW: { 
    AWAITING_ACTION: "Awaiting Action", 
    REVIEW: "Revision" 
  },
  ROW: { 
    PENDING: "Pending", 
    FINISHED: "Finished" 
  }
};
const ACTION = {
  REQUEST_REVIEW: "Request Review",
  APPROVE_CORRECTION: "Approve Correction",
  NEW_CORRECTION: "New Correction"
};

// Expose status/action through the CorrectionsTracker.run object so it
// matches the exported typings (CorrectionsTracker.run.status/action)
// and keeps the runtime structure available for older callers.

function getPending(rows: CorrectionsTrackerDoc[]) {
  return rows.filter(row => row.status === STATUS.ROW.PENDING);
}
function getCorrectionsHtml(rows: CorrectionsTrackerDoc[]) {
  return getPending(rows).map(row => {
    const label = row.correction_label;
    const text = row.correction_text;
    return `<li>⚠️ ${label || ""}${label && text ? ": " : ""}${text || ""}</li>`;
  }).join("");
}
function getDialogFields(rows: CorrectionsTrackerDoc[]) {
  return getPending(rows).map((row, idx) => ({
    fieldname: `chk_${idx}`,
    fieldtype: 'Check',
    label: `${row.correction_label || `${__("Request")} ${idx + 1}`}${row.correction_text ? ` — ${row.correction_text}` : ''}`,
    default: 0
  }));
}
async function approveCorrections(form: FrappeForm, rows: CorrectionsTrackerDoc[], onDone?: () => void) {
  const pending = getPending(rows);
  if (!pending.length) {
    frappe.msgprint(__("There are no pending items to approve."));
    return;
  }
  const d = new frappe.ui.Dialog({
    title: __("Mark corrections as completed"),
    fields: getDialogFields(rows),
    primary_action_label: __("Confirm and Approve Correction"),
    secondary_action_label: __("Cancel")
  });
  d.set_primary_action(__("Confirm and Approve Correction"), async () => {
    const values = d.get_values();
    if (!Object.values(values).every(v => v === 1 || v === true)) {
      frappe.msgprint({ title: __("Attention"), message: __("To approve the correction, mark all pending items as fixed."), indicator: "orange" });
      return;
    }
    await Promise.all(pending.map(row => agt.utils.table.row.update_one(row, {
      status: STATUS.ROW.FINISHED,
      finished_by: frappe.boot.user.email,
      finished_date: frappe.datetime.now_datetime()
    })));
    form.dirty();
    form.refresh_field('corrections_tracker');
    await form.save();
    d.hide();
    await agt.utils.update_workflow_state({
      doctype: form.doctype,
      docname: form.docname,
      workflow_state: STATUS.WORKFLOW.AWAITING_ACTION,
      ignore_workflow_validation: true,
      callback: async () => {
        frappe.msgprint({ title: __("Corrections approved"), message: __("All pending items have been marked as completed."), indicator: "green" });
        form.dirty();
        form.refresh_field('corrections_tracker');
        await form.save();
        onDone && onDone();
      }
    });
  });
  d.show();
}

function loadAdminButtons() {
  if (!frappe.boot.user.roles.includes("System Manager")) return;
  Object.values(STATUS.WORKFLOW).forEach(status => {
    cur_frm.add_custom_button(`${__("Go to")} ${status}`, async () => {
      await agt.utils.update_workflow_state({
        doctype: cur_frm.doctype,
        docname: cur_frm.docname,
        workflow_state: status,
        ignore_workflow_validation: true,
      });
    });
  });
}

(agt.corrections_tracker as any).run = {
  status: STATUS,
  action: ACTION,
  run: async () => {
  if (cur_frm.doc.__islocal || !cur_frm.fields_dict?.['corrections_tracker']) return;
  const meta = await agt.utils.doc.get_doc_meta('Corrections Tracker');
  if (!meta) return;
  const correctionLabelFields: Record<string, DocField> = {};
  meta.fields.forEach(field => {
    if (field.fieldname === 'correction_label') correctionLabelFields[field.fieldname] = field;
  });
  const labels = Object.values(cur_frm.fields_dict)
    .filter(f => f.df.permlevel === 0 && !f.df.read_only && !f.df.hidden && !['Section Break', 'Column Break', 'Button', 'Table'].includes(f.df.fieldtype))
    .map(f => (f.df.label || f.__label)?.trim()).filter(Boolean);

  frappe.ui.form.on(cur_frm.doctype, 'corrections_tracker_on_form_rendered', async function () {
    if (!cur_frm.cur_grid?.doc.__islocal) return;
    Object.keys(correctionLabelFields).forEach(fieldName => cur_frm.cur_grid?.set_field_property(fieldName, "options", labels));
  });

  frappe.ui.form.on(cur_frm.doctype, {
    async before_workflow_action(form: FrappeForm) {
      const ws = form.doc.workflow_state;
      const action = form.states?.frm?.selected_workflow_action;
      const rows = form.doc['corrections_tracker'] || [];
      if (ws === STATUS.WORKFLOW.AWAITING_ACTION && action === ACTION.REQUEST_REVIEW) {
        if (!getPending(rows).length) frappe.throw(__("Add at least one correction request (status \"Pending\") before requesting review."));
        await agt.utils.update_workflow_state({
          doctype: form.doctype,
          docname: form.docname,
          workflow_state: STATUS.WORKFLOW.REVIEW,
          ignore_workflow_validation: true,
          callback: async () => {
            frappe.msgprint({ title: __("Sent for Review"), message: `${__("The document was sent to")} "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
            form.dirty();
            form.refresh_field('corrections_tracker');
            await form.save();
          }
        });
        return false;
      }
      // Disabled because it is preventing the workflow state to be proceded
      // when there are no pending corrections.
      // if (ws === STATUS.WORKFLOW.REVIEW && action === ACTION.APPROVE_CORRECTION) {
      //   if (!getPending(rows).length) frappe.throw(`Não há pedidos pendentes para aprovar.`);
      //   await approveCorrections(form, rows);
      //   return;
      // }
      return true;
    },
    async before_save(form: FrappeForm) {
      const rows = form.doc['corrections_tracker'] || [];
      const activeLabels = getPending(rows).map(row => row.correction_label).filter(Boolean);
      if (new Set(activeLabels).size < activeLabels.length) {
        frappe.throw(__("<b>Save failed:</b><br>There are duplicate 'Correction Labels' among active requests. Each request must refer to a unique field."));
      }
      getPending(rows).forEach(row => {
        if (!row.correction_label || !row.correction_text) {
          frappe.throw(__("<b>Save failed:</b><br>For each request with status \"Pending\", you must fill in 'Correction Label' and 'Correction Text'."));
        }
      });
    },
    async after_save(form: FrappeForm) {
      const ws = form.doc.workflow_state;
      const rows = form.doc['corrections_tracker'] || [];
      const pending = getPending(rows);
      if (!pending.length) return;
      const html = getCorrectionsHtml(rows);
      if (!html.length) return;
      if (ws === STATUS.WORKFLOW.AWAITING_ACTION) {
        const confirmDiag = frappe.confirm(`${__("There are pending requests. Do you want to send to")} "<b>${STATUS.WORKFLOW.REVIEW}</b>" ${__("now")}?<br><br><ul>${html}</ul>`, async () => {
          await agt.utils.update_workflow_state({
            doctype: form.doctype,
            docname: form.docname,
            workflow_state: STATUS.WORKFLOW.REVIEW,
            ignore_workflow_validation: true,
            callback: async () => {
              frappe.msgprint({ title: __("Sent for Review"), message: `${__("The document was sent to")} "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
              form.dirty();
              form.refresh_field('corrections_tracker');
            }
          });
        });
        confirmDiag.set_primary_action(__("Yes, send for review."));
        confirmDiag.set_secondary_action_label(__("No, later."));
      }
      if (ws === STATUS.WORKFLOW.REVIEW) {
        frappe.msgprint({ title: __("Pending corrections"), message: `${__("Confirm that the following items have been corrected by the customer")}:<br><br><ul>${html}</ul>`, indicator: "orange" });
      }
    },
    async refresh() { loadAdminButtons(); },
    async onload(form: FrappeForm) {
      loadAdminButtons();
      form.set_df_property('corrections_tracker', 'cannot_delete_rows', 1);
      const rows = form.doc['corrections_tracker'] || [];
      if (getPending(rows).length) form.set_df_property('corrections_tracker', 'cannot_add_rows', 1);
      if (form.doc.workflow_state === STATUS.WORKFLOW.REVIEW) {
        form.add_custom_button('Approve Correction', async () => approveCorrections(form, rows));
        form.add_custom_button(ACTION.NEW_CORRECTION, async () => {
          const confirmDiag = frappe.confirm(__("Are you sure you want to create a new correction request?"), async () => {
            const finishedRows = (form.doc['corrections_tracker'] || []).filter((row: CorrectionsTrackerDoc) => row.status === STATUS.ROW.FINISHED);
            await Promise.all(finishedRows.map((row: CorrectionsTrackerDoc) => agt.utils.table.row.update_one(row, {
              status: STATUS.ROW.FINISHED,
              finished_by: frappe.boot.user.email,
              finished_date: frappe.datetime.now_datetime()
            })));
            setTimeout(() => {
              form.set_df_property('corrections_tracker', 'cannot_add_rows', 0);
              frappe.msgprint(__("Create a new correction request for the customer with the missing fields."));
            }, 2000);
          });
          confirmDiag.set_primary_action(__("Yes, create new request."));
          confirmDiag.set_secondary_action_label(__("No, cancel."));
        });
      }
      const html = getCorrectionsHtml(rows);
      if (!getPending(rows).length || !html.length) return;
      let msg = `<ul>${html}</ul><br>`;
      msg += form.doc.workflow_state === STATUS.WORKFLOW.REVIEW
        ? __("<p>Mark each pending item as fixed in the 'Approve Correction' button. It will only be possible to approve if all are marked.</p>")
        : `<p>${__("There are pending requests. You can send for review by clicking")} '${ACTION.REQUEST_REVIEW}'.</p>`;
      frappe.msgprint({ title: __("Pending Correction Requests"), message: msg, indicator: "orange" });
    },
  });
  }
};