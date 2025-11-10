import type { Checklist } from "@anygridtech/frappe-agt-types/agt/client/metadata/doctype/checklist";

frappe.provide("agt.namespace");

export const checklist: Checklist = {
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

// Atribui ao namespace global
agt.namespace.checklist = checklist;