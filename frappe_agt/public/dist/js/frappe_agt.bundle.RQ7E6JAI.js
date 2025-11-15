"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // ../frappe_agt/frappe_agt/public/ts/checklist/checklists.ts
  frappe.provide("agt.checklist");
  agt.checklist = {
    table: {
      all: { setup: async () => {
      } },
      inverter: { setup: async () => {
      } },
      ev_charger: { setup: async () => {
      } },
      battery: { setup: async () => {
      } },
      transformer: { setup: async () => {
      } },
      smart_meter: { setup: async () => {
      } },
      smart_energy_manager: { setup: async () => {
      } },
      datalogger: { setup: async () => {
      } }
    },
    tracker_table: {
      all: { setup: async () => {
      } },
      inverter: { setup: async () => {
      } },
      ev_charger: { setup: async () => {
      } },
      battery: { setup: async () => {
      } },
      transformer: { setup: async () => {
      } },
      smart_meter: { setup: async () => {
      } },
      smart_energy_manager: { setup: async () => {
      } },
      datalogger: { setup: async () => {
      } }
    },
    setup: async () => {
      frappe.ui.form.on(cur_frm.doctype, {
        after_save: function(frm) {
          agt.utils.form.field.validate_js_visible_fields(frm, "Customer Fix Info").msgprint();
        },
        before_workflow_action: async function(frm) {
          if (frm.doc.__islocal)
            return;
          const action = frm.states.frm.selected_workflow_action;
          if (action === "Encaminhar ao Suporte") {
            agt.utils.form.field.validate_js_visible_fields(frm, "Pre Analysis").throw_error();
          }
          if (action === "Concluir Checklist") {
            agt.utils.form.field.validate_js_visible_fields(frm, "Pre Analysis").throw_error();
            await trigger_checklist_finished_func(frm);
          }
          if (action === "Rejeitar") {
            agt.utils.update_workflow_state({
              doctype: "Service Protocol",
              docname: frm.doc["sp_docname"],
              workflow_state: "Holding Action",
              ignore_workflow_validation: true
            });
          }
          if (action === "Solicitar Proposta de Envio") {
            agt.utils.form.field.validate_js_visible_fields(frm, "Pre Analysis").throw_error();
            await trigger_checklist_finished_func(frm);
            await trigger_proposed_dispatch_func(frm);
          }
          return;
        }
      });
      let trigger_proposed_dispatch = false;
      const trigger_proposed_dispatch_func = async (frm) => {
        if (frm.doc.__islocal)
          return;
        if (trigger_proposed_dispatch) {
          console.log("Requisi\xE7\xE3o em andamento, ignorando chamada...");
          return;
        }
        trigger_proposed_dispatch = true;
        try {
          const swa = frm.states.frm.selected_workflow_action;
          const swa_request_dispatch = "Solicitar Proposta de Envio";
          if (swa !== swa_request_dispatch) {
            throw new Error("A a\xE7\xE3o selecionada n\xE3o permite criar uma Proposta de Envio.");
          }
          const dt_name = "Proposed Dispatch";
          const existingDispatches = await frappe.db.get_list(dt_name, {
            filters: { ticket_docname: frm.doc["ticket_docname"] },
            fields: ["name"]
          });
          if (existingDispatches && existingDispatches.length > 0) {
            const existing_list_html = existingDispatches.map((ticket) => `<li>${ticket.name}</li>`).join("");
            throw new Error(`J\xE1 existe uma Proposta de Envio vinculada a este Ticket: <br><ul>${existing_list_html}</ul>`);
          }
          const freshDispatches = await frappe.db.get_list(dt_name, {
            filters: { ticket_docname: frm.doc["ticket_docname"] },
            fields: ["name"]
          });
          if (freshDispatches && freshDispatches.length > 0)
            return;
          const docname = await agt.utils.doc.create_doc(dt_name, { ticket_docname: "ticket_docname" }, frm.fields_dict);
          if (!docname) {
            throw new Error("Falha ao criar Proposta de Envio.");
          }
          console.log("Proposta de Envio criada com sucesso:", docname);
          const main_eqp_group = frm.doc["main_eqp_group"];
          if (!main_eqp_group) {
            throw new Error("Grupo do equipamento principal n\xE3o definido.");
          }
          await agt.utils.table.row.add_one(frm, "proposed_dispatch_table", {
            item_name: main_eqp_group,
            item_quantity: 1
          });
          frm.dirty();
          console.log("Linha adicionada na tabela 'proposed_dispatch_table' com sucesso.");
          await frm.save();
        } catch (error) {
          console.error("Erro ao criar Proposta de Envio:", error);
          frappe.msgprint({
            title: "Erro ao criar Proposta de Envio",
            message: error instanceof Error ? error.message : String(error),
            indicator: "red"
          });
        } finally {
          trigger_proposed_dispatch = false;
        }
      };
      let trigger_checklist_finished = false;
      const trigger_checklist_finished_func = async (form) => {
        if (form.doc.__islocal)
          return;
        if (trigger_checklist_finished) {
          console.log("Requisi\xE7\xE3o em andamento, ignorando chamada...");
          return;
        }
        trigger_checklist_finished = true;
        try {
          agt.utils.update_workflow_state({
            doctype: "Service Protocol",
            docname: form.doc["sp_docname"],
            workflow_state: "Finished",
            ignore_workflow_validation: true
          });
          frappe.msgprint({
            title: "Checklist conclu\xEDdo!",
            message: "Voc\xEA ser\xE1 redirecionado novamente ao 'Service Protocol' para solicitar a proposta de envio.",
            indicator: "blue"
          });
          form.dirty();
          setTimeout(() => {
            const url = `/app/service-protocol/${form.doc["sp_docname"]}`;
            window.open(url, "_blank");
          }, 500);
          await form.save();
        } catch (error) {
          console.error("Erro ao mover o workflow state do Service Protocol:", error);
          frappe.msgprint({
            title: "Erro",
            message: "Algo deu errado. Por favor, entre em contato com a equipe de Tecnologia da Informa\xE7\xE3o.",
            indicator: "red"
          });
        } finally {
          trigger_checklist_finished = false;
        }
      };
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/corrections_tracker/table.ts
  frappe.provide("agt.corrections_tracker_table");
  agt.corrections_tracker.table = {
    async mirror_child_tracker_table(frm, doctypes, field) {
      var _a;
      const parent_doc_name = frm.doc.name;
      if (!parent_doc_name)
        return;
      if (!((_a = frm.fields_dict) == null ? void 0 : _a["child_tracker_table"])) {
        console.warn(`Campo 'child_tracker_table' n\xE3o encontrado no formul\xE1rio`);
        return;
      }
      const getDoctypeMeta = async (doctype) => {
        await frappe.model.with_doctype(doctype);
        const meta = frappe.get_meta ? frappe.get_meta(doctype) : frappe.meta && frappe.meta[doctype];
        const hasWorkflowState = !!(meta && Array.isArray(meta.fields) && meta.fields.some((f) => f.fieldname === "workflow_state"));
        return { meta, hasWorkflowState };
      };
      const fetchRelatedDocs = async (doctype, field2, parent_doc_name2, frm2) => {
        const { hasWorkflowState } = await getDoctypeMeta(doctype);
        const fieldsToFetch = hasWorkflowState ? ["name", "workflow_state"] : ["name"];
        const docs = await frappe.db.get_list(doctype, {
          filters: { [field2]: parent_doc_name2 },
          fields: fieldsToFetch
        });
        return docs.filter((doc) => doc.name !== frm2.doc.name).map((doc) => ({
          child_tracker_docname: doc.name,
          child_tracker_workflow_state: hasWorkflowState ? doc.workflow_state || "---" : "---",
          child_tracker_doctype: doctype
        }));
      };
      const isChildTrackerSynced = (current, remote) => {
        if (current.length !== remote.length)
          return false;
        const currentMap = new Map(current.map((row) => [`${row.child_tracker_docname}_${row.child_tracker_doctype}`, row]));
        const remoteMap = new Map(remote.map((r) => [`${r.child_tracker_docname}_${r.child_tracker_doctype}`, r]));
        const allDocsExist = current.every((row) => remoteMap.has(`${row.child_tracker_docname}_${row.child_tracker_doctype}`)) && remote.every((row) => currentMap.has(`${row.child_tracker_docname}_${row.child_tracker_doctype}`));
        if (!allDocsExist)
          return false;
        return !remote.some((remoteItem) => {
          const key = `${remoteItem.child_tracker_docname}_${remoteItem.child_tracker_doctype}`;
          const currentItem = currentMap.get(key);
          return currentItem && currentItem.child_tracker_workflow_state !== remoteItem.child_tracker_workflow_state;
        });
      };
      let allRelatedDocs = [];
      for (const doctype of doctypes) {
        try {
          const relatedDocs = await fetchRelatedDocs(doctype, field, parent_doc_name, frm);
          allRelatedDocs = allRelatedDocs.concat(relatedDocs);
        } catch (error) {
          console.error(`Error fetching ${doctype}:`, error);
          continue;
        }
      }
      const currentTable = frm.doc["child_tracker_table"] || [];
      const needsUpdate = !isChildTrackerSynced(currentTable, allRelatedDocs);
      if (!needsUpdate) {
        console.log(`Tabela 'child_tracker_table' j\xE1 est\xE1 sincronizada.`);
        return;
      }
      frm.doc["child_tracker_table"] = allRelatedDocs;
      frm.dirty();
      frm.refresh_field("child_tracker_table");
      await frm.save();
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/corrections_tracker/run.ts
  frappe.provide("agt.corrections_tracker");
  var STATUS = {
    WORKFLOW: {
      AWAITING_ACTION: "Aguardando A\xE7\xE3o",
      REVIEW: "Revis\xE3o"
    },
    ROW: {
      PENDING: "Pendente",
      FINISHED: "Conclu\xEDdo"
    }
  };
  var ACTION = {
    REQUEST_REVIEW: "Solicitar Revis\xE3o",
    APPROVE_CORRECTION: "Aprovar Corre\xE7\xE3o",
    NEW_CORRECTION: "Novo Pedido"
  };
  function getPending(rows) {
    return rows.filter((row) => row.status === STATUS.ROW.PENDING);
  }
  function getCorrectionsHtml(rows) {
    return getPending(rows).map((row) => {
      const label = row.correction_label;
      const text = row.correction_text;
      return `<li>\u26A0\uFE0F ${label || ""}${label && text ? ": " : ""}${text || ""}</li>`;
    }).join("");
  }
  function getDialogFields(rows) {
    return getPending(rows).map((row, idx) => ({
      fieldname: `chk_${idx}`,
      fieldtype: "Check",
      label: `${row.correction_label || `Pedido ${idx + 1}`}${row.correction_text ? ` \u2014 ${row.correction_text}` : ""}`,
      default: 0
    }));
  }
  async function approveCorrections(form, rows, onDone) {
    const pending = getPending(rows);
    if (!pending.length) {
      frappe.msgprint("N\xE3o existem pend\xEAncias para aprovar.");
      return;
    }
    const d = new frappe.ui.Dialog({
      title: "Marcar corre\xE7\xF5es como conclu\xEDdas",
      fields: getDialogFields(rows),
      primary_action_label: "Confirmar e Aprovar Corre\xE7\xE3o",
      secondary_action_label: "Cancelar"
    });
    d.set_primary_action("Confirmar e Aprovar Corre\xE7\xE3o", async () => {
      const values = d.get_values();
      if (!Object.values(values).every((v) => v === 1 || v === true)) {
        frappe.msgprint({ title: "Aten\xE7\xE3o", message: `Para aprovar a corre\xE7\xE3o, marque todas as pend\xEAncias como corrigidas.`, indicator: "orange" });
        return;
      }
      await Promise.all(pending.map((row) => agt.utils.table.row.update_one(row, {
        status: STATUS.ROW.FINISHED,
        finished_by: frappe.boot.user.email,
        finished_date: frappe.datetime.now_datetime()
      })));
      form.dirty();
      form.refresh_field("corrections_tracker");
      await form.save();
      d.hide();
      await agt.utils.update_workflow_state({
        doctype: form.doctype,
        docname: form.docname,
        workflow_state: STATUS.WORKFLOW.AWAITING_ACTION,
        ignore_workflow_validation: true,
        callback: async () => {
          frappe.msgprint({ title: "Corre\xE7\xF5es aprovadas", message: `Todas as pend\xEAncias foram marcadas como conclu\xEDdas.`, indicator: "green" });
          form.dirty();
          form.refresh_field("corrections_tracker");
          await form.save();
          onDone && onDone();
        }
      });
    });
    d.show();
  }
  function loadAdminButtons() {
    if (!frappe.boot.user.roles.includes("System Manager"))
      return;
    Object.values(STATUS.WORKFLOW).forEach((status) => {
      cur_frm.add_custom_button(`Ir para ${status}`, async () => {
        await agt.utils.update_workflow_state({
          doctype: cur_frm.doctype,
          docname: cur_frm.docname,
          workflow_state: status,
          ignore_workflow_validation: true
        });
      });
    });
  }
  agt.corrections_tracker.run = {
    status: STATUS,
    action: ACTION,
    run: async () => {
      var _a;
      if (cur_frm.doc.__islocal || !((_a = cur_frm.fields_dict) == null ? void 0 : _a["corrections_tracker"]))
        return;
      const meta = await agt.utils.doc.get_doc_meta("Corrections Tracker");
      if (!meta)
        return;
      const correctionLabelFields = {};
      meta.fields.forEach((field) => {
        if (field.fieldname === "correction_label")
          correctionLabelFields[field.fieldname] = field;
      });
      const labels = Object.values(cur_frm.fields_dict).filter((f) => f.df.permlevel === 0 && !f.df.read_only && !f.df.hidden && !["Section Break", "Column Break", "Button", "Table"].includes(f.df.fieldtype)).map((f) => {
        var _a2;
        return (_a2 = f.df.label || f.__label) == null ? void 0 : _a2.trim();
      }).filter(Boolean);
      frappe.ui.form.on(cur_frm.doctype, "corrections_tracker_on_form_rendered", async function() {
        var _a2;
        if (!((_a2 = cur_frm.cur_grid) == null ? void 0 : _a2.doc.__islocal))
          return;
        Object.keys(correctionLabelFields).forEach((fieldName) => {
          var _a3;
          return (_a3 = cur_frm.cur_grid) == null ? void 0 : _a3.set_field_property(fieldName, "options", labels);
        });
      });
      frappe.ui.form.on(cur_frm.doctype, {
        async before_workflow_action(form) {
          var _a2, _b;
          const ws = form.doc.workflow_state;
          const action = (_b = (_a2 = form.states) == null ? void 0 : _a2.frm) == null ? void 0 : _b.selected_workflow_action;
          const rows = form.doc["corrections_tracker"] || [];
          if (ws === STATUS.WORKFLOW.AWAITING_ACTION && action === ACTION.REQUEST_REVIEW) {
            if (!getPending(rows).length)
              frappe.throw(`Adicione ao menos um pedido de corre\xE7\xE3o (status "Pendente") antes de solicitar revis\xE3o.`);
            await agt.utils.update_workflow_state({
              doctype: form.doctype,
              docname: form.docname,
              workflow_state: STATUS.WORKFLOW.REVIEW,
              ignore_workflow_validation: true,
              callback: async () => {
                frappe.msgprint({ title: "Enviado para Revis\xE3o", message: `O documento foi enviado para "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
                form.dirty();
                form.refresh_field("corrections_tracker");
                await form.save();
              }
            });
            return false;
          }
          return true;
        },
        async before_save(form) {
          const rows = form.doc["corrections_tracker"] || [];
          const activeLabels = getPending(rows).map((row) => row.correction_label).filter(Boolean);
          if (new Set(activeLabels).size < activeLabels.length) {
            frappe.throw(`<b>Falha ao salvar:</b><br>Existem 'R\xF3tulos da Corre\xE7\xE3o' duplicados entre os pedidos ativos. Cada pedido deve referir um campo \xFAnico.`);
          }
          getPending(rows).forEach((row) => {
            if (!row.correction_label || !row.correction_text) {
              frappe.throw(`<b>Falha ao salvar:</b><br>Para cada pedido com status "Pendente" \xE9 necess\xE1rio preencher 'R\xF3tulo da Corre\xE7\xE3o' e 'Texto da Corre\xE7\xE3o'.`);
            }
          });
        },
        async after_save(form) {
          const ws = form.doc.workflow_state;
          const rows = form.doc["corrections_tracker"] || [];
          const pending = getPending(rows);
          if (!pending.length)
            return;
          const html = getCorrectionsHtml(rows);
          if (!html.length)
            return;
          if (ws === STATUS.WORKFLOW.AWAITING_ACTION) {
            const confirmDiag = frappe.confirm(`Existem pedidos pendentes. Deseja enviar para "<b>${STATUS.WORKFLOW.REVIEW}</b>" agora?<br><br><ul>${html}</ul>`, async () => {
              await agt.utils.update_workflow_state({
                doctype: form.doctype,
                docname: form.docname,
                workflow_state: STATUS.WORKFLOW.REVIEW,
                ignore_workflow_validation: true,
                callback: async () => {
                  frappe.msgprint({ title: "Enviado para Revis\xE3o", message: `O documento foi enviado para "<b>${STATUS.WORKFLOW.REVIEW}</b>".`, indicator: "blue" });
                  form.dirty();
                  form.refresh_field("corrections_tracker");
                }
              });
            });
            confirmDiag.set_primary_action("Sim, enviar para revis\xE3o.");
            confirmDiag.set_secondary_action_label("N\xE3o, depois.");
          }
          if (ws === STATUS.WORKFLOW.REVIEW) {
            frappe.msgprint({ title: "Corre\xE7\xF5es pendentes", message: `Confirme se os seguintes itens foram corrigidos pelo cliente:<br><br><ul>${html}</ul>`, indicator: "orange" });
          }
        },
        async refresh() {
          loadAdminButtons();
        },
        async onload(form) {
          loadAdminButtons();
          form.set_df_property("corrections_tracker", "cannot_delete_rows", 1);
          const rows = form.doc["corrections_tracker"] || [];
          if (getPending(rows).length)
            form.set_df_property("corrections_tracker", "cannot_add_rows", 1);
          if (form.doc.workflow_state === STATUS.WORKFLOW.REVIEW) {
            form.add_custom_button("Aprovar Corre\xE7\xE3o", async () => approveCorrections(form, rows));
            form.add_custom_button(ACTION.NEW_CORRECTION, async () => {
              const confirmDiag = frappe.confirm("Tem certeza que deseja criar um novo pedido de corre\xE7\xE3o?", async () => {
                const finishedRows = (form.doc["corrections_tracker"] || []).filter((row) => row.status === STATUS.ROW.FINISHED);
                await Promise.all(finishedRows.map((row) => agt.utils.table.row.update_one(row, {
                  status: STATUS.ROW.FINISHED,
                  finished_by: frappe.boot.user.email,
                  finished_date: frappe.datetime.now_datetime()
                })));
                setTimeout(() => {
                  form.set_df_property("corrections_tracker", "cannot_add_rows", 0);
                  frappe.msgprint("Crie um novo pedido de corre\xE7\xE3o para o cliente com os campos faltantes.");
                }, 2e3);
              });
              confirmDiag.set_primary_action("Sim, criar novo pedido.");
              confirmDiag.set_secondary_action_label("N\xE3o, cancelar.");
            });
          }
          const html = getCorrectionsHtml(rows);
          if (!getPending(rows).length || !html.length)
            return;
          let msg = `<ul>${html}</ul><br>`;
          msg += form.doc.workflow_state === STATUS.WORKFLOW.REVIEW ? `<p>Marque cada pend\xEAncia como corrigida no bot\xE3o 'Aprovar Corre\xE7\xE3o'. S\xF3 ser\xE1 poss\xEDvel aprovar se todas estiverem marcadas.</p>` : `<p>H\xE1 pedidos pendentes. Voc\xEA pode enviar para revis\xE3o clicando em '${ACTION.REQUEST_REVIEW}'.</p>`;
          frappe.msgprint({ title: "Pedidos de Corre\xE7\xE3o Pendentes", message: msg, indicator: "orange" });
        }
      });
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/ui/enhanced_dialog.ts
  frappe.provide("agt.ui.enhanced_dialog");
  frappe.ui.Dialog = class EnhancedDialog extends frappe.ui.Dialog {
    constructor(opts) {
      super(opts);
      this["$wrapper"].on("show.bs.modal", () => {
        const wrapperEl = this["$wrapper"][0];
        wrapperEl.style.left = "";
        wrapperEl.style.top = "";
        wrapperEl.style.margin = "";
      });
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        this["$wrapper"].addClass("modal-fullscreen");
        this["$wrapper"].css({
          width: "100%",
          height: "100%",
          top: 0,
          left: 0,
          margin: 0,
          borderRadius: 0
        });
        this["$wrapper"].find(".modal-content").css({
          height: "100%",
          borderRadius: 0
        });
      }
      this["$wrapper"].on("keydown", (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      });
      this["$wrapper"].on("click", (e) => {
        if ($(e.target).hasClass("modal")) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      });
      this.makeDraggable();
    }
    makeDraggable() {
      const wrapperEl = this["$wrapper"][0];
      const headerEl = this["$wrapper"].find(".modal-header")[0];
      let dragging = false;
      let offsetX = 0;
      let offsetY = 0;
      const startDrag = (clientX, clientY) => {
        dragging = true;
        offsetX = clientX - wrapperEl.offsetLeft;
        offsetY = clientY - wrapperEl.offsetTop;
      };
      const doDrag = (clientX, clientY) => {
        if (dragging) {
          wrapperEl.style.left = `${clientX - offsetX}px`;
          wrapperEl.style.top = `${clientY - offsetY}px`;
        }
      };
      headerEl.addEventListener("mousedown", (e) => {
        if (e.target.closest('.modal-header .close, .modal-header .btn-close, [data-dismiss="modal"]')) {
          return;
        }
        startDrag(e.clientX, e.clientY);
      });
      document.addEventListener("mousemove", (e) => doDrag(e.clientX, e.clientY));
      document.addEventListener("mouseup", () => {
        dragging = false;
      });
      headerEl.addEventListener("touchstart", (e) => {
        const target = e.target;
        if (target.closest('.modal-header .close, .modal-header .btn-close, [data-dismiss="modal"]')) {
          return;
        }
        const touch = e.touches[0];
        if (touch) {
          startDrag(touch.clientX, touch.clientY);
          doDrag(touch.clientX, touch.clientY);
        }
        e.preventDefault();
      }, { passive: false });
      document.addEventListener("touchend", () => {
        dragging = false;
      });
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/ui/ultra_dialog.ts
  frappe.provide("agt.ui.ultra_dialog");
  var UltraDialogImpl = class {
    constructor(props) {
      __publicField(this, "modal", null);
      __publicField(this, "header", null);
      __publicField(this, "body", null);
      __publicField(this, "footer", null);
      __publicField(this, "backdrop", null);
      __publicField(this, "hide_btn", null);
      __publicField(this, "copy_btn", null);
      __publicField(this, "close_btn", null);
      __publicField(this, "themeKeyCacheLocal", "");
      __publicField(this, "body_prefix_id", "ultra-modal-body");
      __publicField(this, "header_prefix_id", "ultra-modal-header");
      __publicField(this, "footer_prefix_id", "ultra-modal-footer");
      __publicField(this, "close_prefix_id", "ultra-modal-close");
      __publicField(this, "copy_prefix_id", "ultra-modal-copy");
      __publicField(this, "hide_prefix_id", "ultra-modal-hide");
      __publicField(this, "body_id", "");
      __publicField(this, "header_id", "");
      __publicField(this, "footer_id", "");
      __publicField(this, "hide_id", "");
      __publicField(this, "copy_id", "");
      __publicField(this, "close_id", "");
      __publicField(this, "close_btn_default", __("Fechar"));
      __publicField(this, "close_btn_waiting", `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> ${__("Aguarde...")}`);
      __publicField(this, "hide_btn_default", __("Ocultar"));
      __publicField(this, "hide_btn_show", __("Mostrar"));
      __publicField(this, "id");
      __publicField(this, "title");
      __publicField(this, "message");
      __publicField(this, "size", 360);
      __publicField(this, "zOrder", 1050);
      __publicField(this, "can_copy", true);
      __publicField(this, "can_hide", true);
      __publicField(this, "can_close", true);
      __publicField(this, "can_drag", true);
      __publicField(this, "can_drag_mobile", true);
      __publicField(this, "auto_scroll", true);
      __publicField(this, "backdrop_blur", true);
      __publicField(this, "state", "default");
      this.title = props.title;
      this.message = props.message;
      this.generate_random_id();
      this.default_initialization();
      this.parameters_initialization(props);
    }
    parameters_initialization(props) {
      var _a, _b, _c, _d, _e;
      this.visible(props.visible);
      this.show_hide_btn((_a = props.can_hide) != null ? _a : true);
      this.show_copy_btn((_b = props.can_copy) != null ? _b : true);
      this.show_close_btn((_c = props.can_close) != null ? _c : true);
      this.set_drag((_d = props.can_drag) != null ? _d : true);
      this.set_drag_mobile((_e = props.can_drag_mobile) != null ? _e : true);
      this.set_state(props.initial_state || "default");
    }
    default_initialization() {
      this.create_modal();
      this.create_header();
      this.create_body();
      this.create_footer();
      this.load_theme_changer();
      this.load_dialog_dragger();
      if (this.message) {
        this.set_message(this.message, { auto_scroll: this.auto_scroll });
      }
    }
    generate_random_id() {
      this.id = `${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      this.body_id = `${this.body_prefix_id}-${this.id}`;
      this.header_id = `${this.header_prefix_id}-${this.id}`;
      this.footer_id = `${this.footer_prefix_id}-${this.id}`;
      this.close_id = `${this.close_prefix_id}-${this.id}`;
      this.copy_id = `${this.copy_prefix_id}-${this.id}`;
      this.hide_id = `${this.hide_prefix_id}-${this.id}`;
    }
    create_modal() {
      if (this.modal) {
        return this.modal;
      }
      this.modal = document.createElement("div");
      this.modal.id = this.id;
      this.modal.setAttribute("name", "modal");
      this.modal.style.position = "fixed";
      this.modal.style.top = "120px";
      this.modal.style.left = "50%";
      this.modal.style.transform = "translateX(-50%)";
      this.modal.style.width = `${this.size}px`;
      this.modal.style.maxWidth = "90%";
      this.modal.style.zIndex = `${this.zOrder}`;
      this.modal.setAttribute("role", "dialog");
      this.modal.setAttribute("aria-modal", "true");
      this.modal.setAttribute("aria-labelledby", this.header_id);
      this.modal.setAttribute("aria-describedby", this.body_id);
      const rootStyles = getComputedStyle(document.documentElement);
      const backgroundColor = rootStyles.getPropertyValue("--bg-color").trim() || "#fff";
      const textColor = rootStyles.getPropertyValue("--text-color").trim() || "#212529";
      const borderColor = rootStyles.getPropertyValue("--border-color").trim() || "#ced4da";
      this.modal.style.backgroundColor = backgroundColor;
      this.modal.style.color = textColor;
      this.modal.style.border = `1px solid ${borderColor}`;
      this.modal.style.borderRadius = "6px";
      this.modal.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
      this.modal.style.fontFamily = "inherit";
      this.modal.style.userSelect = "none";
      document.body.appendChild(this.modal);
      return this.modal;
    }
    create_header() {
      if (this.header) {
        console.warn(`Header already exists. You can not create another header for modal id: ${this.id}`);
        return this.header;
      }
      this.header = document.createElement("div");
      this.header.id = this.header_id;
      this.header.setAttribute("name", "header");
      this.header.style.padding = "10px";
      this.header.style.backgroundColor = "#f5f5f5";
      this.header.style.color = "#212529";
      this.header.style.borderBottom = `1px solid #ced4da`;
      this.header.style.fontWeight = "bold";
      this.header.textContent = this.title;
      this.header.style.cursor = this.can_drag || this.can_drag_mobile ? "move" : "default";
      this.header.style.borderRadius = "6px 6px 0 0";
      if (this.modal) {
        this.modal.appendChild(this.header);
      } else {
        console.error(`Could not initialize the header. Modal is not yet defined, please instantiate the modal before trying to create the header. Modal ID: ${this.id}`);
      }
      return this.header;
    }
    create_body() {
      if (this.body) {
        return this.body;
      }
      this.body = document.createElement("div");
      this.body.id = this.body_id;
      this.body.setAttribute("name", "body");
      this.body.style.padding = "10px";
      this.body.style.maxHeight = "300px";
      this.body.style.overflowY = "auto";
      if (this.modal) {
        this.modal.appendChild(this.body);
      } else {
        console.error(`Could not initialize the body. Modal is not yet defined, please instantiate the modal before trying to create the body. Modal ID: ${this.id}`);
      }
      return this.body;
    }
    create_footer() {
      if (this.footer) {
        return this.footer;
      }
      this.footer = document.createElement("div");
      this.footer.id = this.footer_id;
      this.footer.setAttribute("name", "footer");
      this.footer.style.padding = "10px";
      this.footer.style.display = "flex";
      this.footer.style.justifyContent = "flex-end";
      this.footer.style.gap = "10px";
      this.footer.style.borderTop = `1px solid #ced4da`;
      this.footer.style.borderRadius = "0 0 6px 6px";
      if (this.modal) {
        this.modal.appendChild(this.footer);
      } else {
        console.error(`Could not initialize the footer. Modal is not yet defined, please instantiate the modal before trying to create the footer. Modal ID: ${this.id}`);
      }
      return this.footer;
    }
    create_backdrop() {
      if (this.backdrop) {
        return this.backdrop;
      }
      this.backdrop = document.createElement("div");
      this.backdrop.style.position = "fixed";
      this.backdrop.style.top = "0";
      this.backdrop.style.left = "0";
      this.backdrop.style.width = "100vw";
      this.backdrop.style.height = "100vh";
      this.backdrop.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
      this.backdrop.style.zIndex = `${this.zOrder - 1}`;
      if (this.backdrop_blur) {
        this.backdrop.style.backdropFilter = "blur(2px)";
      }
      document.body.appendChild(this.backdrop);
      return this.backdrop;
    }
    destroy_backdrop() {
      if (this.backdrop) {
        this.backdrop.remove();
        this.backdrop = null;
      }
    }
    set_message(message, options) {
      const bodyElement = document.getElementById(this.body_id);
      if (!bodyElement) {
        console.error(
          `UltraDialog body element not found for ID: ${this.body_id}`
        );
        return this;
      }
      const messageElement = document.createElement("div");
      messageElement.style.marginBottom = "8px";
      messageElement.innerHTML = message;
      bodyElement.appendChild(messageElement);
      const shouldScroll = (options == null ? void 0 : options.auto_scroll) !== void 0 ? options.auto_scroll : this.auto_scroll;
      if (shouldScroll) {
        setTimeout(() => {
          bodyElement.scrollTop = bodyElement.scrollHeight;
        }, 500);
      }
      return this;
    }
    set_title(title) {
      if (!this.header)
        return this;
      this.title = title;
      this.header.textContent = title;
      return this;
    }
    create_hide_btn() {
      if (!this.footer)
        return;
      this.hide_btn = document.createElement("button");
      this.hide_btn.id = this.hide_id;
      this.hide_btn.setAttribute("name", "hide_btn");
      this.hide_btn.className = "btn btn-sm btn-secondary";
      const isHidden = this.body && this.body.style.display === "none";
      this.hide_btn.textContent = isHidden ? this.hide_btn_default : this.hide_btn_show;
      this.hide_btn.onclick = () => {
        if (this.hide_btn === null)
          return;
        if (!this.body)
          return;
        if (this.body.style.display === "none") {
          this.body.style.display = "";
          this.hide_btn.textContent = this.hide_btn_default;
        } else {
          this.body.style.display = "none";
          this.hide_btn.textContent = this.hide_btn_show;
        }
      };
      this.footer.insertBefore(this.hide_btn, this.footer.firstChild);
      return this.hide_btn;
    }
    show_hide_btn(show) {
      if (!this.footer)
        return this;
      if (!show && this.hide_btn)
        this.removeElementById(this.hide_id);
      if (show && !this.hide_btn)
        this.create_hide_btn();
      return this;
    }
    create_copy_btn() {
      if (!this.footer)
        return;
      this.copy_btn = document.createElement("button");
      this.copy_btn.id = this.copy_id;
      this.copy_btn.setAttribute("name", "copy_btn");
      this.copy_btn.className = "btn btn-sm btn-secondary";
      this.copy_btn.textContent = __("Copiar");
      this.copy_btn.onclick = () => {
        var _a;
        const logContainer = this.body;
        if (!logContainer || !((_a = logContainer.textContent) == null ? void 0 : _a.trim())) {
          frappe.show_alert({ message: __("Nenhuma mensagem para copiar."), indicator: "orange" }, 5);
          return;
        }
        navigator.clipboard.writeText(logContainer.innerText || logContainer.textContent || "").then(() => frappe.show_alert({ message: __("Mensagens copiadas."), indicator: "green" }, 5)).catch((err) => {
          console.error("Erro ao copiar:", err);
          frappe.show_alert({ message: __("Falha ao copiar mensagens."), indicator: "red" }, 5);
        });
      };
      if (this.hide_btn && this.hide_btn.nextSibling)
        this.footer.insertBefore(this.copy_btn, this.hide_btn.nextSibling);
      else if (this.hide_btn)
        this.footer.appendChild(this.copy_btn);
      else
        this.footer.insertBefore(this.copy_btn, this.footer.firstChild);
      return this.copy_btn;
    }
    show_copy_btn(show) {
      if (!this.footer)
        return this;
      this.can_copy = show;
      if (!show && this.copy_btn)
        this.removeElementById(this.copy_id);
      if (show && !this.copy_btn)
        this.create_copy_btn();
      return this;
    }
    create_close_btn() {
      if (!this.footer)
        return;
      this.close_btn = document.createElement("button");
      this.close_btn.id = this.close_id;
      this.close_btn.setAttribute("name", "close_btn");
      this.close_btn.className = "btn btn-sm btn-primary";
      this.close_btn.textContent = this.close_btn_default;
      this.close_btn.onclick = () => {
        if (this.state !== "waiting") {
          this.close();
        }
      };
      this.footer.appendChild(this.close_btn);
      this.update_close_btn_state();
      return this.close_btn;
    }
    show_close_btn(show) {
      if (!this.footer)
        return this;
      this.can_close = show;
      if (show && !this.close_btn)
        this.create_close_btn();
      if (show && this.close_btn)
        this.update_close_btn_state();
      if (!show && this.close_btn)
        this.removeElementById(this.close_id);
      return this;
    }
    update_close_btn_state() {
      if (!this.close_btn)
        return;
      if (this.state === "waiting") {
        this.close_btn.disabled = true;
        this.close_btn.innerHTML = this.close_btn_waiting;
      } else {
        this.close_btn.disabled = false;
        this.close_btn.textContent = this.close_btn_default;
      }
    }
    load_dialog_dragger() {
      if (!this.modal || !this.header) {
        console.warn(`Could not load dialog dragger. Modal or Header not defined.`);
        return this;
      }
      const canDragDesktop = !!this.can_drag;
      const canDragMobile = !!this.can_drag_mobile;
      const isTouchDevice = "ontouchstart" in window;
      this.header.style.cursor = canDragDesktop || canDragMobile ? "move" : "default";
      let dragging = false, offsetX = 0, offsetY = 0;
      const startDrag = (clientX, clientY, allow) => {
        if (!allow)
          return;
        dragging = true;
        offsetX = clientX - this.modal.offsetLeft;
        offsetY = clientY - this.modal.offsetTop;
      };
      const doDrag = (clientX, clientY) => {
        if (!dragging)
          return;
        this.modal.style.left = `${clientX - offsetX}px`;
        this.modal.style.top = `${clientY - offsetY}px`;
      };
      const endDrag = () => {
        dragging = false;
      };
      const handleMouseMove = (e) => doDrag(e.clientX, e.clientY);
      const handleMouseUp = () => {
        endDrag();
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      const handleTouchMove = (e) => {
        if (e.touches.length > 0) {
          const touch = e.touches[0];
          if (touch) {
            doDrag(touch.clientX, touch.clientY);
          }
        }
        e.preventDefault();
      };
      const handleTouchEnd = () => {
        endDrag();
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
      this.header.addEventListener("mousedown", (e) => {
        if (e.button !== 0)
          return;
        startDrag(e.clientX, e.clientY, canDragDesktop);
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
      });
      if (isTouchDevice) {
        this.header.addEventListener("touchstart", (e) => {
          if (e.touches.length !== 1)
            return;
          const touch = e.touches[0];
          if (touch) {
            startDrag(touch.clientX, touch.clientY, canDragMobile);
          }
          document.addEventListener("touchmove", handleTouchMove, { passive: false });
          document.addEventListener("touchend", handleTouchEnd);
          e.preventDefault();
        }, { passive: false });
      }
      return this;
    }
    set_drag(enable) {
      this.can_drag = enable;
      return this;
    }
    set_drag_mobile(enable) {
      if (!this.can_drag)
        return this;
      this.can_drag_mobile = enable;
      return this;
    }
    set_state(newState) {
      if (newState !== "waiting" && newState !== "default") {
        console.warn(`Invalid state: ${newState}. State must be 'waiting' or 'default'.`);
        return this;
      }
      console.log(`[set_state] Mudando estado de ${this.state} para: ${newState}`);
      const oldState = this.state;
      this.state = newState;
      const backdropEl = document.getElementById(`${this.id}-backdrop`);
      if (!backdropEl && (newState === "waiting" || this.modal && this.modal.style.display !== "none")) {
        this.create_backdrop();
      }
      if (this.backdrop) {
        if (newState === "waiting") {
          this.backdrop.style.display = "block";
        } else if (oldState === "waiting" && newState === "default") {
          this.backdrop.style.display = "none";
        }
      }
      this.update_close_btn_state();
      return this;
    }
    close() {
      if (this.state === "waiting") {
        console.warn(`[UltraDialog ${this.id}] Tentativa de fechar o di\xE1logo no estado '${this.state}'. A\xE7\xE3o ignorada.`);
        return this;
      }
      if (!this.modal)
        return this;
      this.modal.remove();
      this.modal = null;
      this.destroy_backdrop();
      console.log(`[UltraDialog ${this.id}] Fechado e removido do DOM.`);
      return this;
    }
    set_z_order(z) {
      if (!this.modal)
        return this;
      this.zOrder = z;
      this.modal.style.zIndex = z.toString();
      return this;
    }
    set_size(size) {
      if (!this.modal)
        return this;
      this.size = size;
      this.modal.style.width = `${size}px`;
      return this;
    }
    visible(is_visible) {
      const should_show = is_visible === void 0 || is_visible === true;
      if (should_show) {
        this.show();
      } else {
        this.hide();
      }
      return this;
    }
    hide() {
      if (this.modal)
        this.modal.style.display = "none";
      if (this.backdrop)
        this.backdrop.style.display = "none";
      return this;
    }
    show() {
      if (!this.modal) {
        this.default_initialization();
      } else {
        this.modal.style.display = "";
      }
      if (this.backdrop) {
        this.backdrop.style.display = "";
      }
      return this;
    }
    add_field(field) {
      var _a;
      if (!this.body)
        return this;
      const fieldContainer = document.createElement("div");
      fieldContainer.className = "form-group";
      fieldContainer.style.marginBottom = "1rem";
      if (field.label && field.fieldtype !== "Button") {
        const label = document.createElement("label");
        label.innerHTML = field.label;
        if (field.reqd) {
          label.innerHTML += ' <span class="text-danger">*</span>';
        }
        fieldContainer.appendChild(label);
      }
      let input;
      switch (field.fieldtype) {
        case "Text":
        case "Small Text":
        case "Long Text":
          input = document.createElement("textarea");
          input.value = field.default || "";
          input.className = "form-control";
          break;
        case "Select":
          input = document.createElement("select");
          input.className = "form-control";
          if (Array.isArray(field.options)) {
            field.options.forEach((option) => {
              const opt = document.createElement("option");
              opt.value = option;
              opt.text = option;
              input.add(opt);
            });
          }
          if (field.default) {
            input.value = field.default;
          }
          break;
        case "Check":
          input = document.createElement("input");
          input.type = "checkbox";
          input.className = "form-check-input";
          if (field.default) {
            input.checked = field.default;
          }
          break;
        case "Button":
          input = document.createElement("button");
          input.className = "btn btn-primary btn-sm";
          input.textContent = field.label;
          if (field.click) {
            input.onclick = field.click;
          }
          break;
        case "Date":
          input = document.createElement("input");
          input.type = "date";
          input.className = "form-control";
          if (field.default) {
            input.value = field.default;
          }
          break;
        case "Time":
          input = document.createElement("input");
          input.type = "time";
          input.className = "form-control";
          if (field.default) {
            input.value = field.default;
          }
          break;
        case "Int":
        case "Float":
          input = document.createElement("input");
          input.type = "number";
          input.className = "form-control";
          if (field.fieldtype === "Float") {
            input.step = "0.01";
          }
          if (field.default) {
            input.value = field.default;
          }
          break;
        case "Color":
          input = document.createElement("input");
          input.type = "color";
          input.className = "form-control";
          if (field.default) {
            input.value = field.default;
          }
          break;
        case "Rating":
          input = document.createElement("input");
          input.type = "range";
          input.className = "form-range";
          input.min = "0";
          input.max = "5";
          if (field.default) {
            input.value = field.default;
          }
          break;
        default:
          input = document.createElement("input");
          input.type = "text";
          input.className = "form-control";
          if (field.default) {
            input.value = field.default;
          }
      }
      input.id = `field-${field.fieldname}`;
      if (field.placeholder) {
        input.placeholder = field.placeholder;
      }
      if (field.onchange) {
        input.onchange = field.onchange;
      }
      if (field.read_only) {
        input.readOnly = true;
      }
      if (field.depends_on) {
        input.setAttribute("data-depends-on", field.depends_on);
      }
      if (field.description) {
        const description = document.createElement("small");
        description.className = "form-text text-muted";
        description.textContent = field.description;
        fieldContainer.appendChild(description);
      }
      fieldContainer.appendChild(input);
      (_a = this.body) == null ? void 0 : _a.appendChild(fieldContainer);
      return this;
    }
    removeElementByProperty(propName) {
      const el = this[propName];
      if (el && this.modal && this.modal.contains(el)) {
        el.remove();
        this[propName] = null;
      }
      return this;
    }
    removeElementById(elementId) {
      if (!this.modal)
        return this;
      const el = this.modal.querySelector(`#${elementId}`);
      if (el)
        el.remove();
      return this;
    }
    removeElementsByName(name) {
      if (!this.modal)
        return this;
      const els = this.modal.querySelectorAll(`[name="${name}"]`);
      els.forEach((el) => el.remove());
      return this;
    }
    load_theme_changer() {
      const observer = new MutationObserver(() => {
        const updated = getComputedStyle(document.documentElement);
        const bgColor = updated.getPropertyValue("--bg-color").trim();
        const textColor = updated.getPropertyValue("--text-color").trim();
        const headingBg = updated.getPropertyValue("--heading-bg").trim();
        const borderColor = updated.getPropertyValue("--border-color").trim();
        const currentThemeKey = [
          bgColor,
          textColor,
          headingBg,
          borderColor
        ].join("|");
        if (!this.modal) {
          console.warn("Theme changer: this.modal is not defined.");
          return;
        }
        if (currentThemeKey !== this.themeKeyCacheLocal) {
          console.log("Theme changed, updating modal, header, and footer styles...");
          this.themeKeyCacheLocal = currentThemeKey;
          if (bgColor) {
            this.modal.style.backgroundColor = bgColor;
          }
          if (textColor) {
            this.modal.style.color = textColor;
          }
          if (borderColor) {
            this.modal.style.border = `1px solid ${borderColor}`;
          } else {
            this.modal.style.border = "none";
          }
          if (this.header) {
            this.header.style.backgroundColor = headingBg || bgColor;
            if (textColor) {
              this.header.style.color = textColor;
            }
            if (borderColor) {
              this.header.style.borderBottom = `1px solid ${borderColor}`;
            } else {
              this.header.style.borderBottom = "none";
            }
          }
          if (this.footer) {
            if (bgColor) {
              this.footer.style.backgroundColor = bgColor;
            }
            if (textColor) {
              this.footer.style.color = textColor;
            }
            if (borderColor) {
              this.footer.style.borderTop = `1px solid ${borderColor}`;
            } else {
              this.footer.style.borderTop = "none";
            }
          }
        }
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "style"],
        subtree: true
      });
    }
  };
  agt.ui.UltraDialog = UltraDialogImpl;

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cnpj.ts
  frappe.provide("agt.utils.brazil.cnpj");
  agt.utils.brazil.cnpj.regex = /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/;
  agt.utils.brazil.cnpj.validate = function(frm, cnpj_field) {
    let cnpj = frm.doc[cnpj_field] || "";
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) {
      frappe.msgprint(__("CNPJ must have 14 digits."));
      frm.set_value(cnpj_field, "");
      return;
    }
    if (agt.utils.brazil.cnpj.regex.test(cnpj)) {
      frappe.msgprint(__("Invalid CNPJ number."));
      frm.set_value(cnpj_field, "");
      return;
    }
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2)
        pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) {
      frappe.msgprint(__("Invalid CNPJ number."));
      frm.set_value(cnpj_field, "");
      return;
    }
    length += 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2)
        pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) {
      frappe.msgprint(__("Invalid CNPJ number."));
      frm.set_value(cnpj_field, "");
      return;
    }
    agt.utils.brazil.cnpj.format(frm, cnpj_field);
  };
  agt.utils.brazil.cnpj.format = function(frm, cnpj_field) {
    let cnpj = frm.doc[cnpj_field] || "";
    cnpj = cnpj.replace(/\D/g, "");
    if (cnpj.length === 14) {
      frm.set_value(cnpj_field, cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5"));
    }
  };
  agt.utils.brazil.cnpj.validate_existence = async function(frm, cnpj_field) {
    var _a;
    const cnpj = ((_a = frm.doc[cnpj_field]) == null ? void 0 : _a.replace(/\D/g, "")) || "";
    if (cnpj.length !== 14) {
      frappe.msgprint(__("CNPJ must have 14 digits to check existence."));
      return;
    }
    try {
      const response = await frappe.call({
        method: "check_cnpj_existence",
        args: { cnpj }
      });
      if (response.message && response.message.exists) {
        frappe.msgprint(__("CNPJ exists and is valid."));
      } else {
        frappe.msgprint(__("CNPJ not found in official records."));
      }
    } catch (err) {
      console.error("Error checking CNPJ existence:", err);
      frappe.msgprint(__("Error checking CNPJ existence. Please try again."));
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cpf.ts
  frappe.provide("agt.utils.brazil.cpf");
  agt.utils.brazil.cpf.regex = /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/;
  agt.utils.brazil.cpf.validate = function(frm, cpf_field) {
    let cpf = frm.doc[cpf_field] || "";
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length !== 11) {
      frappe.msgprint(__("CPF must have 11 digits."));
      frm.set_value(cpf_field, "");
      return;
    }
    if (agt.utils.brazil.cpf.regex.test(cpf)) {
      frappe.msgprint(__("Invalid CPF number."));
      frm.set_value(cpf_field, "");
      return;
    }
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    remainder = sum * 10 % 11;
    if (remainder === 10 || remainder === 11)
      remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
      frappe.msgprint(__("Invalid CPF number."));
      frm.set_value(cpf_field, "");
      return;
    }
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    remainder = sum * 10 % 11;
    if (remainder === 10 || remainder === 11)
      remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
      frappe.msgprint(__("Invalid CPF number."));
      frm.set_value(cpf_field, "");
      return;
    }
    agt.utils.brazil.cpf.format(frm, cpf_field);
  };
  agt.utils.brazil.cpf.format = function(frm, cpf_field) {
    let cpf = frm.doc[cpf_field] || "";
    cpf = cpf.replace(/\D/g, "");
    if (cpf.length === 11) {
      frm.set_value(cpf_field, cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4"));
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cpf_cnpj.ts
  frappe.provide("agt.utils.brazil");
  agt.utils.brazil.validate_cnpj_or_cpf = function(frm, field, documentType) {
    if (documentType === "cpf") {
      agt.utils.brazil.cpf.validate(frm, field);
    } else if (documentType === "cnpj") {
      agt.utils.brazil.cnpj.validate(frm, field);
    } else {
      let value = frm.doc[field] || "";
      value = value.replace(/\D/g, "");
      if (value.length === 11) {
        agt.utils.brazil.cpf.validate(frm, field);
      } else if (value.length === 14) {
        agt.utils.brazil.cnpj.validate(frm, field);
      }
    }
  };
  agt.utils.brazil.format_cnpj_or_cpf = function(frm, field, documentType) {
    if (documentType === "cpf") {
      agt.utils.brazil.cpf.format(frm, field);
    } else if (documentType === "cnpj") {
      agt.utils.brazil.cnpj.format(frm, field);
    } else {
      let value = frm.doc[field] || "";
      value = value.replace(/\D/g, "");
      if (value.length === 11) {
        agt.utils.brazil.cpf.format(frm, field);
      } else if (value.length === 14) {
        agt.utils.brazil.cnpj.format(frm, field);
      }
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/cep.ts
  frappe.provide("agt.utils.brazil.cep");
  agt.utils.brazil.cep.regex = /^\d{5}-?\d{3}$/;
  agt.utils.brazil.cep.format = function(frm, cep_field) {
    let cep = frm.doc[cep_field] || "";
    cep = cep.replace(/\D/g, "");
    if (cep.length === 8) {
      const formatted = `${cep.slice(0, 5)}-${cep.slice(5)}`;
      frm.set_value(cep_field, formatted);
      return formatted;
    }
    return cep;
  };
  agt.utils.brazil.cep.validate = async function(frm, field, addr, neigh, town, state) {
    var _a;
    const f = frm.fields_dict[field];
    if (!(f == null ? void 0 : f.$input))
      return;
    const $input = f.$input;
    const setVisualStyle = (status) => {
      switch (status) {
        case "warning":
          return `<i class="fa fa-exclamation-circle" style="color:#f1c40f"></i> `;
        case "error":
          return `<i class="fa fa-times-circle" style="color:#e74c3c"></i> `;
        case "success":
          return `<i class="fa fa-check-circle" style="color:#27ae60"></i> `;
        default:
          return "";
      }
    };
    const updateUI = (color, message) => {
      let status = "default";
      if (color === "#f1c40f")
        status = "warning";
      else if (color === "red" || color === "#e74c3c")
        status = "error";
      else if (color === "green" || color === "#27ae60")
        status = "success";
      const icon = setVisualStyle(status);
      f["set_description"](
        icon + (message ? `<b style="color:${color}">${message}</b>` : "")
      );
    };
    const fetchCepData = async (cep) => {
      try {
        const response = await frappe.call({
          method: "check_cep",
          args: { cep }
        });
        return response.message;
      } catch (err) {
        console.error("Erro ao consultar o CEP via server script:", err);
        return null;
      }
    };
    const validateAndStyle = async (value) => {
      const digits = value.replace(/\D/g, "");
      if (!digits) {
        updateUI("", "");
        return;
      }
      if (digits.length < 8) {
        updateUI("#f1c40f", "CEP incompleto");
        return;
      }
      const data = await fetchCepData(digits);
      if (!data || data.message === "CEP n\xE3o encontrado") {
        updateUI("red", "CEP n\xE3o encontrado");
        return;
      }
      frm.set_value(addr, data.street || "");
      frm.set_value(neigh, data.neighborhood || "");
      frm.set_value(town, data.city || "");
      frm.set_value(state, data.state || "");
      updateUI("green", "CEP v\xE1lido");
    };
    const formatOnInput = async (e) => {
      var _a2;
      const input = e.target;
      const originalValue = input.value;
      const cursorBefore = input.selectionStart || 0;
      const digitsBeforeCursor = originalValue.slice(0, cursorBefore).replace(/\D/g, "").length;
      let digits = originalValue.replace(/\D/g, "").slice(0, 8);
      const currentFieldValue = ((_a2 = frm.doc[field]) == null ? void 0 : _a2.toString()) || "";
      const isAdding = digits.length > currentFieldValue.replace(/\D/g, "").length;
      let formatted = digits;
      if (isAdding && digits.length > 5) {
        formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      } else if (!isAdding) {
        if (digits.length > 5 && originalValue.includes("-")) {
          formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
        } else {
          formatted = digits;
        }
      }
      if (formatted !== originalValue) {
        input.value = formatted;
        frm.doc[field] = formatted;
        let newCursor = 0;
        let countDigits = 0;
        for (const ch of formatted) {
          newCursor++;
          if (/\d/.test(ch))
            countDigits++;
          if (countDigits >= digitsBeforeCursor)
            break;
        }
        while (newCursor < formatted.length && formatted[newCursor] && /\D/.test(formatted[newCursor] || "")) {
          newCursor++;
        }
        input.setSelectionRange(newCursor, newCursor);
      }
      await validateAndStyle(formatted);
    };
    $input.off(".zipcode").on("input.zipcode", formatOnInput);
    const currentValue = (_a = frm.doc[field]) == null ? void 0 : _a.toString();
    if (currentValue) {
      $input.trigger("input.zipcode");
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/brazil/phone.ts
  frappe.provide("agt.utils.brazil");
  frappe.provide("agt.utils.brazil.phone");
  agt.utils.brazil.phone.regex = /^\(\d{2}\)\s\d{4,5}\-\d{4}$/;
  agt.utils.brazil.phone.format = function(frm, phone_field) {
    let phone = frm.doc[phone_field] || "";
    const digits = phone.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) {
      frm.set_value(phone_field, digits);
      return;
    }
    if (digits.length <= 6) {
      frm.set_value(phone_field, `(${digits.substring(0, 2)}) ${digits.substring(2)}`);
      return;
    }
    if (digits.length <= 10) {
      frm.set_value(phone_field, `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`);
      return;
    }
    frm.set_value(phone_field, `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`);
  };
  agt.utils.brazil.phone.validate = function(frm, phoneField) {
    return new Promise((resolve) => {
      var _a;
      const field = frm.fields_dict[phoneField];
      if (!(field == null ? void 0 : field.$input)) {
        console.error(`validate_phone: O campo '${phoneField}' n\xE3o foi encontrado ou n\xE3o \xE9 um campo de entrada v\xE1lido.`);
        return resolve();
      }
      const $input = field.$input;
      const setVisualStyle = (status) => {
        let icon = "";
        switch (status) {
          case "warning":
            icon = '<i class="fa fa-exclamation-circle" style="color:#f1c40f"></i> ';
            break;
          case "error":
            icon = '<i class="fa fa-times-circle" style="color:#e74c3c"></i> ';
            break;
          case "success":
            icon = '<i class="fa fa-check-circle" style="color:#27ae60"></i> ';
            break;
          default:
            icon = "";
        }
        return icon;
      };
      const updateUI = (color, message) => {
        let status = "default";
        if (color === "#f1c40f")
          status = "warning";
        else if (color === "red" || color === "#e74c3c")
          status = "error";
        else if (color === "green" || color === "#27ae60")
          status = "success";
        const icon = setVisualStyle(status);
        field["set_description"](icon + (message ? `<b style='color:${color}'>${message}</b>` : ""));
      };
      const validatePhoneFormat = (phoneNumber) => {
        const digits = phoneNumber.replace(/\D/g, "");
        const hasValidLength = digits.length === 10 || digits.length === 11;
        if (!hasValidLength) {
          return { isValid: false, type: "invalido" };
        }
        const invalidDDDs = [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          20,
          23,
          25,
          26,
          29,
          30,
          36,
          39,
          40,
          50,
          52,
          56,
          57,
          58,
          59,
          60,
          70,
          72,
          76,
          78,
          80,
          90
        ];
        const ddd = parseInt(digits.substring(0, 2));
        const hasValidDDD = !invalidDDDs.includes(ddd) && ddd >= 11 && ddd <= 99;
        if (!hasValidDDD) {
          return { isValid: false, type: "invalido" };
        }
        const firstDigitAfterDDD = parseInt(digits.substring(2, 3));
        if (digits.length === 11 && firstDigitAfterDDD === 9) {
          return { isValid: true, type: "celular" };
        } else if (digits.length === 10 && firstDigitAfterDDD >= 2 && firstDigitAfterDDD <= 8) {
          return { isValid: true, type: "fixo" };
        } else {
          return { isValid: false, type: "invalido" };
        }
      };
      const formatPhoneNumber = (value) => {
        const digits = value.replace(/\D/g, "").slice(0, 11);
        if (digits.length <= 2)
          return digits;
        if (digits.length <= 6)
          return `(${digits.substring(0, 2)}) ${digits.substring(2)}`;
        if (digits.length <= 10)
          return `(${digits.substring(0, 2)}) ${digits.substring(2, 6)}-${digits.substring(6)}`;
        return `(${digits.substring(0, 2)}) ${digits.substring(2, 7)}-${digits.substring(7)}`;
      };
      const formatOnInput = (e) => {
        const input = e.target;
        const originalValue = input.value;
        const originalPos = input.selectionStart || 0;
        const digitsBeforeCursor = originalValue.slice(0, originalPos).replace(/\D/g, "").length;
        const digits = originalValue.replace(/\D/g, "");
        const formattedValue = formatPhoneNumber(digits);
        if (originalValue !== formattedValue) {
          input.value = formattedValue;
          frm.doc[phoneField] = formattedValue;
          let newCursorPos = 0;
          let digitsCounted = 0;
          for (const char of formattedValue) {
            newCursorPos++;
            if (/\d/.test(char))
              digitsCounted++;
            if (digitsCounted >= digitsBeforeCursor)
              break;
          }
          while (newCursorPos < formattedValue.length && formattedValue[newCursorPos] && /\D/.test(formattedValue[newCursorPos] || "")) {
            newCursorPos++;
          }
          input.setSelectionRange(newCursorPos, newCursorPos);
        }
        const validation = validatePhoneFormat(formattedValue);
        if (!digits) {
          updateUI("", "");
        } else if (digits.length < 10) {
          updateUI("#f1c40f", "N\xFAmero de telefone incompleto");
        } else if (!validation.isValid) {
          updateUI("red", "DDD ou n\xFAmero de telefone inv\xE1lido");
        } else if (validation.type === "celular") {
          updateUI("green", "Celular v\xE1lido");
        } else if (validation.type === "fixo") {
          updateUI("green", "Telefone fixo v\xE1lido");
        }
      };
      $input.off(".phone").on("input.phone", formatOnInput);
      const currentValue = (_a = frm.doc[phoneField]) == null ? void 0 : _a.toString();
      if (currentValue) {
        $input.trigger("input.phone");
      }
      resolve();
    });
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/text.ts
  frappe.provide("agt.utils.text");
  agt.utils.text.normalize = function(text) {
    return (text || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[-_\s]/g, "").replace(/[^a-z0-9]/g, "");
  };
  agt.utils.text.is_valid = function(v) {
    return v !== null && v !== void 0 && (typeof v === "string" ? v.trim() !== "" : true);
  };
  agt.utils.text.to_snake_case = function(str) {
    str = str.replace(/\s+/g, "_");
    str = str.replace(/([a-z])([A-Z])/g, "$1_$2");
    return str.toLowerCase();
  };
  agt.utils.text.to_pascal_case_spaced = function(str) {
    return str.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(" ");
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/core.ts
  frappe.provide("agt.utils");
  agt.utils.workflow_transition = async function(form, action, callback) {
    var _a;
    if (!form || !((_a = form.states) == null ? void 0 : _a.frm) || !action) {
      console.error("workflow_transition: Par\xE2metros inv\xE1lidos.");
      return;
    }
    frappe.dom.freeze();
    form.states.frm.selected_workflow_action = action;
    form.states.frm.script_manager.trigger("before_workflow_action").then(async () => {
      await frappe.xcall("frappe.model.workflow.apply_workflow", {
        doc: form.states.frm.doc,
        action
      }).then((doc) => {
        frappe.model.sync(doc);
        form.states.frm.refresh();
        form.states.frm.selected_workflow_action = null;
        form.states.frm.script_manager.trigger("after_workflow_action");
      }).finally(async () => {
        frappe.dom.unfreeze();
        callback && await callback(form);
      });
    });
  };
  agt.utils.update_workflow_state = async function(params) {
    const { doctype, docname, workflow_state, ignore_workflow_validation, callback } = params;
    return await frappe.call({
      method: "update_workflow_state",
      args: { doctype, docname, workflow_state, ignore_workflow_validation }
    }).then(async () => {
      return await agt.utils.refresh_force().then(async (doc) => {
        callback && await callback();
        return doc;
      });
    });
  };
  agt.utils.refresh_force = async function() {
    var _a, _b;
    if (!((_a = cur_frm == null ? void 0 : cur_frm.doc) == null ? void 0 : _a.doctype) || !((_b = cur_frm == null ? void 0 : cur_frm.doc) == null ? void 0 : _b.name)) {
      console.error("refresh_force: cur_frm ou documento inv\xE1lido");
      return void 0;
    }
    frappe.model.clear_doc(cur_frm.doc.doctype, cur_frm.doc.name);
    return await agt.utils.doc.get_doc(cur_frm.doc.doctype, cur_frm.doc.name).then((doc) => {
      var _a2, _b2;
      if ((_b2 = (_a2 = cur_frm == null ? void 0 : cur_frm.states) == null ? void 0 : _a2.frm) == null ? void 0 : _b2.refresh) {
        cur_frm.states.frm.refresh();
      }
      return doc;
    }).catch((error) => {
      console.error("Error refreshing document:", error);
      return void 0;
    });
  };
  agt.utils.validate_cpf_regex = function(cpf) {
    if (!cpf || typeof cpf !== "string")
      return false;
    cpf = cpf.trim();
    return /^(?!000\.000\.000\-00)(\d{3}\.\d{3}\.\d{3}\-\d{2})$/.test(cpf);
  };
  agt.utils.validate_cnpj_regex = function(cnpj) {
    if (!cnpj || typeof cnpj !== "string")
      return false;
    cnpj = cnpj.trim();
    return /^(?!00\.000\.000\/0000\-00)(\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2})$/.test(cnpj);
  };
  agt.utils.validate_cpf = function(cpf) {
    const d = (cpf || "").replace(/\D/g, "");
    if (d.length !== 11 || /^(\d)\1+$/.test(d))
      return false;
    let sum = 0;
    for (let i = 0; i < 9; i++)
      sum += +(d[i] || 0) * (10 - i);
    let check = sum * 10 % 11;
    if (check === 10)
      check = 0;
    if (check !== +(d[9] || 0))
      return false;
    sum = 0;
    for (let i = 0; i < 10; i++)
      sum += +(d[i] || 0) * (11 - i);
    check = sum * 10 % 11;
    if (check === 10)
      check = 0;
    return check === +(d[10] || 0);
  };
  agt.utils.validate_cnpj = function(cnpj) {
    const d = (cnpj || "").replace(/\D/g, "");
    if (d.length !== 14 || /^(\d)\1+$/.test(d))
      return false;
    const calc = (base, weights) => base.split("").reduce((sum, n, i) => sum + +(n || 0) * (weights[i] || 0), 0);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, ...w1];
    let check = calc(d.slice(0, 12), w1) % 11;
    let digit = check < 2 ? 0 : 11 - check;
    if (digit !== +(d[12] || 0))
      return false;
    check = calc(d.slice(0, 13), w2) % 11;
    digit = check < 2 ? 0 : 11 - check;
    return digit === +(d[13] || 0);
  };
  agt.utils.validate_cnpj_existence = async function(cnpj) {
    if (!cnpj || typeof cnpj !== "string")
      return false;
    const digits = cnpj.replace(/\D/g, "");
    if (digits.length !== 14)
      return false;
    try {
      const response = await frappe.call({
        method: "check_cnpj",
        args: { cnpj: digits }
      });
      const data = response == null ? void 0 : response.message;
      return !!data && !!data.cnpj && data.cnpj.replace(/\D/g, "") === digits;
    } catch (error) {
      console.error("Erro ao validar CNPJ:", error);
      return false;
    }
  };
  agt.utils.format_doc = function(doc, type) {
    let digits = (doc || "").replace(/\D/g, "");
    const formatCpf = (d) => {
      let formatted = d.slice(0, 11);
      if (formatted.length > 3)
        formatted = formatted.replace(/^(\d{3})(\d)/, "$1.$2");
      if (formatted.length > 6)
        formatted = formatted.replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3");
      if (formatted.length > 9)
        formatted = formatted.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
      return formatted;
    };
    const formatCnpj = (d) => {
      let formatted = d.slice(0, 14);
      if (formatted.length > 2)
        formatted = formatted.replace(/^(\d{2})(\d)/, "$1.$2");
      if (formatted.length > 5)
        formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
      if (formatted.length > 8)
        formatted = formatted.replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4");
      if (formatted.length > 12)
        formatted = formatted.replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
      return formatted;
    };
    if (type === "Pessoa F\xEDsica") {
      return formatCpf(digits);
    }
    if (type === "Pessoa Jur\xEDdica") {
      return formatCnpj(digits);
    }
    return digits.length < 12 ? formatCpf(digits) : formatCnpj(digits);
  };
  agt.utils.document_id = async function(frm, docField, typeField) {
    var _a;
    const field = frm.fields_dict[docField];
    if (!(field == null ? void 0 : field.$input)) {
      console.error(`document_id: O campo '${docField}' n\xE3o foi encontrado ou n\xE3o \xE9 um campo de entrada v\xE1lido.`);
      return;
    }
    const $input = field.$input;
    const setVisualStyle = (status) => {
      let icon = "";
      switch (status) {
        case "warning":
          icon = '<i class="fa fa-exclamation-circle" style="color:#f1c40f"></i> ';
          break;
        case "error":
          icon = '<i class="fa fa-times-circle" style="color:#e74c3c"></i> ';
          break;
        case "success":
          icon = '<i class="fa fa-check-circle" style="color:#27ae60"></i> ';
          break;
        default:
          icon = "";
      }
      return icon;
    };
    const updateUI = (color, message) => {
      let status = "default";
      if (color === "#f1c40f")
        status = "warning";
      else if (color === "red" || color === "#e74c3c")
        status = "error";
      else if (color === "green" || color === "#27ae60")
        status = "success";
      const icon = setVisualStyle(status);
      field.set_description(icon + (message ? `<b style='color:${color}'>${message}</b>` : ""));
    };
    const validateAndStyle = () => {
      const value = $input.val() || "";
      const digits = value.replace(/\D/g, "");
      const docType = typeField ? frm.doc[typeField] : null;
      if (docType && docType !== "Pessoa F\xEDsica" && docType !== "Pessoa Jur\xEDdica") {
        frm.set_df_property(docField, "read_only", 1);
        frm.set_df_property(docField, "hidden", 1);
        updateUI("#f1c40f", "Selecione o tipo de documento antes de preencher.");
        return;
      } else {
        frm.set_df_property(docField, "read_only", 0);
        frm.set_df_property(docField, "hidden", 0);
      }
      if (!digits) {
        updateUI("", "");
        return;
      }
      if (docType === "Pessoa F\xEDsica") {
        if (digits.length < 11) {
          updateUI("#f1c40f", "CPF incompleto");
        } else {
          if (agt.utils.validate_cpf(digits)) {
            updateUI("green", "CPF v\xE1lido");
          } else {
            updateUI("red", "CPF inv\xE1lido. Favor corrigir.");
          }
        }
        return;
      }
      if (docType === "Pessoa Jur\xEDdica") {
        if (digits.length < 14) {
          updateUI("#f1c40f", "CNPJ incompleto");
        } else {
          if (agt.utils.validate_cnpj(digits)) {
            updateUI("#27ae60", "CNPJ v\xE1lido sintaticamente. Verificando exist\xEAncia...");
            agt.utils.validate_cnpj_existence(digits).then((exists) => {
              if (exists) {
                updateUI("green", "CNPJ existe e est\xE1 ativo");
              } else {
                updateUI("red", "CNPJ n\xE3o encontrado na base nacional");
              }
            });
          } else {
            updateUI("red", "CNPJ inv\xE1lido. Favor corrigir.");
          }
        }
        return;
      }
      if (docType === null) {
        if (digits.length < 11 || digits.length > 11 && digits.length < 14) {
          updateUI("#f1c40f", "CPF ou CNPJ incompleto.");
        } else if (digits.length === 11) {
          if (agt.utils.validate_cpf(digits)) {
            updateUI("green", "CPF v\xE1lido");
          } else {
            updateUI("red", "CPF ou CNPJ inv\xE1lido ou incompleto");
          }
        } else if (digits.length >= 14) {
          const cnpDigits = digits.slice(0, 14);
          if (agt.utils.validate_cnpj(cnpDigits)) {
            updateUI("green", "CNPJ v\xE1lido");
          } else {
            updateUI("red", "CNPJ inv\xE1lido. Favor corrigir.");
          }
        }
      }
    };
    const formatOnInput = (e) => {
      const input = e.target;
      const originalValue = input.value;
      const docType = typeField ? frm.doc[typeField] : null;
      const originalPos = input.selectionStart || 0;
      const digitsBeforeCursor = originalValue.slice(0, originalPos).replace(/\D/g, "").length;
      let digits = originalValue.replace(/\D/g, "");
      const maxLength = docType === "Pessoa Jur\xEDdica" ? 14 : docType === "Pessoa F\xEDsica" ? 11 : 14;
      if (digits.length > maxLength) {
        digits = digits.slice(0, maxLength);
      }
      const formatCpf = (d) => d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{3})\.(\d{3})\.(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
      const formatCnpj = (d) => d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4").replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
      let formattedValue = digits;
      if (docType === "Pessoa F\xEDsica") {
        formattedValue = formatCpf(digits);
      } else if (docType === "Pessoa Jur\xEDdica") {
        formattedValue = formatCnpj(digits);
      } else {
        formattedValue = digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
      }
      if (originalValue !== formattedValue) {
        input.value = formattedValue;
        frm.doc[docField] = formattedValue;
        let newCursorPos = 0;
        let digitsCounted = 0;
        for (const char of formattedValue) {
          newCursorPos++;
          if (/\d/.test(char))
            digitsCounted++;
          if (digitsCounted >= digitsBeforeCursor)
            break;
        }
        while (newCursorPos < formattedValue.length && formattedValue[newCursorPos] && /\D/.test(formattedValue[newCursorPos] || "")) {
          newCursorPos++;
        }
        input.setSelectionRange(newCursorPos, newCursorPos);
      }
      validateAndStyle();
    };
    $input.off(".cpfcnpj").on("input.cpfcnpj", formatOnInput);
    if (typeField && ((_a = frm.fields_dict[typeField]) == null ? void 0 : _a.$input)) {
      frm.fields_dict[typeField].$input.off(`.cpfcnpjtype_${docField}`).on(`change.cpfcnpjtype_${docField}`, () => {
        validateAndStyle();
        $input.trigger("input.cpfcnpj");
      });
    }
    validateAndStyle();
  };
  agt.utils.redirect_by_ref = function(ref, title, message, indicator, url, delay = 3e3, newTab = true) {
    if (!ref || !url) {
      console.error("redirect_by_ref: ref e url s\xE3o obrigat\xF3rios");
      return;
    }
    frappe.msgprint({
      title: title || "Redirecionando...",
      message: message != null ? message : "",
      indicator: indicator || "blue"
    });
    setTimeout(() => {
      if (url) {
        if (newTab) {
          window.open(url, "_blank");
        } else {
          window.location.href = url;
        }
      }
    }, delay);
  };
  agt.utils.build_doc_url = function(doctype, docname) {
    const doctypeSlug = doctype.replace(/([a-z])([A-Z])/g, "$1-$2").replace(/\s+/g, "-").replace(/_/g, "-").toLowerCase();
    return `${window.location.origin}/app/${doctypeSlug}/${encodeURIComponent(docname)}`;
  };
  agt.utils.redirect_after_create_doc = function(success, url, docname, doctype) {
    if (success) {
      frappe.msgprint({
        title: "Redirecionando...",
        message: `${doctype} criado com sucesso! Voc\xEA ser\xE1 direcionado para o documento (${docname}).`,
        indicator: "green"
      });
    } else {
      frappe.msgprint({
        title: "Redirecionando...",
        message: `Voc\xEA ser\xE1 direcionado para o documento j\xE1 existente (${docname}).`,
        indicator: "blue"
      });
    }
    setTimeout(() => {
      window.location.href = url;
    }, 2e3);
  };
  agt.utils.get_item_info = async function(item_name, sn) {
    if (!item_name || typeof item_name !== "string") {
      console.error("get_item_info: item_name \xE9 obrigat\xF3rio");
      return;
    }
    const all_items = await frappe.db.get_list("Item", {
      fields: ["item_code", "custom_mppt", "item_name"]
    }).catch((e) => {
      console.error("Erro ao buscar itens:", e);
      return null;
    });
    if (!all_items || !all_items.length)
      return;
    const normalizedInput = agt.utils.text.normalize(item_name);
    const filtered_items = all_items.filter(
      (item) => agt.utils.text.normalize(item.item_name) === normalizedInput
    );
    if (!filtered_items.length)
      return;
    const uniqueMppts = [...new Set(filtered_items.map((item) => item.custom_mppt))];
    if (uniqueMppts.length === 1)
      return filtered_items[0];
    const dialog_title = `Selecione a quantidade de MPPTs (${item_name}${sn ? ` - ${sn}` : ""})`;
    return new Promise((resolve) => {
      agt.utils.dialog.load({
        title: dialog_title,
        fields: [
          {
            fieldname: "mppt",
            label: "MPPT",
            fieldtype: "Select",
            options: uniqueMppts,
            reqd: true
          }
        ],
        static: false,
        draggable: false,
        lockClose: true,
        primary_action: async function(values) {
          const mppt = values.mppt;
          if (!mppt)
            return;
          const item = filtered_items.find((item2) => item2.custom_mppt === mppt);
          agt.utils.dialog.close_by_title(dialog_title);
          resolve(item);
        }
      });
    });
  };
  agt.utils.get_growatt_sn_info = async function(serial_no) {
    var _a;
    if (!serial_no || typeof serial_no !== "string") {
      console.error("get_growatt_sn_info: serial_no \xE9 obrigat\xF3rio");
      return void 0;
    }
    try {
      const sn = await frappe.call({
        method: "get_growatt_sn_info",
        args: { deviceSN: serial_no }
      });
      const fail = !sn || !((_a = sn.message) == null ? void 0 : _a.code) || sn.message.code !== 200;
      if (fail)
        return void 0;
      return sn.message;
    } catch (error) {
      console.error("Erro ao buscar informa\xE7\xF5es do SN Growatt:", error);
      return void 0;
    }
  };
  agt.utils.validate_serial_number = function(sn, type) {
    if (!sn || typeof sn !== "string")
      return false;
    sn = sn.trim().toUpperCase();
    const sn_regex = /^[A-Z0-9][A-Z][A-Z0-9]([A-Z0-9]{7}|[A-Z0-9]{13})$/;
    const iv_sn_regex = /^[A-Z0-9]{3}[A-Z0-9]{7}$/;
    const other_sn_regex = /^[A-Z0-9]{3}[A-Z0-9]{13}$/;
    let output = false;
    if (type === "inverter") {
      output = iv_sn_regex.test(sn);
    } else if (type === "battery" || type === "ev_charger") {
      output = other_sn_regex.test(sn);
    } else {
      output = sn_regex.test(sn);
    }
    return output;
  };
  agt.utils.get_value_from_any_doc = async function(frm, doctype, docnameField, fieldName) {
    var _a;
    const docname = frm.doc[docnameField];
    if (!docname)
      return null;
    try {
      const result = await frappe.db.get_doc(doctype, docname);
      return (_a = result == null ? void 0 : result[fieldName]) != null ? _a : null;
    } catch (e) {
      console.error(`Erro ao buscar campo ${fieldName} do ${doctype}:`, e);
      return null;
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/db.ts
  frappe.provide("agt.utils.db");
  agt.utils.db.filter_join = async function(steps) {
    let results = [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step)
        continue;
      const filters = __spreadValues({}, step.filters);
      if (i > 0 && step.joinOn && results.length > 0) {
        const joinOn = step.joinOn;
        const joinValues = results.map((item) => item[joinOn.sourceField]);
        filters[joinOn.targetField] = ["in", joinValues];
      }
      if (step.joinOn && results.length === 0) {
        console.warn(`No results found for step ${i + 1}. Skipping further joins.`);
        break;
      }
      const response = await frappe.call({
        method: "frappe_agt.api.backend_get_all",
        args: {
          doctype: step.doctype,
          filters,
          fields: step.fields
        }
      });
      results = response.message.data || [];
    }
    return results;
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/dialog.ts
  frappe.provide("agt.utils.dialog");
  agt.utils.dialog.created = [];
  agt.utils.dialog.load = function(diagConfig) {
    const dialog = new frappe.ui.Dialog(diagConfig);
    agt.utils.dialog.created.push(dialog);
    $(dialog["wrapper"]).on("hidden.bs.modal", () => {
      const index = agt.utils.dialog.created.indexOf(dialog);
      if (index > -1) {
        agt.utils.dialog.created.splice(index, 1);
        agt.utils.dialog.refresh_dialog_stacking();
      }
    });
    dialog.show();
    setTimeout(() => agt.utils.dialog.refresh_dialog_stacking(), 50);
    return dialog;
  };
  agt.utils.dialog.close_all = function() {
    const dialogs = [...agt.utils.dialog.created];
    dialogs.forEach((dialog) => {
      var _a;
      if (dialog) {
        dialog.hide();
        const $backdrop = (_a = $(dialog["wrapper"]).data("bs.modal")) == null ? void 0 : _a.$backdrop;
        $backdrop == null ? void 0 : $backdrop.remove();
      }
    });
    agt.utils.dialog.created = [];
  };
  agt.utils.dialog.close_by_title = function(title) {
    var _a;
    const dialogIndex = agt.utils.dialog.created.findIndex((d) => d.title === title);
    if (dialogIndex >= 0) {
      const dialog = agt.utils.dialog.created[dialogIndex];
      if (dialog) {
        dialog.hide();
        const $backdrop = (_a = $(dialog["wrapper"]).data("bs.modal")) == null ? void 0 : _a.$backdrop;
        $backdrop == null ? void 0 : $backdrop.remove();
        agt.utils.dialog.created.splice(dialogIndex, 1);
        agt.utils.dialog.refresh_dialog_stacking();
      }
    }
  };
  agt.utils.dialog.show_debugger_alert = function(_frm, message, indicator, timeout = 10) {
    if (frappe.user.has_role(["IT", "Administrator", "System Manager"])) {
      frappe.show_alert({ message: __(message), indicator }, timeout);
    }
  };
  agt.utils.dialog.refresh_dialog_stacking = function() {
    if (typeof $ === "undefined") {
      console.error("jQuery is not loaded. Unable to refresh dialog stacking.");
      return;
    }
    const baseModalIndex = 1051;
    const baseBackdropIndex = 1050;
    agt.utils.dialog.created.forEach((dialog, index) => {
      var _a;
      if ($(dialog["wrapper"]).is(":visible")) {
        const zIndex = baseModalIndex + index * 2;
        $(dialog["wrapper"]).css("z-index", zIndex);
        const modalId = $(dialog["wrapper"]).attr("id");
        $(`.modal-backdrop[data-modal-id="${modalId}"]`).css("z-index", baseBackdropIndex + index * 2);
        const $backdrop = (_a = $(dialog["wrapper"]).data("bs.modal")) == null ? void 0 : _a.$backdrop;
        if ($backdrop && !$backdrop.attr("data-modal-id")) {
          $backdrop.attr("data-modal-id", modalId);
        }
      }
    });
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/doc.ts
  frappe.provide("agt.utils.doc");
  agt.utils.doc.create_doc = async function(doctype, fields_target, fields_dict) {
    const meta = await agt.utils.doc.get_doc_meta(doctype);
    if (!meta) {
      frappe.throw(`Could not fetch meta for doctype: ${doctype}`);
      return;
    }
    const fields_record = Object.entries(fields_dict).reduce((acc, [k, v]) => {
      if (typeof v.value === "number" || typeof v.value === "string") {
        acc[k] = v.value;
      }
      return acc;
    }, {});
    const valid_fields = meta.fields.map((field) => field.fieldname);
    for (const [targetField, sourceField] of Object.entries(fields_target)) {
      if (!valid_fields.includes(targetField))
        continue;
      let value;
      if (sourceField === "docname" && (cur_frm == null ? void 0 : cur_frm.docname)) {
        value = cur_frm.docname;
      } else if ((cur_frm == null ? void 0 : cur_frm.doc) && sourceField in cur_frm.doc) {
        value = cur_frm.doc[sourceField];
      }
      if (value !== void 0) {
        fields_record[targetField] = value;
      }
    }
    const valid_updates = {};
    for (const [fieldname, field] of Object.entries(fields_record)) {
      if (!valid_fields.includes(fieldname))
        continue;
      if (field === void 0 || field === null || field === "")
        continue;
      valid_updates[fieldname] = field;
    }
    if (Object.keys(valid_updates).length === 0) {
      frappe.throw(`No valid fields to create the document: ${doctype}`);
      return;
    }
    const doc = frappe.model.get_new_doc(doctype);
    for (const [name, value] of Object.entries(valid_updates)) {
      if (name === "workflow_state" || name === "naming_series")
        continue;
      doc[name] = value;
    }
    const r1 = await frappe.db.insert(doc).catch((e) => console.error(e));
    return r1 == null ? void 0 : r1.name;
  };
  agt.utils.doc.update_doc = async function(doctype, docname, fields_record, retryCount = 0) {
    var _a;
    const maxRetries = 3;
    if (retryCount >= maxRetries) {
      console.error(`Max retries (${maxRetries}) reached. Aborting update.`);
      return;
    }
    try {
      const doc = await frappe.db.get_doc(doctype, docname).catch((e) => console.error(e));
      if (!doc) {
        console.error(`Document '${docname}' not found.`);
        return;
      }
      const valid_updates = {};
      const ignore_fields = ["workflow_state", "naming_series", "creation", "doctype", "modified", "name", "owner"];
      for (const [f, v] of Object.entries(fields_record)) {
        if (ignore_fields.includes(f) && doctype !== "Serial No")
          continue;
        if (doc[f] === void 0)
          continue;
        if (doc[f] === v)
          continue;
        if (doc[f] === null && v === "")
          continue;
        if (doc[f] === "" && v === null)
          continue;
        console.log(`[${doctype} - ${docname}] Setting ${f} to ${v}`);
        doc[f] = v;
        valid_updates[f] = v;
      }
      if (Object.keys(valid_updates).length === 0) {
        console.log(`[${doctype} - ${docname}] No valid fields to update`);
        return;
      }
      await frappe.call({
        method: "frappe.client.save",
        args: { doc }
      });
      if (doctype === cur_frm.doctype && docname === cur_frm.docname) {
        const updatedDoc = await frappe.call({
          method: "frappe.client.get",
          args: { doctype, name: docname }
        }).then(({ message }) => message);
        frappe.model.sync([updatedDoc]);
        cur_frm.states.frm.refresh();
      }
      console.log(`Document '${docname}' updated successfully.`);
    } catch (error) {
      if ((_a = error == null ? void 0 : error.message) == null ? void 0 : _a.includes("Document has been modified after you have opened it")) {
        console.warn("Timestamp mismatch detected. Refetching document...");
        return await agt.utils.doc.update_doc(doctype, docname, fields_record, retryCount + 1);
      } else {
        console.error(`Error saving document '${docname}':`, error);
      }
    }
  };
  agt.utils.doc.get_doc = async function(doctype, docname) {
    return await frappe.call({
      method: "frappe.client.get",
      args: { doctype, name: docname }
    }).then(async (doc) => {
      frappe.model.clear_doc(doctype, docname);
      frappe.model.sync([doc.message]);
      cur_frm.states.frm.refresh();
      return doc.message;
    });
  };
  agt.utils.doc.share_doc = async function(doctype, docname, users) {
    const shared_users = await frappe.call({
      method: "frappe.share.get_users",
      args: { doctype, name: docname }
    }).then(({ message }) => message);
    for (const user of users) {
      const shared = shared_users.find((u) => u.user === user.user);
      if ((shared == null ? void 0 : shared.read) === user.read && (shared == null ? void 0 : shared.write) === user.write && (shared == null ? void 0 : shared.share) === user.share) {
        console.log(`Document '${docname}' already shared with user '${user.user}'`);
        continue;
      }
      await frappe.call({
        method: "frappe.share.add",
        args: {
          doctype,
          name: docname,
          user: user.user,
          read: user.read,
          write: user.write,
          share: user.share,
          owner: user.owner || frappe.session.user_email
        }
      }).then(() => console.log(`Document '${docname}' shared with user '${user.user}'`));
    }
  };
  agt.utils.doc.get_doc_meta = async function(doctype) {
    await frappe.model.with_doctype(doctype);
    return frappe.get_meta(doctype);
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/form.ts
  frappe.provide("agt.utils.form");
  frappe.provide("agt.utils.form.field");
  agt.utils.form.field.is_empty = function(value) {
    if (!value)
      return true;
    const text = value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
    return text === "";
  };
  agt.utils.form.field.set_properties = function(frm, configs) {
    Object.entries(configs).forEach(([fieldname, opts]) => {
      if (opts.hidden !== void 0) {
        const $el = frm.$wrapper.find(`[data-fieldname='${fieldname}']`);
        $el.toggle(!opts.hidden);
      }
      if (opts.readonly !== void 0) {
        frm.set_df_property(fieldname, "read_only", opts.readonly ? 1 : 0);
      }
      if (opts.reqd !== void 0) {
        frm.set_df_property(fieldname, "reqd", opts.reqd ? 1 : 0);
      }
      if (opts.label !== void 0) {
        frm.set_df_property(fieldname, "label", opts.label);
      }
      if (opts.description !== void 0) {
        frm.set_df_property(fieldname, "description", opts.description);
      }
    });
    frm.refresh_fields();
  };
  agt.utils.form.field.get_js_visible_fields = function(form) {
    const visible_fields = [];
    for (let field of Object.values(form.fields_dict)) {
      if (["Table", "Section Break", "Column Break", "HTML", "Fold"].includes(field.df.fieldtype))
        continue;
      if (!field.df.depends_on)
        continue;
      const depends_on_json_fnc = field.df.depends_on.replace("eval:", "");
      const is_visible = frappe.utils.eval(depends_on_json_fnc, {
        doc: form.doc
      });
      if (is_visible)
        visible_fields.push(field);
    }
    return visible_fields;
  };
  agt.utils.form.field.validate_js_visible_fields = function(form, workflow_state) {
    const js_visible_fields = agt.utils.form.field.get_js_visible_fields(form);
    const title = __("Aten\xE7\xE3o!");
    const indicator = "red";
    function validate_js_visible_fields_msg(fields) {
      const throw_html = [];
      for (let field of fields) {
        throw_html.push(`<li>${field.df.label}</li>`);
      }
      const msg = `<p>${__("\u26A0\uFE0F Os campos abaixo s\xE3o obrigat\xF3rios: ")}</p><ul>${throw_html.join("")}</ul>`;
      return msg;
    }
    const throw_error = () => {
      if (workflow_state !== form.doc.workflow_state)
        return;
      if (!js_visible_fields.length)
        return;
      const message = validate_js_visible_fields_msg(js_visible_fields);
      frappe.throw({ title, message, indicator });
    };
    const msgprint = () => {
      if (workflow_state !== form.doc.workflow_state)
        return;
      if (!js_visible_fields.length)
        return;
      const message = validate_js_visible_fields_msg(js_visible_fields);
      frappe.msgprint({ title, message, indicator });
    };
    return { throw_error, msgprint };
  };
  agt.utils.form.field.turn_into_link = function(frm, fieldName, docType) {
    const field = frm.fields_dict[fieldName];
    if (field && field.df.read_only && field.$wrapper) {
      const $wrapper = field.$wrapper;
      $wrapper.css("position", "relative");
      $wrapper.find(".serial-link-mask").remove();
      $wrapper.append(
        `<a class="serial-link-mask" href="/app/${docType}/${encodeURIComponent(frm.doc[fieldName])}" target="_blank"
        style="position:absolute;top:0;left:0;width:100%;height:100%;opacity:0;z-index:10;cursor:pointer;"></a>`
      );
    }
  };
  agt.utils.form.mirror_checklist_table = async function(form, doctype, tableField, childname, docname, workflowStateField) {
    const name = form.doc.name;
    const fields = ["name"];
    if (workflowStateField)
      fields.push("workflow_state");
    const remote = await frappe.db.get_list(doctype, {
      filters: { [childname]: name },
      fields
    }).catch((e) => {
      console.error(`Error fetching ${doctype}:`, e);
      return [];
    });
    const currentTable = form.doc[tableField] || [];
    let needsUpdate = !await agt.utils.table.is_sync(currentTable, remote, docname, workflowStateField);
    if (!needsUpdate) {
      console.log(`Tabela '${tableField}' j\xE1 est\xE1 sincronizada.`);
      return;
    }
    form.doc[tableField] = remote.map((item) => {
      const row = { [docname]: item.name };
      if (workflowStateField && item.workflow_state) {
        row[workflowStateField] = item.workflow_state;
      }
      return row;
    });
    form.dirty();
    form.refresh_field(tableField);
    await form.save();
    console.log(`Tabela '${tableField}' sincronizada.`);
  };
  agt.utils.form.assign_parent_doc_name = function(_form) {
  };
  agt.utils.form.adjust_html_elements = function(form, options) {
    var _a;
    if (!(form == null ? void 0 : form.doc))
      return;
    const elementsToRemove = {
      removeTabs: ".form-tabs-list",
      removeNavFormsTabs: ".nav.form-tabs",
      removeSidebar: ".col-lg-2.layout-side-section",
      removeAssignments: ".form-assignments",
      removeAssignmentsButton: ".button.add-assignments-btn",
      removeAttachments: ".form-attachments",
      removeAttachmentsButton: ".button.add-attachments-btn",
      removeShared: ".form-shared",
      removeTags: ".form-tags",
      removeSidebarStats: ".form-sidebar-stats",
      removeSidebarMenu: ".list-unstyled.sidebar-menu.text-muted",
      removeSidebarReset: "button.btn-reset.sidebar-toggle-btn",
      removeSidebarToggle: "span.sidebar-toggle-btn",
      removeActivityBar: ".form-footer"
    };
    Object.entries(elementsToRemove).forEach(([option, selector]) => {
      if (options[option]) {
        const el = document.querySelector(selector);
        if (el) {
          el.style.display = "none";
          el.remove();
        }
      }
    });
    if (options.removeTabs && !document.querySelector(".form-tabs-list")) {
      (_a = document.querySelector(".form-layout")) == null ? void 0 : _a.setAttribute("style", "border-top: none");
    }
  };
  agt.utils.form.render_doc_fields_table = async function(wrapper, docOrRows, fields, meta) {
    var _a, _b;
    if (!wrapper || !docOrRows || !(fields == null ? void 0 : fields.length)) {
      console.error("[render_doc_fields_table] Invalid arguments!");
      return;
    }
    const isTable = Array.isArray(docOrRows) || typeof docOrRows === "object" && docOrRows !== null && "length" in docOrRows && typeof docOrRows.length === "number";
    const arr = isTable ? Array.isArray(docOrRows) ? docOrRows.filter((el) => typeof el === "object" && el !== null) : Array.from(docOrRows).filter((el) => typeof el === "object" && el !== null) : [];
    if (!meta) {
      const doctype = isTable && arr.length > 0 ? (_a = arr[0]) == null ? void 0 : _a["doctype"] : docOrRows == null ? void 0 : docOrRows["doctype"];
      if (doctype)
        meta = await ((_b = frappe.get_meta) == null ? void 0 : _b.call(frappe, doctype));
    }
    const escapeHtml = (value) => {
      if (value === null || value === void 0)
        return "";
      const str = String(value);
      return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
    };
    const getFieldMeta = (field) => {
      var _a2;
      const metaField = (_a2 = meta == null ? void 0 : meta.fields) == null ? void 0 : _a2.find((f) => f.fieldname === field.fieldname);
      return {
        label: field.label || (metaField == null ? void 0 : metaField.label) || field.fieldname,
        fieldtype: (metaField == null ? void 0 : metaField.fieldtype) || "Data",
        options: metaField == null ? void 0 : metaField.options
      };
    };
    const autoFormat = (value, fieldtype, options) => {
      var _a2, _b2;
      if (value === null || value === void 0 || value === "")
        return '<span class="text-muted">\u2014</span>';
      switch (fieldtype) {
        case "Link":
          if (options && value != null) {
            const slug = String(options).toLowerCase().replace(/\s+/g, "-");
            const escapedValue = escapeHtml(value);
            return `<a href="/app/${escapeHtml(slug)}/${encodeURIComponent(String(value))}" target="_blank">${escapedValue}</a>`;
          }
          return escapeHtml(value);
        case "Select":
          return `<span class="badge badge-light">${escapeHtml(value)}</span>`;
        case "Date":
        case "Datetime":
          const dateValue = ((_a2 = frappe == null ? void 0 : frappe.datetime) == null ? void 0 : _a2.str_to_user) ? frappe.datetime.str_to_user(value) : String(value);
          return escapeHtml(dateValue);
        case "Currency":
        case "Float":
        case "Int":
          const formattedValue = ((_b2 = window.frappe) == null ? void 0 : _b2.format_value) ? window.frappe.format_value(value, { fieldtype }) : String(value);
          return escapeHtml(formattedValue);
        case "Check":
          return value ? '<span class="text-success">\u2713 Sim</span>' : '<span class="text-danger">\u2717 N\xE3o</span>';
        default:
          return escapeHtml(value);
      }
    };
    let rows = "";
    let thead = "";
    if (isTable) {
      if (arr.length === 0) {
        rows = `<tr><td colspan="${fields.length}" class="text-center text-muted">Nenhum dado encontrado.</td></tr>`;
      } else {
        rows = arr.map(
          (row) => "<tr>" + fields.map((field) => {
            const metaF = getFieldMeta(field);
            const value = row[field.fieldname];
            const displayValue = field.formatter ? field.formatter(value, row, metaF) : autoFormat(value, metaF.fieldtype, metaF.options);
            return `<td${metaF.fieldtype === "Link" ? ' data-debug-link="true"' : ""}>${displayValue}</td>`;
          }).join("") + "</tr>"
        ).join("");
        thead = "<tr>" + fields.map((field) => {
          const metaF = getFieldMeta(field);
          const label = field.label || metaF.label || field.fieldname;
          return `<th class="text-muted">${escapeHtml(label)}</th>`;
        }).join("") + "</tr>";
      }
    } else {
      rows = fields.map((field) => {
        const metaF = getFieldMeta(field);
        const value = docOrRows[field.fieldname];
        const displayValue = field.formatter ? field.formatter(value, docOrRows, metaF) : autoFormat(value, metaF.fieldtype, metaF.options);
        const label = field.label || metaF.label || field.fieldname;
        return `<tr><td>${escapeHtml(label)}</td><td>${displayValue}</td></tr>`;
      }).join("");
    }
    const table_html = `<div class="form-section" style="margin-bottom: 16px;">
      <div class="table-responsive" style="border: 1px solid var(--border-color); border-radius: var(--border-radius); overflow: hidden;">
        <table class="table table-bordered" style="margin: 0; border: none;">
          ${thead ? `<thead class="table-header">${thead}</thead>` : ""}
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    </div>`;
    if (typeof wrapper.html === "function") {
      wrapper.html(table_html);
    } else if (typeof window !== "undefined" && window.jQuery && wrapper instanceof window.jQuery) {
      wrapper.html(table_html);
    } else if (wrapper instanceof HTMLElement) {
      wrapper.innerHTML = table_html;
    }
  };
  agt.utils.form.set_button_primary_style = function(frm, fieldname) {
    const field = frm.fields_dict[fieldname];
    if (!(field == null ? void 0 : field.$input)) {
      console.warn(`Campo '${fieldname}' n\xE3o encontrado ou n\xE3o \xE9 um bot\xE3o v\xE1lido.`);
      return;
    }
    if (field.df.fieldtype === "Button") {
      const $button = field.$input;
      if ($button && $button.length) {
        $button.removeClass("btn-default btn-secondary btn-success btn-warning btn-danger btn-info btn-light btn-dark");
        $button.addClass("btn-primary");
      }
    } else {
      console.warn(`Campo '${fieldname}' n\xE3o \xE9 do tipo Button.`);
    }
  };
  agt.utils.form.transport_values = function(targetForm, field) {
    if (!agt.src_frm)
      return;
    if (!targetForm.doc.__islocal)
      return;
    const fieldNames = targetForm.meta.fields.map((f) => f.fieldname);
    Object.entries(agt.src_frm.fields_dict).forEach(([key, field2]) => {
      if (!field2.value || typeof field2.value === "string" && field2.value.trim() === "")
        return;
      if (!fieldNames.includes(key))
        return;
      if (targetForm.doc[key] === field2.value)
        return;
      console.log(`Setting ${key} to ${field2.value}`);
      targetForm.set_value(key, field2.value);
    });
    targetForm.set_value(field, agt.src_frm.docname);
    targetForm.save();
  };

  // ../frappe_agt/frappe_agt/public/ts/utils/table.ts
  frappe.provide("agt.utils.table");
  frappe.provide("agt.utils.table.row");
  agt.utils.table.row.add_one = async function(form, child_doctype, fields_record) {
    const snake_child_doctype = agt.utils.text.to_snake_case(child_doctype);
    const child = form.add_child(snake_child_doctype, fields_record);
    form.dirty();
    form.refresh_field(snake_child_doctype);
    await form.save();
    return child;
  };
  agt.utils.table.row.add_many = async function(form, child_doctype, fields_record_arr) {
    const snake_child_doctype = agt.utils.text.to_snake_case(child_doctype);
    const children = [];
    fields_record_arr.forEach((fields_record) => {
      const child = form.add_child(snake_child_doctype, fields_record);
      children.push(child);
    });
    form.dirty();
    form.refresh_field(snake_child_doctype);
    await form.save();
    return children;
  };
  agt.utils.table.row.update_one = async function(frm, fields_record) {
    const doctype_to_use = frm.doctype || frm.parenttype || "Unknown";
    await Promise.all(
      Object.entries(fields_record).map(
        ([fieldname, value]) => frappe.model.set_value(doctype_to_use, frm.name, fieldname, value)
      )
    );
  };
  agt.utils.table.row.delete_one = async function(_form, child_doctype, docname) {
    frappe.model.clear_doc(child_doctype, docname);
  };
  agt.utils.table.row.get_one = function(form, child_doctype, filters) {
    const snake_case_doctype = agt.utils.text.to_snake_case(child_doctype);
    const childTable = form.doc[snake_case_doctype];
    if (!childTable)
      return;
    return childTable.find((row) => {
      for (const [k, v] of Object.entries(filters)) {
        if (row[k] !== v)
          return false;
      }
      return true;
    });
  };
  agt.utils.table.row.get_last = function(form, child_doctype) {
    const snake_case_doctype = agt.utils.text.to_snake_case(child_doctype);
    const childTable = form.doc[snake_case_doctype];
    if (!childTable)
      return;
    return childTable[childTable.length - 1];
  };
  agt.utils.table.row.find = function(form, child_doctype, filters) {
    const snake_case_doctype = agt.utils.text.to_snake_case(child_doctype);
    const childTable = form.doc[snake_case_doctype];
    if (!childTable)
      return [];
    return childTable.filter((row) => {
      if (!filters.and && !filters.or)
        return false;
      let andPassed = true;
      let orPassed = false;
      if (filters.and) {
        for (const [k, v] of Object.entries(filters.and)) {
          if (row[k] !== v) {
            andPassed = false;
            break;
          }
        }
      }
      if (filters.or) {
        for (const [k, v] of Object.entries(filters.or)) {
          if (Array.isArray(v) && v.includes(row[k])) {
            orPassed = true;
            break;
          }
          if (row[k] === v) {
            orPassed = true;
            break;
          }
        }
      } else {
        orPassed = true;
      }
      return andPassed && orPassed;
    });
  };
  agt.utils.table.row.update_last = async function(form, child_doctype, fields_record) {
    const lastRow = agt.utils.table.row.get_last(form, child_doctype);
    if (!lastRow)
      return;
    await agt.utils.table.row.update_one(lastRow, fields_record);
  };
  agt.utils.table.is_sync = async function(current, remote, docname, workflowStateField) {
    if (current.length !== remote.length)
      return false;
    const currentMap = new Map(current.map((row) => [row[docname], row]));
    const remoteMap = new Map(remote.map((r) => [r.name, r]));
    const allDocsExist = current.every((row) => remoteMap.get(row[docname])) && remote.every((row) => currentMap.has(row.name));
    if (!allDocsExist)
      return false;
    if (workflowStateField) {
      return !remote.some((remoteItem) => {
        const currentItem = currentMap.get(remoteItem.name);
        return currentItem && currentItem[workflowStateField] !== remoteItem.workflow_state;
      });
    }
    return true;
  };
  agt.utils.table.set_custom_properties = async function(frm, options, fieldname, add_row_label, default_values, apply_only_first) {
    var _a, _b;
    const elementsToHide = {
      hide_add_row: ".grid-add-row",
      hide_remove_row: ".grid-remove-rows",
      hide_remove_all_rows: ".grid-remove-all-rows",
      hide_row_check: ".grid-row-check",
      hide_append_row: ".grid-append-row",
      hide_shortcuts: ".grid-shortcuts",
      hide_check: ".grid-body .grid-row .grid-row-check",
      hide_grid_delete_row: ".grid-delete-row",
      hide_grid_move_row: ".grid-move-row"
    };
    const field = frm.fields_dict[fieldname];
    if (!((_a = field == null ? void 0 : field.grid) == null ? void 0 : _a.wrapper))
      return;
    const applyDefaultValues = (rowDoc, rowIndex) => {
      if (!default_values || !Array.isArray(default_values))
        return;
      if (default_values.length > 0) {
        const defaultSet = default_values[Math.min(rowIndex, default_values.length - 1)] || default_values[0];
        if (defaultSet) {
          Object.entries(defaultSet).forEach(([key, value]) => {
            if (!(key in rowDoc) || rowDoc[key] === void 0) {
              rowDoc[key] = value;
            }
          });
        }
      }
    };
    const applyVisibilitySettings = () => {
      var _a2;
      Object.entries(elementsToHide).forEach(([option, selector]) => {
        if (options[option] && field.grid && field.grid.wrapper) {
          field.grid.wrapper.find(selector).hide();
        }
      });
      if ((options == null ? void 0 : options.hide_config_columns) === true) {
        $(`div[data-fieldname="${fieldname}"] div.col.grid-static-col.d-flex.justify-content-center`).css({ "visibility": "hidden" });
        if ((_a2 = frm.fields_dict[fieldname]) == null ? void 0 : _a2.$wrapper) {
          frm.fields_dict[fieldname].$wrapper.find("div.col.grid-static-col.d-flex.justify-content-center").css({ "visibility": "hidden" });
        }
      }
    };
    const gridObj = field.grid;
    if (gridObj && !gridObj._visibility_hooks_attached) {
      gridObj._visibility_hooks_attached = true;
      if (typeof gridObj.add_new_row === "function") {
        const originalAddNewRow = gridObj.add_new_row;
        gridObj.add_new_row = function(...args) {
          const result = originalAddNewRow.apply(this, args);
          if (result && default_values && Array.isArray(default_values) && default_values.length > 0) {
            const currentRows = frm.doc[fieldname] || [];
            const newRowIndex = currentRows.length - 1;
            const shouldApplyDefaults = apply_only_first === void 0 || apply_only_first === false || apply_only_first === true && newRowIndex === 0;
            if (newRowIndex >= 0 && currentRows[newRowIndex] && shouldApplyDefaults) {
              applyDefaultValues(currentRows[newRowIndex], newRowIndex);
              setTimeout(() => {
                gridObj.refresh();
              }, 100);
            }
          }
          applyVisibilitySettings();
          return result;
        };
      }
      if (typeof gridObj.refresh === "function") {
        const originalRefresh = gridObj.refresh;
        gridObj.refresh = function(...args) {
          const result = originalRefresh.apply(this, args);
          applyVisibilitySettings();
          return result;
        };
      }
    }
    if ((options == null ? void 0 : options.hidden) !== void 0) {
      frm.set_df_property(fieldname, "hidden", options.hidden ? 1 : 0);
    }
    if ((options == null ? void 0 : options.read_only) !== void 0) {
      frm.set_df_property(fieldname, "read_only", options.read_only ? 1 : 0);
    }
    if ((options == null ? void 0 : options.reqd) !== void 0) {
      frm.set_df_property(fieldname, "reqd", options.reqd ? 1 : 0);
    }
    if ((options == null ? void 0 : options.label) !== void 0) {
      frm.set_df_property(fieldname, "label", options.label);
    }
    if ((options == null ? void 0 : options.description) !== void 0) {
      frm.set_df_property(fieldname, "description", options.description);
    }
    if ((options == null ? void 0 : options.cannot_add_rows) !== void 0) {
      frm.set_df_property(fieldname, "cannot_add_rows", options.cannot_add_rows ? 1 : 0);
    }
    if ((options == null ? void 0 : options.cannot_delete_rows) !== void 0) {
      frm.set_df_property(fieldname, "cannot_delete_rows", options.cannot_delete_rows ? 1 : 0);
    }
    if (add_row_label && frm.fields_dict[fieldname] && frm.fields_dict[fieldname].grid) {
      frm.refresh_field(fieldname);
      const grid = frm.fields_dict[fieldname].grid;
      const btn = (_b = grid == null ? void 0 : grid.wrapper) == null ? void 0 : _b.find(".grid-add-row");
      if (btn && btn.length) {
        btn.text(add_row_label);
      }
    }
  };
  agt.utils.table.custom_add_row_button = function(frm, fieldname, label) {
    var _a;
    if (frm.fields_dict[fieldname] && frm.fields_dict[fieldname].grid) {
      frm.refresh_field(fieldname);
      const grid = frm.fields_dict[fieldname].grid;
      const btn = (_a = grid == null ? void 0 : grid.wrapper) == null ? void 0 : _a.find(".grid-add-row");
      if (btn && btn.length) {
        btn.text(label);
      }
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/workflow/validate.ts
  frappe.provide("agt.workflow.validate");
  agt.workflow.validate = async (action_extended) => {
    if (cur_frm.doc.__islocal)
      return;
    if (!workflow_validations)
      return;
    const workflow_state = cur_frm.doc.workflow_state;
    const workflow_action = cur_frm.states.frm.selected_workflow_action;
    if (!workflow_state) {
      console.warn("Workflow state not found.");
      return;
    } else if (!workflow_action && !action_extended) {
      console.warn("Workflow action not found.");
      return;
    }
    const validations_to_run = workflow_validations.filter((w) => {
      var _a;
      if (!workflow_action && action_extended) {
        return w.workflow_state === workflow_state && ((_a = w.action_extended) == null ? void 0 : _a.includes(action_extended));
      } else if (workflow_action && !action_extended) {
        const matches_action = Array.isArray(w.workflow_action) ? w.workflow_action.includes(workflow_action) : w.workflow_action === workflow_action;
        return w.workflow_state === workflow_state && matches_action;
      }
      return false;
    });
    if (!validations_to_run.length) {
      console.log(`Workflow validation not found for state: ${workflow_state}`);
      return;
    }
    for (const wv of validations_to_run) {
      const req_fields = wv.workflow_fields;
      const not_missing = (v) => Boolean(v) || v === 0;
      const missing_fields_name = req_fields.filter((f) => {
        const value = cur_frm.doc[f.name];
        if (not_missing(value))
          return false;
        if (f.should_validate && !f.should_validate(cur_frm))
          return false;
        return true;
      }).map((f) => f.name);
      const missing_fields_html = missing_fields_name.map((f_name) => {
        const field_dict = cur_frm.fields_dict[f_name];
        const f_label = field_dict == null ? void 0 : field_dict.df.label;
        console.log(`Missing field: ${f_label || f_name}`);
        return `<li>${f_label || f_name}</li>`;
      }).join("");
      const depends_on_html = req_fields.map((f) => {
        if (!f.depends_on)
          return "";
        const depends_on = f.depends_on(cur_frm);
        if (!depends_on)
          return "";
        const f_name = f.name;
        const field_dict = cur_frm.fields_dict[f_name];
        const f_label = field_dict == null ? void 0 : field_dict.df.label;
        return `<li>${f_label || f_name} : ${depends_on}</li>`;
      }).join("");
      if (!missing_fields_name.length && !depends_on_html.length)
        continue;
      setTimeout(() => {
        if (action_extended)
          return;
        frappe.dom.unfreeze();
      }, 2 * 1e3);
      const missing_fields_msg = !missing_fields_html.length ? "" : `
    <p>${__(`\u26A0\uFE0F Preencha os campos abaixo:`)}</p>
    <ul>${missing_fields_html}</ul>`;
      const dependency_fields_msg = !depends_on_html.length ? "" : `
    <p>${__("\u26A0\uFE0F As dependencias abaixo falharam:")}</p>
    <ul>${depends_on_html}</ul>`;
      frappe.throw({
        title: __("Aten\xE7\xE3o!"),
        message: missing_fields_msg + dependency_fields_msg
      });
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/workflow/pre_action.ts
  frappe.provide("agt.workflow.pre_action");
  agt.workflow.pre_action = async () => {
    if (!window.workflow_preactions)
      return;
    for (const [workflow_action, routine] of Object.entries(window.workflow_preactions)) {
      if (cur_frm.states.frm.selected_workflow_action !== workflow_action)
        continue;
      for (const [preaction, fnc] of Object.entries(routine)) {
        try {
          console.log(`Running function for ${workflow_action} - ${preaction}`);
          await fnc(cur_frm);
        } catch (e) {
          console.error("Preaction error", e);
          const errorMessage = e instanceof Error ? e.message : String(e);
          frappe.throw({
            title: __("Erro"),
            message: errorMessage
          });
          break;
        }
      }
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/metadata/doctype/checklist.ts
  frappe.provide("agt.metadata.doctype.checklist");
  agt.metadata.doctype.checklist = {
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

  // ../frappe_agt/frappe_agt/public/ts/metadata/doctype/service_protocol.ts
  frappe.provide("agt.metadata.doctype.service_protocol");
  agt.metadata.doctype.service_protocol = {
    workflow_action: {
      request_revision: {
        name: "Solicitar Revis\xE3o",
        id: 1
      },
      request_checklist: {
        name: "Solicitar Checklist",
        id: 2
      },
      request_correction: {
        name: "Solicitar Proposta de Envio",
        id: 3
      },
      reject: {
        name: "Rejeitar",
        id: 4
      },
      cancel: {
        name: "Cancelar",
        id: 5
      },
      finish_correction: {
        name: "Aprovar Corre\xE7\xE3o",
        id: 6
      }
    },
    workflow_state: {
      holding_action: {
        name: "Aguardando A\xE7\xE3o",
        id: 1
      },
      growatt_review: {
        name: "Revis\xE3o",
        id: 2
      },
      finished: {
        name: "Conclu\xEDdo",
        id: 3
      },
      rejected: {
        name: "Rejeitado",
        id: 4
      },
      cancelled: {
        name: "Cancelado",
        id: 5
      }
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/metadata/doctype/ticket.ts
  frappe.provide("agt.metadata.doctype.ticket");
  agt.metadata.doctype.ticket = {
    workflow_action: {
      approve: {
        name: "Aprovar",
        id: 1
      },
      finish: {
        name: "Concluir",
        id: 2
      },
      reject: {
        name: "Rejeitar",
        id: 3
      },
      cancel: {
        name: "Cancelar",
        id: 4
      },
      reactive: {
        name: "Reativar",
        id: 5
      }
    },
    workflow_state: {
      draft: {
        name: "Rascunho",
        id: 1
      },
      active: {
        name: "Ativo",
        id: 2
      },
      finished: {
        name: "Concluido",
        id: 3
      },
      rejected: {
        name: "Rejeitado",
        id: 4
      },
      cancelled: {
        name: "Cancelado",
        id: 5
      }
    }
  };

  // ../frappe_agt/frappe_agt/public/ts/metadata/doctype/compliance_statement.ts
  frappe.provide("agt.metadata.doctype.compliance_statement");
  agt.metadata.doctype.compliance_statement = {
    workflow_action: {
      approve: {
        name: "Aprovar",
        id: 1
      },
      request_analysis: {
        name: "Solicitar An\xE1lise",
        id: 2
      },
      request_correction: {
        name: "Solicitar Corre\xE7\xE3o",
        id: 3
      },
      finish_review: {
        name: "Finalizar Revis\xE3o",
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
        name: "Finalizar Corre\xE7\xE3o",
        id: 8
      },
      request_documentation: {
        name: "Solicitar Documenta\xE7\xE3o",
        id: 9
      },
      request_checklist: {
        name: "Solicitar Checklist",
        id: 10
      },
      forward_to_support: {
        name: "Encaminhar ao Suporte",
        id: 11
      }
    },
    workflow_state: {
      customer_finish_filling: {
        name: "Cliente: Finalizar Preenchimento",
        id: 1
      },
      growatt_preliminary_assessment: {
        name: "An\xE1lise Preliminar",
        id: 2
      },
      customer_fix_info: {
        name: "Cliente: Corrigir Informa\xE7\xF5es",
        id: 3
      },
      growatt_review: {
        name: "Revis\xE3o",
        id: 4
      },
      customer_checklist_requested: {
        name: "Cliente: Checklist Solicitado",
        id: 5
      },
      checklist_finished: {
        name: "Checklist Conclu\xEDdo",
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
        name: "Conclu\xEDdo",
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
        name: "Finalizado: Corre\xE7\xE3o Faltante",
        id: 15
      },
      customer_necessary_action: {
        name: "Cliente: A\xE7\xE3o Necess\xE1ria",
        id: 16
      }
    }
  };
})();
//# sourceMappingURL=frappe_agt.bundle.RQ7E6JAI.js.map
