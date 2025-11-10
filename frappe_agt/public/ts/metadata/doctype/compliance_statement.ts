import type { ComplianceStatement } from "@anygridtech/frappe-agt-types/agt/client/metadata/doctype/compliance_statement.d.ts";

frappe.provide("agt.namespace.compliance_statement");

export const compliance_statement: ComplianceStatement = {
  workflow_action: {
    approve: {
      name: "Aprovar",
      id: 1
    },
    request_analysis: {
      name: "Solicitar Análise",
      id: 2
    },
    request_correction: {
      name: "Solicitar Correção",
      id: 3
    },
    finish_review: {
      name: "Finalizar Revisão",
      id: 4
    },
    reject: {
      name: "Rejeitar",
      id: 5
    },
    finish_service: {
      name: "Finalizar Atendimento",
      id: 6
    },
    cancel: {
      name: "Cancelar",
      id: 7
    },
    finish_correction: {
      name: "Finalizar Correção",
      id: 8
    },
    request_documentation: {
      name: "Solicitar Documentação",
      id: 9
    },
    request_checklist: {
      name: "Solicitar Checklist",
      id: 10
    },
    forward_to_support: {
      name: "Encaminhar ao Suporte",
      id: 11
    },
  },
  workflow_state: {
    customer_finish_filling: {
      name: "Cliente: Finalizar Preenchimento",
      id: 1
    },
    growatt_preliminary_assessment: {
      name: "Análise Preliminar",
      id: 2
    },
    customer_fix_info: {
      name: "Cliente: Corrigir Informações",
      id: 3
    },
    growatt_review: {
      name: "Revisão",
      id: 4
    },
    customer_checklist_requested: {
      name: "Cliente: Checklist Solicitado",
      id: 5
    },
    checklist_finished: {
      name: "Checklist Concluído",
      id: 6
    },
    shipping_proposal: {
      name: "Proposta de Envio",
      id: 7
    },
    warranty_approved: {
      name: "Garantia Aprovada",
      id: 9
    },
    rejected: {
      name: "Rejeitado",
      id: 10
    },
    finished: {
      name: "Concluído",
      id: 11
    },
    cancelled: {
      name: "Cancelado",
      id: 12
    },
    approved: {
      name: "Aprovado",
      id: 13
    },
    finished_fixed: {
      name: "Finalizado: Corrigido",
      id: 14
    },
    finished_missing: {
      name: "Finalizado: Correção Faltante",
      id: 15
    },
    customer_necessary_action: {
      name: "Cliente: Ação Necessária",
      id: 16
    },
  }
};