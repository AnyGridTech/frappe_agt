frappe.provide("agt.namespace.checklist");

// Definição única dos valores - o tipo será inferido automaticamente
export const checklist = {
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
} as const;

// Derive o tipo da implementação real
export type ChecklistType = typeof checklist;