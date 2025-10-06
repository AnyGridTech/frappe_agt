frappe.provide('agt.utils.dialog');

agt.utils.dialog.created = [];

agt.utils.dialog.load = function(diagConfig: any) {
  const dialog = new frappe.ui.Dialog(diagConfig);

  // Adiciona ao array de diálogos antes de mostrar
  agt.utils.dialog.created.push(dialog);

  // Configura evento para quando o diálogo fechar (via "×" ou ESC)
  $(dialog['wrapper']).on('hidden.bs.modal', () => {
    const index = agt.utils.dialog.created.indexOf(dialog);
    if (index > -1) {
      agt.utils.dialog.created.splice(index, 1);
      agt.utils.dialog.refresh_dialog_stacking();
    }
  });

  // Mostra o diálogo
  dialog.show();

  // Aplica z-index após o diálogo estar visível
  setTimeout(() => agt.utils.dialog.refresh_dialog_stacking(), 50);

  return dialog;
};

agt.utils.dialog.close_all = function() {
  // Captura os diálogos antes de fechá-los
  const dialogs = [...agt.utils.dialog.created];

  // Fecha cada diálogo
  dialogs.forEach((dialog: any) => {
    if (dialog) {
      dialog.hide();
      // Remova o backdrop manualmente
      const $backdrop = $(dialog['wrapper']).data("bs.modal")?.$backdrop;
      $backdrop?.remove();
    }
  });

  // Limpa o array
  agt.utils.dialog.created = [];
};

agt.utils.dialog.close_by_title = function(title: string) {
  const dialogIndex = agt.utils.dialog.created.findIndex((d: any) => d.title === title);
  if (dialogIndex >= 0) {
    const dialog = agt.utils.dialog.created[dialogIndex];
    if (dialog) {
      dialog.hide();

      // Remova o backdrop manualmente
      const $backdrop = $(dialog['wrapper']).data("bs.modal")?.$backdrop;
      $backdrop?.remove();

      // Remove o diálogo da lista
      agt.utils.dialog.created.splice(dialogIndex, 1);

      // Reaplica o z-index para os diálogos restantes
      agt.utils.dialog.refresh_dialog_stacking();
    }
  }
};

agt.utils.dialog.show_debugger_alert = function(_frm: any, message: string, indicator: string, timeout: number = 10) {
  if (frappe.user.has_role(['IT', 'Administrator', 'System Manager'])) {
    frappe.show_alert({ message: __(message), indicator: indicator }, timeout);
  }
};

agt.utils.dialog.refresh_dialog_stacking = function() {
  if (typeof $ === 'undefined') {
    console.error('jQuery is not loaded. Unable to refresh dialog stacking.');
    return;
  }

  // Base z-index para modal e backdrop
  const baseModalIndex = 1051;
  const baseBackdropIndex = 1050;

  // Para cada diálogo em ordem de criação
  agt.utils.dialog.created.forEach((dialog: any, index: number) => {
    // Verifica se o diálogo está visível
    if ($(dialog['wrapper']).is(':visible')) {
      // Configura z-index com incremento para cada diálogo
      const zIndex = baseModalIndex + (index * 2);

      // Aplica ao modal
      $(dialog['wrapper']).css('z-index', zIndex);

      // Encontra e aplica ao backdrop correspondente
      const modalId = $(dialog['wrapper']).attr('id');
      $(`.modal-backdrop[data-modal-id="${modalId}"]`).css('z-index', baseBackdropIndex + (index * 2));

      // Associa ID do modal ao backdrop para facilitar a correspondência
      const $backdrop = $(dialog['wrapper']).data("bs.modal")?.$backdrop;
      if ($backdrop && !$backdrop.attr('data-modal-id')) {
        $backdrop.attr('data-modal-id', modalId);
      }
    }
  });
};