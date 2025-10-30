import "@anygridtech/frappe-types/client";
frappe.provide("agt.workflow.validate");
agt.workflow.validate = async (action_extended) => {
    if (cur_frm.doc.__islocal)
        return;
    if (!workflow_validations)
        return;
    const workflow_state = cur_frm.doc.workflow_state;
    const workflow_action = cur_frm.states.frm.selected_workflow_action;
    if (!workflow_state) {
        console.warn("Workflow state not found.");
        return;
    }
    else if (!workflow_action && !action_extended) {
        console.warn("Workflow action not found.");
        return;
    }
    const validations_to_run = workflow_validations.filter((w) => {
        if (!workflow_action && action_extended) {
            return w.workflow_state === workflow_state && w.action_extended?.includes(action_extended);
        }
        else if (workflow_action && !action_extended) {
            const matches_action = Array.isArray(w.workflow_action)
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
        const req_fields = wv.workflow_fields;
        const not_missing = (v) => Boolean(v) || v === 0;
        const missing_fields_name = req_fields
            .filter((f) => {
            const value = cur_frm.doc[f.name];
            if (not_missing(value))
                return false;
            if (f.should_validate && !f.should_validate(cur_frm))
                return false;
            return true;
        })
            .map((f) => f.name);
        const missing_fields_html = missing_fields_name.map((f_name) => {
            const field_dict = cur_frm.fields_dict[f_name];
            const f_label = field_dict?.df.label;
            console.log(`Missing field: ${f_label || f_name}`);
            return `<li>${f_label || f_name}</li>`;
        }).join("");
        const depends_on_html = req_fields.map((f) => {
            if (!f.depends_on)
                return "";
            const depends_on = f.depends_on(cur_frm);
            if (!depends_on)
                return "";
            const f_name = f.name;
            const field_dict = cur_frm.fields_dict[f_name];
            const f_label = field_dict?.df.label;
            return `<li>${f_label || f_name} : ${depends_on}</li>`;
        }).join("");
        if (!missing_fields_name.length && !depends_on_html.length)
            continue;
        setTimeout(() => {
            if (action_extended)
                return;
            frappe.dom.unfreeze();
        }, 2 * 1000);
        const missing_fields_msg = !missing_fields_html.length ? "" : `
    <p>${__(`⚠️ Preencha os campos abaixo:`)}</p>
    <ul>${missing_fields_html}</ul>`;
        const dependency_fields_msg = !depends_on_html.length ? "" : `
    <p>${__("⚠️ As dependencias abaixo falharam:")}</p>
    <ul>${depends_on_html}</ul>`;
        frappe.throw({
            title: __("Atenção!"),
            message: missing_fields_msg + dependency_fields_msg,
        });
    }
};
