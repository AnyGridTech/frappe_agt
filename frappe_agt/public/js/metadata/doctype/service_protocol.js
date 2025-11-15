// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
frappe.provide("agt.metadata.doctype.service_protocol");
agt.metadata.doctype.service_protocol = {
  workflow_action: {
    request_revision: {
      name: "Solicitar Revis\xE3o",
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
      name: "Aprovar Corre\xE7\xE3o",
      id: 6
    }
  },
  workflow_state: {
    holding_action: {
      name: "Aguardando A\xE7\xE3o",
      id: 1
    },
    growatt_review: {
      name: "Revis\xE3o",
      id: 2
    },
    finished: {
      name: "Conclu\xEDdo",
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
