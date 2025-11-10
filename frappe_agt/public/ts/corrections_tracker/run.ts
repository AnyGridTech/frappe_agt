import { CorrectionsTrackerDoc } from "@anygridtech/frappe-agt-types/agt/doctype";
import { DocField, FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

frappe.provide('agt.corrections_tracker');

const STATUS = {
  WORKFLOW: { 
    AWAITING_ACTION: "Aguardando Ação", 
    REVIEW: "Revisão" 
  },
  ROW: { 
    PENDING: "Pendente", 
    FINISHED: "Concluído" 
  }
};
const ACTION = {
  REQUEST_REVIEW: "Solicitar Revisão",
  APPROVE_CORRECTION: "Aprovar Correção",
  NEW_CORRECTION: "Novo Pedido"
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
    label: `${row.correction_label || `Pedido ${idx + 1}`}${row.correction_text ? ` — ${row.correction_text}` : ''}`,
    default: 0
  }));
}
async function approveCorrections(form: FrappeForm, rows: CorrectionsTrackerDoc[], onDone?: () => void) {
  const pending = getPending(rows);
  if (!pending.length) {
    frappe.msgprint("Não existem pendências para aprovar.");
    return;
  }
  const d = new frappe.ui.Dialog({
    title: "Marcar correções como concluídas",
    fields: getDialogFields(rows),
    primary_action_label: "Confirmar e Aprovar Correção",
    secondary_action_label: "Cancelar"
  });
  d.set_primary_action("Confirmar e Aprovar Correção", async () => {
    const values = d.get_values();
    if (!Object.values(values).every(v => v === 1 || v === true)) {
      frappe.msgprint({ title: "Atenção", message: `Para aprovar a correção, marque todas as pendências como corrigidas.`, indicator: "orange" });
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
        frappe.msgprint({ title: "Correções aprovadas", message: `Todas as pendências foram marcadas como concluídas.`, indicator: "green" });
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
    cur_frm.add_custom_button(`Ir para ${status}`, async () => {
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
        if (!getPending(rows).length) frappe.throw(`Adicione ao menos um pedido de correção (status "Pendente") antes de solicitar revisão.`);
        await agt.utils.update_workflow_state({
          doctype: form.doctype,
          docname: form.docname,
          workflow_state: STATUS.WORKFLOW.REVIEW,
          ignore_workflow_validation: true,
          callback: async () => {
            frappe.msgprint({ title: "Enviado para Revisão", message: `O documento foi enviado para "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
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
        frappe.throw(`<b>Falha ao salvar:</b><br>Existem 'Rótulos da Correção' duplicados entre os pedidos ativos. Cada pedido deve referir um campo único.`);
      }
      getPending(rows).forEach(row => {
        if (!row.correction_label || !row.correction_text) {
          frappe.throw(`<b>Falha ao salvar:</b><br>Para cada pedido com status "Pendente" é necessário preencher 'Rótulo da Correção' e 'Texto da Correção'.`);
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
        const confirmDiag = frappe.confirm(`Existem pedidos pendentes. Deseja enviar para "<b>${STATUS.WORKFLOW.REVIEW}</b>" agora?<br><br><ul>${html}</ul>`, async () => {
          await agt.utils.update_workflow_state({
            doctype: form.doctype,
            docname: form.docname,
            workflow_state: STATUS.WORKFLOW.REVIEW,
            ignore_workflow_validation: true,
            callback: async () => {
              frappe.msgprint({ title: "Enviado para Revisão", message: `O documento foi enviado para "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
              form.dirty();
              form.refresh_field('corrections_tracker');
            }
          });
        });
        confirmDiag.set_primary_action("Sim, enviar para revisão.");
        confirmDiag.set_secondary_action_label("Não, depois.");
      }
      if (ws === STATUS.WORKFLOW.REVIEW) {
        frappe.msgprint({ title: "Correções pendentes", message: `Confirme se os seguintes itens foram corrigidos pelo cliente:<br><br><ul>${html}</ul>`, indicator: "orange" });
      }
    },
    async refresh() { loadAdminButtons(); },
    async onload(form: FrappeForm) {
      loadAdminButtons();
      form.set_df_property('corrections_tracker', 'cannot_delete_rows', 1);
      const rows = form.doc['corrections_tracker'] || [];
      if (getPending(rows).length) form.set_df_property('corrections_tracker', 'cannot_add_rows', 1);
      if (form.doc.workflow_state === STATUS.WORKFLOW.REVIEW) {
        form.add_custom_button('Aprovar Correção', async () => approveCorrections(form, rows));
        form.add_custom_button(ACTION.NEW_CORRECTION, async () => {
          const confirmDiag = frappe.confirm("Tem certeza que deseja criar um novo pedido de correção?", async () => {
            const finishedRows = (form.doc['corrections_tracker'] || []).filter((row: CorrectionsTrackerDoc) => row.status === STATUS.ROW.FINISHED);
            await Promise.all(finishedRows.map((row: CorrectionsTrackerDoc) => agt.utils.table.row.update_one(row, {
              status: STATUS.ROW.FINISHED,
              finished_by: frappe.boot.user.email,
              finished_date: frappe.datetime.now_datetime()
            })));
            setTimeout(() => {
              form.set_df_property('corrections_tracker', 'cannot_add_rows', 0);
              frappe.msgprint("Crie um novo pedido de correção para o cliente com os campos faltantes.");
            }, 2000);
          });
          confirmDiag.set_primary_action("Sim, criar novo pedido.");
          confirmDiag.set_secondary_action_label("Não, cancelar.");
        });
      }
      const html = getCorrectionsHtml(rows);
      if (!getPending(rows).length || !html.length) return;
      let msg = `<ul>${html}</ul><br>`;
      msg += form.doc.workflow_state === STATUS.WORKFLOW.REVIEW
        ? `<p>Marque cada pendência como corrigida no botão 'Aprovar Correção'. Só será possível aprovar se todas estiverem marcadas.</p>`
        : `<p>Há pedidos pendentes. Você pode enviar para revisão clicando em '${ACTION.REQUEST_REVIEW}'.</p>`;
      frappe.msgprint({ title: "Pedidos de Correção Pendentes", message: msg, indicator: "orange" });
    },
  });
  }
};