frappe.provide("agt.metadata.doctype.service_protocol");

agt.metadata.doctype.service_protocol = {
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
    }
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