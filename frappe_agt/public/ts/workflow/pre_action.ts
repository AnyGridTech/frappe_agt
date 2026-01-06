"use strict"

import type { FrappeForm } from "@anygridtech/frappe-types/client/frappe/core";

declare global {
  interface Window {
    workflow_preactions?: Record<string, Record<string, (frm: FrappeForm) => Promise<void>>>;
  }
}

frappe.provide("agt.workflow.pre_action");

agt.workflow.pre_action = async (): Promise<void> => {
  // run all function recursively
  if (!window.workflow_preactions) return;
  
  // Use for..of em vez de forEach para manipular operações assíncronas corretamente
  for (const [workflow_action, routine] of Object.entries(window.workflow_preactions)) {
    if (cur_frm.states.frm.selected_workflow_action !== workflow_action) continue;
    
    // Processar cada função de pre_action de forma sequencial
    for (const [preaction, fnc] of Object.entries(routine)) {
      try {
        console.log(`Running function for ${workflow_action} - ${preaction}`);
        await fnc(cur_frm);
      } catch (e) {
        console.error("Preaction error", e);
        // Converte o erro para string para evitar problemas de tipo
        const errorMessage = e instanceof Error ? e.message : String(e);
        frappe.throw({
          title: __("Error"),
          message: errorMessage
        });
        // Quebra a execução após o primeiro erro
        break;
      } 
    }
  }
}