frappe.provide("agt.metadata.doctype.compliance_statement");

agt.metadata.doctype.compliance_statement = {
  workflow_action: {
    approve: {
      name: "Approve",
      id: 1
    },
    request_analysis: {
      name: "Request Analysis",
      id: 2
    },
    request_correction: {
      name: "Request Correction",
      id: 3
    },
    finish_review: {
      name: "Finish Review",
      id: 4
    },
    reject: {
      name: "Reject",
      id: 5
    },
    finish_service: {
      name: "Finish Service",
      id: 6
    },
    cancel: {
      name: "Cancel",
      id: 7
    },
    finish_correction: {
      name: "Finish Correction",
      id: 8
    },
    request_documentation: {
      name: "Request Documentation",
      id: 9
    },
    request_checklist: {
      name: "Request Checklist",
      id: 10
    },
    forward_to_support: {
      name: "Forward to Support",
      id: 11
    },
  },
  workflow_state: {
    customer_finish_filling: {
      name: "Customer: Finish Filling",
      id: 1
    },
    growatt_preliminary_assessment: {
      name: "Preliminary Analysis",
      id: 2
    },
    customer_fix_info: {
      name: "Customer: Fix Information",
      id: 3
    },
    growatt_review: {
      name: "Review",
      id: 4
    },
    customer_checklist_requested: {
      name: "Customer: Checklist Requested",
      id: 5
    },
    checklist_finished: {
      name: "Checklist Finished",
      id: 6
    },
    shipping_proposal: {
      name: "Shipping Proposal",
      id: 7
    },
    warranty_approved: {
      name: "Warranty Approved",
      id: 9
    },
    rejected: {
      name: "Rejected",
      id: 10
    },
    finished: {
      name: "Finished",
      id: 11
    },
    cancelled: {
      name: "Cancelled",
      id: 12
    },
    approved: {
      name: "Approved",
      id: 13
    },
    finished_fixed: {
      name: "Finished: Fixed",
      id: 14
    },
    finished_missing: {
      name: "Finished: Missing Correction",
      id: 15
    },
    customer_necessary_action: {
      name: "Customer: Action Required",
      id: 16
    },
  }
};