frappe.provide("agt.metadata.doctype.checklist");

agt.metadata.doctype.checklist = {
  workflow_state: {
    pre_analysis: {
      name: "Preliminary Analysis",
      id: 1
    },
    customer_fix_info: {
      name: "Customer: Fix Information", 
      id: 2
    },
    growatt_review: {
      name: "Review",
      id: 3
    },
    finished: {
      name: "Finished",
      id: 4
    },
    rejected: {
      name: "Rejected",
      id: 5
    },
    cancelled: {
      name: "Cancelled",
      id: 6
    }
  }
}