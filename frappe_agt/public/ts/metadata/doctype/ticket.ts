frappe.provide("agt.metadata.doctype.ticket");

agt.metadata.doctype.ticket = {
  workflow_action: {
    approve: {
      name: "Approve",
      id: 1
    },
    finish: {
      name: "Finish",
      id: 2
    },
    reject: {
      name: "Reject",
      id: 3
    },
    cancel: {
      name: "Cancel",
      id: 4
    },
    reactive: {
      name: "Reactivate",
      id: 5
    },
    hold: {
      name: "Hold",
      id: 6
    },
  },
  workflow_state: {
    draft: {
      name: "Draft",
      id: 1
    },
    active: {
      name: "Active",
      id: 2
    },
    waiting_for_customer: {
      name: "Waiting for Customer",
      id: 3
    },
    finished: {
      name: "Waiting for Customer",
      id: 4
    },
    rejected: {
      name: "Rejected",
      id: 5
    },
    cancelled: {
      name: "Cancelled",
      id: 6
    },
  }
};