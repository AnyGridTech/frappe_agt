frappe.provide("agt.metadata.doctype.checklist");

agt.metadata.doctype.checklist = {
  workflow_action: {
    request_revision: {
      name: "Review",
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
    approve_correction: {
      name: "Approve Correction",
      id: 5
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