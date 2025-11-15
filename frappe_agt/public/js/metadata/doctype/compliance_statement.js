// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
frappe.provide("agt.metadata.doctype.compliance_statement");
agt.metadata.doctype.compliance_statement = {
  workflow_action: {
    approve: {
      name: "Aprovar",
      id: 1
    },
    request_analysis: {
      name: "Solicitar An\xE1lise",
      id: 2
    },
    request_correction: {
      name: "Solicitar Corre\xE7\xE3o",
      id: 3
    },
    finish_review: {
      name: "Finalizar Revis\xE3o",
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
      name: "Finalizar Corre\xE7\xE3o",
      id: 8
    },
    request_documentation: {
      name: "Solicitar Documenta\xE7\xE3o",
      id: 9
    },
    request_checklist: {
      name: "Solicitar Checklist",
      id: 10
    },
    forward_to_support: {
      name: "Encaminhar ao Suporte",
      id: 11
    }
  },
  workflow_state: {
    customer_finish_filling: {
      name: "Cliente: Finalizar Preenchimento",
      id: 1
    },
    growatt_preliminary_assessment: {
      name: "An\xE1lise Preliminar",
      id: 2
    },
    customer_fix_info: {
      name: "Cliente: Corrigir Informa\xE7\xF5es",
      id: 3
    },
    growatt_review: {
      name: "Revis\xE3o",
      id: 4
    },
    customer_checklist_requested: {
      name: "Cliente: Checklist Solicitado",
      id: 5
    },
    checklist_finished: {
      name: "Checklist Conclu\xEDdo",
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
      name: "Conclu\xEDdo",
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
      name: "Finalizado: Corre\xE7\xE3o Faltante",
      id: 15
    },
    customer_necessary_action: {
      name: "Cliente: A\xE7\xE3o Necess\xE1ria",
      id: 16
    }
  }
};
