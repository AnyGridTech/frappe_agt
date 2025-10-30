// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
frappe.provide("agt.child_tracker_table");
agt.child_tracker_table = {
  mirror: async (frm, doctypes, field) => {
    for (const doctype of doctypes) {
      try {
        await agt.utils.form.mirror_checklist_table(frm, doctype, field, "parent_docname", "child_tracker_docname", "child_tracker_workflow_state");
      } catch (error) {
        console.error(`Erro ao espelhar tabela para doctype ${doctype}:`, error);
      }
    }
  },
  setup: async () => {
    await setupChildTrackerTable();
  }
};
const STATUS = {
  WORKFLOW: { AWAITING_ACTION: "Aguardando A\xE7\xE3o", REVIEW: "Revis\xE3o" },
  ROW: { PENDING: "Pendente", FINISHED: "Conclu\xEDdo" }
};
const ACTION = {
  REQUEST_REVIEW: "Solicitar Revis\xE3o",
  APPROVE_CORRECTION: "Aprovar Corre\xE7\xE3o",
  NEW_CORRECTION: "Novo Pedido"
};
function getPending(rows) {
  return rows.filter((row) => row.status === STATUS.ROW.PENDING);
}
function getCorrectionsHtml(rows) {
  return getPending(rows).map((row) => {
    const label = row.correction_label;
    const text = row.correction_text;
    return `<li>\u26A0\uFE0F ${label || ""}${label && text ? ": " : ""}${text || ""}</li>`;
  }).join("");
}
function getDialogFields(rows) {
  return getPending(rows).map((row, idx) => ({
    fieldname: `chk_${idx}`,
    fieldtype: "Check",
    label: `${row.correction_label || `Pedido ${idx + 1}`}${row.correction_text ? ` \u2014 ${row.correction_text}` : ""}`,
    default: 0
  }));
}
async function approveCorrections(form, rows, onDone) {
  const pending = getPending(rows);
  if (!pending.length) {
    frappe.msgprint("N\xE3o existem pend\xEAncias para aprovar.");
    return;
  }
  const d = new frappe.ui.Dialog({
    title: "Marcar corre\xE7\xF5es como conclu\xEDdas",
    fields: getDialogFields(rows),
    primary_action_label: "Confirmar e Aprovar Corre\xE7\xE3o",
    secondary_action_label: "Cancelar"
  });
  d.set_primary_action("Confirmar e Aprovar Corre\xE7\xE3o", async () => {
    const values = d.get_values();
    if (!Object.values(values).every((v) => v === 1 || v === true)) {
      frappe.msgprint({ title: "Aten\xE7\xE3o", message: `Para aprovar a corre\xE7\xE3o, marque todas as pend\xEAncias como corrigidas.`, indicator: "orange" });
      return;
    }
    await Promise.all(pending.map((row) => agt.utils.table.row.update_one(row, {
      status: STATUS.ROW.FINISHED,
      finished_by: frappe.boot.user.email,
      finished_date: frappe.datetime.now_datetime()
    })));
    form.dirty();
    form.refresh_field("corrections_tracker");
    await form.save();
    d.hide();
    await agt.utils.update_workflow_state({
      doctype: form.doctype,
      docname: form.docname,
      workflow_state: STATUS.WORKFLOW.AWAITING_ACTION,
      callback: async () => {
        frappe.msgprint({ title: "Corre\xE7\xF5es aprovadas", message: `Todas as pend\xEAncias foram marcadas como conclu\xEDdas.`, indicator: "green" });
        form.dirty();
        form.refresh_field("corrections_tracker");
        await form.save();
        onDone && onDone();
      }
    });
  });
  d.show();
}
function loadAdminButtons() {
  if (!frappe.boot.user.roles.includes("System Manager")) return;
  Object.values(STATUS.WORKFLOW).forEach((status) => {
    cur_frm.add_custom_button(`Ir para ${status}`, async () => {
      await agt.utils.update_workflow_state({
        doctype: cur_frm.doctype,
        docname: cur_frm.docname,
        workflow_state: status,
        ignore_workflow_validation: true
      });
    });
  });
}
async function setupChildTrackerTable() {
  if (cur_frm.doc.__islocal || !cur_frm.fields_dict?.["corrections_tracker"]) return;
  const meta = await agt.utils.doc.get_doc_meta("Corrections Tracker");
  if (!meta) return;
  const correctionLabelFields = {};
  meta.fields.forEach((field) => {
    if (field.fieldname === "correction_label") correctionLabelFields[field.fieldname] = field;
  });
  const labels = Object.values(cur_frm.fields_dict).filter((f) => f.df.permlevel === 0 && !f.df.read_only && !f.df.hidden && !["Section Break", "Column Break", "Button", "Table"].includes(f.df.fieldtype)).map((f) => (f.df.label || f.__label)?.trim()).filter(Boolean);
  frappe.ui.form.on(cur_frm.doctype, "corrections_tracker_on_form_rendered", async function() {
    if (!cur_frm.cur_grid?.doc.__islocal) return;
    Object.keys(correctionLabelFields).forEach((fieldName) => cur_frm.cur_grid?.set_field_property(fieldName, "options", labels));
  });
  frappe.ui.form.on(cur_frm.doctype, {
    async before_workflow_action(form) {
      const ws = form.doc.workflow_state;
      const action = form.states?.frm?.selected_workflow_action;
      const rows = form.doc["corrections_tracker"] || [];
      if (ws === STATUS.WORKFLOW.AWAITING_ACTION && action === ACTION.REQUEST_REVIEW) {
        if (!getPending(rows).length) frappe.throw(`Adicione ao menos um pedido de corre\xE7\xE3o (status "Pendente") antes de solicitar revis\xE3o.`);
        await agt.utils.update_workflow_state({
          doctype: form.doctype,
          docname: form.docname,
          workflow_state: STATUS.WORKFLOW.REVIEW,
          ignore_workflow_validation: true,
          callback: async () => {
            frappe.msgprint({ title: "Enviado para Revis\xE3o", message: `O documento foi enviado para "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
            form.dirty();
            form.refresh_field("corrections_tracker");
            await form.save();
          }
        });
        return false;
      }
      return true;
    },
    async before_save(form) {
      const rows = form.doc["corrections_tracker"] || [];
      const activeLabels = getPending(rows).map((row) => row.correction_label).filter(Boolean);
      if (new Set(activeLabels).size < activeLabels.length) {
        frappe.throw(`<b>Falha ao salvar:</b><br>Existem 'R\xF3tulos da Corre\xE7\xE3o' duplicados entre os pedidos ativos. Cada pedido deve referir um campo \xFAnico.`);
      }
      getPending(rows).forEach((row) => {
        if (!row.correction_label || !row.correction_text) {
          frappe.throw(`<b>Falha ao salvar:</b><br>Para cada pedido com status "Pendente" \xE9 necess\xE1rio preencher 'R\xF3tulo da Corre\xE7\xE3o' e 'Texto da Corre\xE7\xE3o'.`);
        }
      });
    },
    async after_save(form) {
      const ws = form.doc.workflow_state;
      const rows = form.doc["corrections_tracker"] || [];
      const pending = getPending(rows);
      if (!pending.length) return;
      const html = getCorrectionsHtml(rows);
      if (!html.length) return;
      if (ws === STATUS.WORKFLOW.AWAITING_ACTION) {
        const confirmDiag = frappe.confirm(`Existem pedidos pendentes. Deseja enviar para "<b>${STATUS.WORKFLOW.REVIEW}</b>" agora?<br><br><ul>${html}</ul>`, async () => {
          await agt.utils.update_workflow_state({
            doctype: form.doctype,
            docname: form.docname,
            workflow_state: STATUS.WORKFLOW.REVIEW,
            ignore_workflow_validation: true,
            callback: async () => {
              frappe.msgprint({ title: "Enviado para Revis\xE3o", message: `O documento foi enviado para "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
              form.dirty();
              form.refresh_field("corrections_tracker");
            }
          });
        });
        confirmDiag.set_primary_action("Sim, enviar para revis\xE3o.");
        confirmDiag.set_secondary_action_label("N\xE3o, depois.");
      }
      if (ws === STATUS.WORKFLOW.REVIEW) {
        frappe.msgprint({ title: "Corre\xE7\xF5es pendentes", message: `Confirme se os seguintes itens foram corrigidos pelo cliente:<br><br><ul>${html}</ul>`, indicator: "orange" });
      }
    },
    async refresh() {
      loadAdminButtons();
    },
    async onload(form) {
      loadAdminButtons();
      form.set_df_property("corrections_tracker", "cannot_delete_rows", 1);
      const rows = form.doc["corrections_tracker"] || [];
      if (getPending(rows).length) form.set_df_property("corrections_tracker", "cannot_add_rows", 1);
      if (form.doc.workflow_state === STATUS.WORKFLOW.REVIEW) {
        form.add_custom_button("Aprovar Corre\xE7\xE3o", async () => approveCorrections(form, rows));
        form.add_custom_button(ACTION.NEW_CORRECTION, async () => {
          const confirmDiag = frappe.confirm("Tem certeza que deseja criar um novo pedido de corre\xE7\xE3o?", async () => {
            const finishedRows = (form.doc["corrections_tracker"] || []).filter((row) => row.status === STATUS.ROW.FINISHED);
            await Promise.all(finishedRows.map((row) => agt.utils.table.row.update_one(row, {
              status: STATUS.ROW.FINISHED,
              finished_by: frappe.boot.user.email,
              finished_date: frappe.datetime.now_datetime()
            })));
            setTimeout(() => {
              form.set_df_property("corrections_tracker", "cannot_add_rows", 0);
              frappe.msgprint("Crie um novo pedido de corre\xE7\xE3o para o cliente com os campos faltantes.");
            }, 2e3);
          });
          confirmDiag.set_primary_action("Sim, criar novo pedido.");
          confirmDiag.set_secondary_action_label("N\xE3o, cancelar.");
        });
      }
      const html = getCorrectionsHtml(rows);
      if (!getPending(rows).length || !html.length) return;
      let msg = `<ul>${html}</ul><br>`;
      msg += form.doc.workflow_state === STATUS.WORKFLOW.REVIEW ? `<p>Marque cada pend\xEAncia como corrigida no bot\xE3o 'Aprovar Corre\xE7\xE3o'. S\xF3 ser\xE1 poss\xEDvel aprovar se todas estiverem marcadas.</p>` : `<p>H\xE1 pedidos pendentes. Voc\xEA pode enviar para revis\xE3o clicando em '${ACTION.REQUEST_REVIEW}'.</p>`;
      frappe.msgprint({ title: "Pedidos de Corre\xE7\xE3o Pendentes", message: msg, indicator: "orange" });
    }
  });
}
