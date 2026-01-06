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

/**
 * Shows a non-dismissible loading modal with a spinner
 * Useful for blocking user interaction during critical operations
 * 
 * @param title - The title of the modal
 * @param message - The message to display
 * @returns The dialog instance
 * 
 * @example
 * const loadingModal = agt.utils.dialog.show_loading_modal(
 *   'Processing',
 *   'Please wait while we process your request...'
 * );
 * // ... perform operation ...
 * loadingModal.hide();
 */
agt.utils.dialog.show_loading_modal = function(title: string, message: string): any {
  const dialog = new frappe.ui.Dialog({
    title: __(title),
    size: 'large',
    fields: [
      {
        fieldtype: 'HTML',
        fieldname: 'loading_message',
        label: '',
        options: `<div style="padding: 40px; text-align: center;">
          <p style="font-size: 18px; line-height: 1.8; font-weight: 500; color: #000; margin-bottom: 30px;">
            ${__(message)}
          </p>
          <div style="margin-top: 30px;">
            <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem; border-width: 0.4rem;">
              <span class="sr-only">Loading...</span>
            </div>
          </div>
        </div>`
      }
    ],
    static: true
  });

  // Remove close button and ESC key functionality
  dialog['$wrapper'].find('.modal-header .close').remove();
  dialog['$wrapper'].find('.modal').attr('data-backdrop', 'static');
  dialog['$wrapper'].find('.modal').attr('data-keyboard', 'false');
  
  dialog.show();
  
  return dialog;
};

/**
 * Shows a confirmation modal with primary and secondary actions
 * 
 * @param title - The title of the modal
 * @param message - The message to display
 * @param primaryLabel - Label for the primary action button
 * @param secondaryLabel - Label for the secondary action button
 * @param onPrimary - Callback function for primary action
 * @param onSecondary - Optional callback function for secondary action
 * @returns The dialog instance
 * 
 * @example
 * agt.utils.dialog.show_confirmation_modal(
 *   'Confirm Action',
 *   'Are you sure you want to proceed?',
 *   'Yes, Continue',
 *   'No, Cancel',
 *   async () => {
 *     console.log('User confirmed');
 *     // perform action
 *   }
 * );
 */
agt.utils.dialog.show_confirmation_modal = function(
  title: string,
  message: string,
  primaryLabel: string,
  secondaryLabel: string,
  onPrimary: () => void | Promise<void>,
  onSecondary?: () => void | Promise<void>
): any {
  // Check if a confirmation dialog with the same title is already open
  if ($(`.modal.show .modal-title:contains("${title}")`).length > 0) {
    return;
  }

  const dialog = new frappe.ui.Dialog({
    title: __(title),
    fields: [
      {
        fieldtype: 'HTML',
        fieldname: 'message',
        label: '',
        options: `<p>${__(message)}</p>`
      }
    ],
    primary_action_label: __(primaryLabel),
    secondary_action_label: __(secondaryLabel),
    primary_action: async function () {
      dialog.hide();
      if (onPrimary) {
        await onPrimary();
      }
    },
    secondary_action: async function () {
      dialog.hide();
      if (onSecondary) {
        await onSecondary();
      }
    }
  });
  
  dialog.show();
  
  return dialog;
};

/**
 * Creates a beforeunload handler to prevent browser tab close
 * Returns a function to remove the handler when no longer needed
 * 
 * @returns Function to remove the handler
 * 
 * @example
 * const removeHandler = agt.utils.dialog.prevent_tab_close();
 * // ... perform critical operation ...
 * removeHandler(); // Allow tab close again
 */
agt.utils.dialog.prevent_tab_close = function(): () => void {
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    e.preventDefault();
  };

  window.addEventListener('beforeunload', beforeUnloadHandler);

  return () => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
  };
};