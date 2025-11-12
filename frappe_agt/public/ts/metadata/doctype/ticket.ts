frappe.provide("agt.metadata.doctype.ticket");

agt.metadata.doctype.ticket = {
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