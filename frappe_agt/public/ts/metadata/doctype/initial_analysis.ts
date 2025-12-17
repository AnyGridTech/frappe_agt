frappe.provide("agt.metadata.doctype.initial_analysis");

agt.metadata.doctype.initial_analysis = {
  workflow_action: {
    request_revision: {
      name: "Request Review",
      id: 1
    },
    request_checklist: {
      name: "Request Checklist",
      id: 2
    },
    request_correction: {
      name: "Request Proposed Dispatch",
      id: 3
    },
    reject: {
      name: "Reject",
      id: 4
    },
    cancel: {
      name: "Cancel",
      id: 5
    },
    finish_correction: {
      name: "Approve",
      id: 6
    }
  },
  workflow_state: {
    holding_action: {
      name: "Awaiting Action",
      id: 1
    },
    growatt_review: {
      name: "Revision",
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