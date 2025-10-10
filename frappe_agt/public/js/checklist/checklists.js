frappe.provide("agt.checklist");
agt.checklist = {
    tables: {
        all: { setup: async () => { } },
        inverter: { setup: async () => { } },
        ev_charger: { setup: async () => { } },
        battery: { setup: async () => { } },
        transformer: { setup: async () => { } },
        smart_meter: { setup: async () => { } },
        smart_energy_manager: { setup: async () => { } },
        datalogger: { setup: async () => { } }
    },
    tracker_table: {
        all: { setup: async () => { } },
        inverter: { setup: async () => { } },
        ev_charger: { setup: async () => { } },
        battery: { setup: async () => { } },
        transformer: { setup: async () => { } },
        smart_meter: { setup: async () => { } },
        smart_energy_manager: { setup: async () => { } },
        datalogger: { setup: async () => { } }
    },
    setup: async () => {
        frappe.ui.form.on(cur_frm.doctype, {
            after_save: function (frm) {
                agt.utils.form.field.validate_js_visible_fields(frm, "Customer Fix Info").msgprint();
            },
            before_workflow_action: async function (frm) {
                if (frm.doc.__islocal)
                    return;
                const action = frm.states.frm.selected_workflow_action;
                if (action === 'Encaminhar ao Suporte') {
                    agt.utils.form.field.validate_js_visible_fields(frm, "Pre Analysis").throw_error();
                }
                if (action === 'Concluir Checklist') {
                    agt.utils.form.field.validate_js_visible_fields(frm, "Pre Analysis").throw_error();
                    await trigger_checklist_finished_func(frm);
                }
                if (action === 'Rejeitar') {
                    agt.utils.update_workflow_state({
                        doctype: "Service Protocol",
                        docname: frm.doc['sp_docname'],
                        workflow_state: "Holding Action",
                        ignore_workflow_validation: true,
                    });
                }
                if (action === 'Solicitar Proposta de Envio') {
                    agt.utils.form.field.validate_js_visible_fields(frm, "Pre Analysis").throw_error();
                    await trigger_checklist_finished_func(frm);
                    await trigger_proposed_dispatch_func(frm);
                }
                return;
            }
        });
        let trigger_proposed_dispatch = false;
        const trigger_proposed_dispatch_func = async (frm) => {
            if (frm.doc.__islocal)
                return;
            if (trigger_proposed_dispatch) {
                console.log('Requisição em andamento, ignorando chamada...');
                return;
            }
            trigger_proposed_dispatch = true;
            try {
                const swa = frm.states.frm.selected_workflow_action;
                const swa_request_dispatch = "Solicitar Proposta de Envio";
                if (swa !== swa_request_dispatch) {
                    throw new Error("A ação selecionada não permite criar uma Proposta de Envio.");
                }
                const dt_name = "Proposed Dispatch";
                const existingDispatches = await frappe.db.get_list(dt_name, {
                    filters: { ticket_docname: frm.doc['ticket_docname'] },
                    fields: ["name"],
                });
                if (existingDispatches && existingDispatches.length > 0) {
                    const existing_list_html = existingDispatches.map(ticket => `<li>${ticket.name}</li>`).join("");
                    throw new Error(`Já existe uma Proposta de Envio vinculada a este Ticket: <br><ul>${existing_list_html}</ul>`);
                }
                const freshDispatches = await frappe.db.get_list(dt_name, {
                    filters: { ticket_docname: frm.doc['ticket_docname'] },
                    fields: ["name"],
                });
                if (freshDispatches && freshDispatches.length > 0)
                    return;
                const docname = await agt.utils.doc.create_doc(dt_name, ["ticket_docname"], frm.fields_dict);
                if (!docname) {
                    throw new Error("Falha ao criar Proposta de Envio.");
                }
                console.log("Proposta de Envio criada com sucesso:", docname);
                const main_eqp_group = frm.doc['main_eqp_group'];
                if (!main_eqp_group) {
                    throw new Error("Grupo do equipamento principal não definido.");
                }
                await agt.utils.table.row.add_one(frm, "proposed_dispatch_table", {
                    item_name: main_eqp_group,
                    item_quantity: 1
                });
                frm.dirty();
                console.log("Linha adicionada na tabela 'proposed_dispatch_table' com sucesso.");
                await frm.save();
            }
            catch (error) {
                console.error('Erro ao criar Proposta de Envio:', error);
                frappe.msgprint({
                    title: "Erro ao criar Proposta de Envio",
                    message: error instanceof Error ? error.message : String(error),
                    indicator: 'red'
                });
            }
            finally {
                trigger_proposed_dispatch = false;
            }
        };
        let trigger_checklist_finished = false;
        const trigger_checklist_finished_func = async (form) => {
            if (form.doc.__islocal)
                return;
            if (trigger_checklist_finished) {
                console.log('Requisição em andamento, ignorando chamada...');
                return;
            }
            trigger_checklist_finished = true;
            try {
                agt.utils.update_workflow_state({
                    doctype: "Service Protocol",
                    docname: form.doc['sp_docname'],
                    workflow_state: "Finished",
                    ignore_workflow_validation: true,
                });
                frappe.msgprint({
                    title: "Checklist concluído!",
                    message: "Você será redirecionado novamente ao 'Service Protocol' para solicitar a proposta de envio.",
                    indicator: 'blue'
                });
                form.dirty();
                setTimeout(() => {
                    const url = `/app/service-protocol/${form.doc['sp_docname']}`;
                    window.open(url, '_blank');
                }, 500);
                await form.save();
            }
            catch (error) {
                console.error('Erro ao mover o workflow state do Service Protocol:', error);
                frappe.msgprint({
                    title: "Erro",
                    message: "Algo deu errado. Por favor, entre em contato com a equipe de Tecnologia da Informação.",
                    indicator: 'red'
                });
            }
            finally {
                trigger_checklist_finished = false;
            }
        };
    }
};
//# sourceMappingURL=checklists.js.map