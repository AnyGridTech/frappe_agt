// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
frappe.provide("agt.namespace");
const checklist = {
  workflow_state: {
    pre_analysis: {
      name: "An\xE1lise Preliminar",
      id: 1
    },
    customer_fix_info: {
      name: "Cliente: Corrigir Informa\xE7\xF5es",
      id: 2
    },
    growatt_review: {
      name: "Revis\xE3o",
      id: 3
    },
    finished: {
      name: "Conclu\xEDdo",
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
agt.namespace.checklist = checklist;
export {
  checklist
};
