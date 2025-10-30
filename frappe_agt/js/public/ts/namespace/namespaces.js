frappe.provide("growatt.namespace");
if (typeof window.growatt === 'undefined') {
    window.growatt = {};
}
window.growatt.namespace.service_protocol = {
    workflow_action: {
        request_revision: {
            name: "Solicitar Revisão",
            id: 1
        },
        request_checklist: {
            name: "Solicitar Checklist",
            id: 2
        },
        request_correction: {
            name: "Solicitar Proposta de Envio",
            id: 3
        },
        reject: {
            name: "Rejeitar",
            id: 4
        },
        cancel: {
            name: "Cancelar",
            id: 5
        },
        finish_correction: {
            name: "Aprovar Correção",
            id: 6
        },
    },
    workflow_state: {
        holding_action: {
            name: "Aguardando Ação",
            id: 1
        },
        growatt_review: {
            name: "Revisão",
            id: 2
        },
        finished: {
            name: "Concluído",
            id: 3
        },
        rejected: {
            name: "Rejeitado",
            id: 4
        },
        cancelled: {
            name: "Cancelado",
            id: 5
        }
    }
};
window.growatt.namespace.compliance_statement = {
    workflow_action: {
        approve: {
            name: "Aprovar",
            id: 1
        },
        request_analysis: {
            name: "Solicitar Análise",
            id: 2
        },
        request_correction: {
            name: "Solicitar Correção",
            id: 3
        },
        finish_review: {
            name: "Finalizar Revisão",
            id: 4
        },
        reject: {
            name: "Rejeitar",
            id: 5
        },
        finish_service: {
            name: "Finalizar Atendimento",
            id: 6
        },
        cancel: {
            name: "Cancelar",
            id: 7
        },
        finish_correction: {
            name: "Finalizar Correção",
            id: 8
        },
        request_documentation: {
            name: "Solicitar Documentação",
            id: 9
        },
        request_checklist: {
            name: "Solicitar Checklist",
            id: 10
        },
        forward_to_support: {
            name: "Encaminhar ao Suporte",
            id: 11
        },
    },
    workflow_state: {
        customer_finish_filling: {
            name: "Cliente: Finalizar Preenchimento",
            id: 1
        },
        growatt_preliminary_assessment: {
            name: "Análise Preliminar",
            id: 2
        },
        customer_fix_info: {
            name: "Cliente: Corrigir Informações",
            id: 3
        },
        growatt_review: {
            name: "Revisão",
            id: 4
        },
        customer_checklist_requested: {
            name: "Cliente: Checklist Solicitado",
            id: 5
        },
        checklist_finished: {
            name: "Checklist Concluído",
            id: 6
        },
        shipping_proposal: {
            name: "Proposta de Envio",
            id: 7
        },
        warranty_approved: {
            name: "Garantia Aprovada",
            id: 9
        },
        rejected: {
            name: "Rejeitado",
            id: 10
        },
        finished: {
            name: "Concluído",
            id: 11
        },
        cancelled: {
            name: "Cancelado",
            id: 12
        },
        approved: {
            name: "Aprovado",
            id: 13
        },
        finished_fixed: {
            name: "Finalizado: Corrigido",
            id: 14
        },
        finished_missing: {
            name: "Finalizado: Correção Faltante",
            id: 15
        },
        customer_necessary_action: {
            name: "Cliente: Ação Necessária",
            id: 16
        },
    }
};
window.growatt.namespace.checklist = {
    workflow_state: {
        pre_analysis: {
            name: "Análise Preliminar",
            id: 1
        },
        customer_fix_info: {
            name: "Cliente: Corrigir Informações",
            id: 2
        },
        growatt_review: {
            name: "Revisão",
            id: 3
        },
        finished: {
            name: "Concluído",
            id: 4
        },
        rejected: {
            name: "Rejeitado",
            id: 5
        },
        cancelled: {
            name: "Cancelado",
            id: 6
        }
    }
};
window.growatt.namespace.ticket = {
    workflow_action: {
        approve: {
            name: "Aprovar",
            id: 1
        },
        finish: {
            name: "Concluir",
            id: 2
        },
        reject: {
            name: "Rejeitar",
            id: 3
        },
        cancel: {
            name: "Cancelar",
            id: 4
        },
        reactive: {
            name: "Reativar",
            id: 5
        },
    },
    workflow_state: {
        draft: {
            name: "Rascunho",
            id: 1
        },
        active: {
            name: "Ativo",
            id: 2
        },
        finished: {
            name: "Concluido",
            id: 3
        },
        rejected: {
            name: "Rejeitado",
            id: 4
        },
        cancelled: {
            name: "Cancelado",
            id: 5
        },
    }
};
