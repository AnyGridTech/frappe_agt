import type { 
  WorkflowActionExtended, 
  WorkflowValidation, 
  WorkflowField, 
} from "@anygridtech/frappe-agt-types/agt/client/workflow/before_workflow_action";
import type { FrappeDoc, FieldDict } from "@anygridtech/frappe-types/client/frappe/core";
import "@anygridtech/frappe-types/client";

declare global {
  var workflow_validations: WorkflowValidation[];
}

frappe.provide("agt.workflow.validate");
agt.workflow.validate = async (action_extended?: WorkflowActionExtended) => {
  if (cur_frm.doc.__islocal) return;
  if (!workflow_validations) return;
  
  const workflow_state: string = cur_frm.doc.workflow_state;
  const workflow_action: string | null | undefined = cur_frm.states.frm.selected_workflow_action;
  
  if (!workflow_state) {
    console.warn("Workflow state not found.");
    return;
  } else if (!workflow_action && !action_extended) {
    console.warn("Workflow action not found.");
    return;
  }
  
  const validations_to_run: WorkflowValidation[] = workflow_validations.filter((w: WorkflowValidation) => {
    if (!workflow_action && action_extended) {
      return w.workflow_state === workflow_state && w.action_extended?.includes(action_extended);
    } else if (workflow_action && !action_extended) {
      const matches_action: boolean = Array.isArray(w.workflow_action) 
        ? w.workflow_action.includes(workflow_action)
        : w.workflow_action === workflow_action;
      return w.workflow_state === workflow_state && matches_action;
    }
    return false;
  });
  if (!validations_to_run.length) {
    console.log(`Workflow validation not found for state: ${workflow_state}`);
    return;
  }

  for (const wv of validations_to_run) {
    const req_fields: WorkflowField[] = wv.workflow_fields;
    const not_missing = (v: unknown): boolean => Boolean(v) || v === 0;

    const missing_fields_name: string[] = req_fields
      .filter((f: WorkflowField) => {
        const value: unknown = cur_frm.doc[f.name as keyof FrappeDoc];
        if (not_missing(value)) return false; // Skip if field is not empty
        if (f.should_validate && !f.should_validate(cur_frm)) return false; // Skip if should_validate returns false
        return true;
      })
      .map((f: WorkflowField) => f.name);

    const missing_fields_html: string = missing_fields_name.map((f_name: string) => {
      const field_dict: FieldDict | undefined = cur_frm.fields_dict[f_name];
      const f_label: string | undefined = field_dict?.df.label;
      console.log(`Missing field: ${f_label || f_name}`);
      return `<li>${f_label || f_name}</li>`;
    }).join("");

    const depends_on_html: string = req_fields.map((f: WorkflowField) => {
      if (!f.depends_on) return "";
      const depends_on: string | undefined = f.depends_on(cur_frm);
      if (!depends_on) return "";
      const f_name: string = f.name;
      const field_dict: FieldDict | undefined = cur_frm.fields_dict[f_name];
      const f_label: string | undefined = field_dict?.df.label;
      return `<li>${f_label || f_name} : ${depends_on}</li>`;
    }).join("");

    if (!missing_fields_name.length && !depends_on_html.length) continue;

    // Set a listener after 2 seconds to unfreeze the UI if needed
    setTimeout(() => {
      if (action_extended) return;
      frappe.dom.unfreeze();
    }, 2 * 1000);

    const missing_fields_msg: string = !missing_fields_html.length ? "" : `
    <p>${__(`⚠️ Preencha os campos abaixo:`)}</p>
    <ul>${missing_fields_html}</ul>`;

    const dependency_fields_msg: string = !depends_on_html.length ? "" : `
    <p>${__("⚠️ As dependencias abaixo falharam:")}</p>
    <ul>${depends_on_html}</ul>`;

    frappe.throw({
      title: __("Atenção!"),
      message: missing_fields_msg + dependency_fields_msg,
    });
  }
}