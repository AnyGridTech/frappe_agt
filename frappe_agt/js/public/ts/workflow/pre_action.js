"use strict";
frappe.provide("agt.workflow.pre_action");
agt.workflow.pre_action = async () => {
    if (!window.workflow_preactions)
        return;
    for (const [workflow_action, routine] of Object.entries(window.workflow_preactions)) {
        if (cur_frm.states.frm.selected_workflow_action !== workflow_action)
            continue;
        for (const [preaction, fnc] of Object.entries(routine)) {
            try {
                console.log(`Running function for ${workflow_action} - ${preaction}`);
                await fnc(cur_frm);
            }
            catch (e) {
                console.error("Preaction error", e);
                const errorMessage = e instanceof Error ? e.message : String(e);
                frappe.throw({
                    title: __("Erro"),
                    message: errorMessage
                });
                break;
            }
        }
    }
};
