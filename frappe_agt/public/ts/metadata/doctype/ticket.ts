frappe.provide("agt.metadata.doctype.ticket");

agt.metadata.doctype.ticket = {
  workflow_action: {
    finish: {
      name: "Finish",
      id: 1
    },
    reject: {
      name: "Reject",
      id: 2
    },
    hold: {
      name: "Hold",
      id: 3
    },
    reactivate: {
      name: "Reactivate",
      id: 4
    },
    cancel: {
      name: "Cancel",
      id: 5
    }
  },
  workflow_state: {
    active: {
      name: "Active",
      id: 1
    },
    waiting_for_customer: {
      name: "Waiting for Customer",
      id: 2
    },
    finished: {
      name: "Finished",
      id: 3
    },
    rejected: {
      name: "Rejected",
      id: 4
    },
    cancelled: {
      name: "Cancelled",
      id: 5
    }
  }
};