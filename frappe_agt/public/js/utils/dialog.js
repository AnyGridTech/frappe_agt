// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
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
    if (dialog) {
      dialog.hide();
      const $backdrop = $(dialog["wrapper"]).data("bs.modal")?.$backdrop;
      $backdrop?.remove();
    }
  });
  agt.utils.dialog.created = [];
};
agt.utils.dialog.close_by_title = function(title) {
  const dialogIndex = agt.utils.dialog.created.findIndex((d) => d.title === title);
  if (dialogIndex >= 0) {
    const dialog = agt.utils.dialog.created[dialogIndex];
    if (dialog) {
      dialog.hide();
      const $backdrop = $(dialog["wrapper"]).data("bs.modal")?.$backdrop;
      $backdrop?.remove();
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
    if ($(dialog["wrapper"]).is(":visible")) {
      const zIndex = baseModalIndex + index * 2;
      $(dialog["wrapper"]).css("z-index", zIndex);
      const modalId = $(dialog["wrapper"]).attr("id");
      $(`.modal-backdrop[data-modal-id="${modalId}"]`).css("z-index", baseBackdropIndex + index * 2);
      const $backdrop = $(dialog["wrapper"]).data("bs.modal")?.$backdrop;
      if ($backdrop && !$backdrop.attr("data-modal-id")) {
        $backdrop.attr("data-modal-id", modalId);
      }
    }
  });
};
