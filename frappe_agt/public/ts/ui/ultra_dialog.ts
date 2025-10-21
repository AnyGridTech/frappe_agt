
import type {
  UltraDialogField,
  UltraDialogInstance,
  UltraDialogProps,
  UltraDialogSetMessageOptions,
  UltraDialogState,
  RemovableProps
} from '@anygridtech/frappe-agt-types/agt/client/ui/ultra_dialog';

frappe.provide('agt.ui.ultra_dialog');

/**
 * Implements a customizable, draggable modal dialog with header, body, and footer sections.
 * Supports dynamic theming, show/hide toggles, copy-to-clipboard, and close behavior.
 */
class UltraDialogImpl implements UltraDialogInstance {
  // --- Private DOM references ---
  private modal: HTMLElement | null = null;
  private header: HTMLElement | null = null;
  private body: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  private backdrop: HTMLElement | null = null;
  private hide_btn: HTMLElement | null = null;
  private copy_btn: HTMLElement | null = null;
  private close_btn: HTMLButtonElement | null = null;
  // --- Internal state and identifiers ---
  private themeKeyCacheLocal: string = '';
  private body_prefix_id: string = 'ultra-modal-body';
  private header_prefix_id: string = 'ultra-modal-header';
  private footer_prefix_id: string = 'ultra-modal-footer';
  private close_prefix_id: string = 'ultra-modal-close';
  private copy_prefix_id = 'ultra-modal-copy';
  private hide_prefix_id = 'ultra-modal-hide';
  private body_id: string = '';
  private header_id: string = '';
  private footer_id: string = '';
  private hide_id: string = '';
  private copy_id: string = '';
  private close_id: string = '';
  // UI Element Content (Buttons/Icons)
  private close_btn_default = __('Fechar');
  private close_btn_waiting = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> ${__('Aguarde...')}`;
  private hide_btn_default = __('Ocultar');
  private hide_btn_show = __('Mostrar');
  // private closeIconDefault = frappe.utils.icon('close', 'sm');
  // private closeIconWaiting = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
  // --- Public properties ---
  id!: string;
  title: string;
  message: string;
  size: number = 360;
  zOrder: number = 1050;
  can_copy: boolean = true;
  can_hide: boolean = true;
  can_close: boolean = true;
  can_drag: boolean = true;
  can_drag_mobile: boolean = true;
  auto_scroll: boolean = true;
  backdrop_blur: boolean = true;
  state: UltraDialogState = "default";

  /**
 * Creates a new UltraDialog with given properties.
 * @param props.title - Initial title text.
 * @param props.message - Initial body message.
 */
  constructor(props: UltraDialogProps) {
    this.title = props.title;
    this.message = props.message;
    // --- Generate unique IDs and build DOM ---
    this.generate_random_id();
    this.default_initialization();
    this.parameters_initialization(props);
  }

  /**
   * This function initializes the properties of the Dialog.
   * It will set the default values for the dialog.
   * It sets the initial visibility, drag, copy, hide and close properties.
   * @param props - Properties to initialize the dialog with.
   */
  private parameters_initialization(props: UltraDialogProps) {
    this.visible(props.visible);
    this.show_hide_btn(props.can_hide ?? true);
    this.show_copy_btn(props.can_copy ?? true);
    this.show_close_btn(props.can_close ?? true);
    this.set_drag(props.can_drag ?? true);
    this.set_drag_mobile(props.can_drag_mobile ?? true);
    this.set_state(props.initial_state || 'default');
  }

  // --- Initializes the default settings ---
  private default_initialization() {
    this.create_modal();
    this.create_header();
    this.create_body();
    this.create_footer();
    // this.create_backdrop();
    this.load_theme_changer();
    this.load_dialog_dragger();

    if (this.message) {
      this.set_message(this.message, { auto_scroll: this.auto_scroll });
    }
  }

  /**
 * Generates unique element IDs for body, header, footer, log and close button.
 * @returns A unique ID for the modal dialog.
 */
  private generate_random_id() {
    this.id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.body_id = `${this.body_prefix_id}-${this.id}`;
    this.header_id = `${this.header_prefix_id}-${this.id}`;
    this.footer_id = `${this.footer_prefix_id}-${this.id}`;
    this.close_id = `${this.close_prefix_id}-${this.id}`;
    this.copy_id = `${this.copy_prefix_id}-${this.id}`;
    this.hide_id = `${this.hide_prefix_id}-${this.id}`;
  }

  /**
   * Creates and appends the modal container to the document, applying base styles.
   */
  private create_modal() {
    if (this.modal) {
      return this.modal;
    }
    this.modal = document.createElement('div');
    this.modal.id = this.id;
    this.modal.setAttribute('name', 'modal');
    this.modal.style.position = 'fixed';
    this.modal.style.top = '120px';
    this.modal.style.left = '50%';
    this.modal.style.transform = 'translateX(-50%)';
    this.modal.style.width = `${this.size}px`;
    this.modal.style.maxWidth = '90%';
    this.modal.style.zIndex = `${this.zOrder}`;
    this.modal.setAttribute('role', 'dialog');
    this.modal.setAttribute('aria-modal', 'true'); //
    this.modal.setAttribute('aria-labelledby', this.header_id);
    this.modal.setAttribute('aria-describedby', this.body_id);
    const rootStyles = getComputedStyle(document.documentElement);
    const backgroundColor = rootStyles.getPropertyValue('--bg-color').trim() || '#fff';
    const textColor = rootStyles.getPropertyValue('--text-color').trim() || '#212529';
    const borderColor = rootStyles.getPropertyValue('--border-color').trim() || '#ced4da';
    this.modal.style.backgroundColor = backgroundColor;
    this.modal.style.color = textColor;
    this.modal.style.border = `1px solid ${borderColor}`;
    this.modal.style.borderRadius = '6px';
    this.modal.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
    this.modal.style.fontFamily = 'inherit';
    this.modal.style.userSelect = 'none';
    document.body.appendChild(this.modal);

    return this.modal;
  }

  /**
   * Creates the header element, applies title and drag cursor if enabled.
   */
  private create_header() {
    if (this.header) {
      console.warn(`Header already exists. You can not create another header for modal id: ${this.id}`);
      return this.header;
    }
    this.header = document.createElement('div');
    this.header.id = this.header_id;
    this.header.setAttribute('name', 'header');
    this.header.style.padding = '10px'; //'10px 15px'; // Adjust padding slightly
    this.header.style.backgroundColor = '#f5f5f5';
    this.header.style.color = '#212529';
    this.header.style.borderBottom = `1px solid #ced4da`;
    this.header.style.fontWeight = 'bold';
    this.header.textContent = this.title;
    this.header.style.cursor = this.can_drag || this.can_drag_mobile ? 'move' : 'default';
    // this.header!style.filter = 'invert(1)';
    this.header.style.borderRadius = '6px 6px 0 0';  // top‑left, top‑right, bottom‑right, bottom‑left :contentReference[oaicite:4]{index=4}

    if (this.modal) {
      this.modal.appendChild(this.header);
    } else {
      console.error(`Could not initialize the header. Modal is not yet defined, please instantiate the modal before trying to create the header. Modal ID: ${this.id}`);
    }

    return this.header;
  }

  /**
   * Creates the body element and inserts the initial message log container.
   */
  private create_body() {
    if (this.body) {
      return this.body;
    }
    this.body = document.createElement('div');
    this.body.id = this.body_id;
    this.body.setAttribute('name', 'body');
    this.body.style.padding = '10px';
    this.body.style.maxHeight = '300px';
    this.body.style.overflowY = 'auto';
    // this.body.innerHTML = `<div id="${this.body_id}">${this.message}</div>`;

    if (this.modal) {
      this.modal.appendChild(this.body);
    } else {
      console.error(`Could not initialize the body. Modal is not yet defined, please instantiate the modal before trying to create the body. Modal ID: ${this.id}`);
    }

    return this.body;
  }

  /**
   * Creates the footer element, adding hide, copy and close buttons as configured.
   */
  private create_footer() {
    if (this.footer) {
      return this.footer;
    }
    this.footer = document.createElement('div');
    this.footer.id = this.footer_id;
    this.footer.setAttribute('name', 'footer');
    this.footer.style.padding = '10px'; // '10px 15px'; // Adjust padding slightly
    this.footer.style.display = 'flex';
    this.footer.style.justifyContent = 'flex-end';
    this.footer.style.gap = '10px';
    this.footer.style.borderTop = `1px solid #ced4da`;
    this.footer.style.borderRadius = '0 0 6px 6px';  // top‑left, top‑right, bottom‑right, bottom‑left :contentReference[oaicite:4]{index=4}

    if (this.modal) {
      this.modal.appendChild(this.footer);
    } else {
      console.error(`Could not initialize the footer. Modal is not yet defined, please instantiate the modal before trying to create the footer. Modal ID: ${this.id}`);
    }

    return this.footer;

  }

  /**
   * Creates a semi-transparent backdrop element for the modal dialog.
   * The backdrop covers the full viewport and sits just below the modal in z-order.
   */
  private create_backdrop() {
    if (this.backdrop) {
      return this.backdrop;
    }
    this.backdrop = document.createElement('div');
    this.backdrop.style.position = 'fixed';
    this.backdrop.style.top = '0';
    this.backdrop.style.left = '0';
    this.backdrop.style.width = '100vw';
    this.backdrop.style.height = '100vh';
    this.backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    this.backdrop.style.zIndex = `${this.zOrder - 1}`;
    
    if (this.backdrop_blur) {
      this.backdrop.style.backdropFilter = 'blur(2px)';
    }
    // this.backdrop.style.opacity = '0.5';
    document.body.appendChild(this.backdrop);

    return this.backdrop;
  }

  /**
  * Destroys the backdrop element if it exists.
  *
  * This method checks if the `backdrop` element has been created. 
  * If so, it removes it from the DOM and sets the reference to null, 
  * ensuring proper cleanup and avoiding memory leaks.
  */
  private destroy_backdrop() {
    if (this.backdrop) {
      this.backdrop.remove();
      this.backdrop = null;
    }
  }

  public set_message(
    message: string,
    options?: UltraDialogSetMessageOptions): this {

    const bodyElement = document.getElementById(this.body_id);
    if (!bodyElement) {
      console.error(
        `UltraDialog body element not found for ID: ${this.body_id}`
      );
      return this;
    }

    const messageElement = document.createElement('div');
    messageElement.style.marginBottom = '8px';
    messageElement.innerHTML = message;

    bodyElement.appendChild(messageElement);

    const shouldScroll = options?.auto_scroll !== undefined ? options.auto_scroll : this.auto_scroll;

    if (shouldScroll) {
      setTimeout(() => {
        // Scroll to the bottom of the body element after a short delay
        bodyElement.scrollTop = bodyElement.scrollHeight;
      }, 500);
    }

    return this;
  }

  public set_title(title: string): this {
    if (!this.header) return this;
    this.title = title;
    this.header.textContent = title;
    return this;
  }

  /**
   * Creates a button to toggle the visibility of the modal body.
   * The button text changes based on the current visibility state of the body.
   * @returns The created hide button element.
   */
  private create_hide_btn() {
    if (!this.footer) return;
    this.hide_btn = document.createElement('button');
    this.hide_btn.id = this.hide_id;
    this.hide_btn.setAttribute('name', 'hide_btn');
    this.hide_btn.className = 'btn btn-sm btn-secondary';
    const isHidden = this.body && this.body.style.display === 'none';
    this.hide_btn.textContent = isHidden ? this.hide_btn_default : this.hide_btn_show;
    this.hide_btn.onclick = () => {
      if (this.hide_btn === null) return;
      if (!this.body) return;
      if (this.body.style.display === 'none') {
        this.body.style.display = '';
        this.hide_btn.textContent = this.hide_btn_default;
      } else {
        this.body.style.display = 'none';
        this.hide_btn.textContent = this.hide_btn_show;
      }
    };
    this.footer.insertBefore(this.hide_btn, this.footer.firstChild);
    return this.hide_btn;
  }


  public show_hide_btn(show: boolean): this {
    if (!this.footer) return this;
    if (!show && this.hide_btn) this.removeElementById(this.hide_id);
    if (show && !this.hide_btn) this.create_hide_btn();
    return this;
  }

  /**
   * Creates a button to copy the content of the modal body to the clipboard.
   * @returns The created copy button element.
   */
  private create_copy_btn() {
    if (!this.footer) return;
    this.copy_btn = document.createElement('button');
    this.copy_btn.id = this.copy_id;
    this.copy_btn.setAttribute('name', 'copy_btn');
    this.copy_btn.className = 'btn btn-sm btn-secondary';
    this.copy_btn.textContent = __('Copiar');
    this.copy_btn.onclick = () => {
      const logContainer = this.body;
      if (!logContainer || !logContainer.textContent?.trim()) {
        frappe.show_alert({ message: __('Nenhuma mensagem para copiar.'), indicator: 'orange' }, 5);
        return;
      }
      navigator.clipboard.writeText(logContainer.innerText || logContainer.textContent || '')
        .then(() => frappe.show_alert({ message: __('Mensagens copiadas.'), indicator: 'green' }, 5))
        .catch(err => {
          console.error('Erro ao copiar:', err);
          frappe.show_alert({ message: __('Falha ao copiar mensagens.'), indicator: 'red' }, 5);
        });
    };
    if (this.hide_btn && this.hide_btn.nextSibling) this.footer.insertBefore(this.copy_btn, this.hide_btn.nextSibling);
    else if (this.hide_btn) this.footer.appendChild(this.copy_btn);
    else this.footer.insertBefore(this.copy_btn, this.footer.firstChild);
    return this.copy_btn;
  }

  public show_copy_btn(show: boolean): this {
    if (!this.footer) return this;
    this.can_copy = show;
    if (!show && this.copy_btn) this.removeElementById(this.copy_id);
    if (show && !this.copy_btn) this.create_copy_btn();
    return this;
  }

  /**
   * Creates a button to close the modal dialog.
   * The button is only enabled when the dialog is not in the 'waiting' state.
   * @returns The created close button element.
   */
  private create_close_btn() {
    if (!this.footer) return;
    this.close_btn = document.createElement('button');
    this.close_btn.id = this.close_id;
    this.close_btn.setAttribute('name', 'close_btn');
    this.close_btn.className = 'btn btn-sm btn-primary';
    this.close_btn.textContent = this.close_btn_default;
    this.close_btn.onclick = () => {
      if (this.state !== 'waiting') {
        this.close();
      }
    };
    this.footer.appendChild(this.close_btn);
    this.update_close_btn_state();
    return this.close_btn;
  }

  public show_close_btn(show: boolean): this {
    if (!this.footer) return this;
    this.can_close = show;
    if (show && !this.close_btn) this.create_close_btn();
    if (show && this.close_btn) this.update_close_btn_state();
    if (!show && this.close_btn) this.removeElementById(this.close_id);
    return this;
  }

  /** Helper to update close button based on state */
  private update_close_btn_state() {
    if (!this.close_btn) return;
    if (this.state === 'waiting') {
      this.close_btn.disabled = true;
      this.close_btn.innerHTML = this.close_btn_waiting;
    } else {
      this.close_btn.disabled = false;
      this.close_btn.textContent = this.close_btn_default;
    }
  }

  /**
   * Enables draggable behavior for the modal dialog.
   * Allows the user to click and drag the dialog around the screen by holding the mouse on it.
   * Allows the user to click/tap and drag the dialog around the screen by holding the finger on it.
   * @returns The current instance of the dialog. 
   */
  private load_dialog_dragger(): this {
    // Verify if modal and header are defined
    if (!this.modal || !this.header) {
      console.warn(`Could not load dialog dragger. Modal or Header not defined.`);
      return this;
    }

    // Permission to drag the modal
    const canDragDesktop = !!this.can_drag;
    const canDragMobile = !!this.can_drag_mobile;
    // Detect if touch support is available
    const isTouchDevice = 'ontouchstart' in window;

    // Cursor for moving the header
    this.header.style.cursor = (canDragDesktop || canDragMobile) ? 'move' : 'default';

    // Dragging state
    let dragging = false, offsetX = 0, offsetY = 0;

    // Start dragging (desktop or mobile)
    const startDrag = (clientX: number, clientY: number, allow: boolean) => {
      if (!allow) return;
      dragging = true;
      // Calculate offset based on the current position of the  modal
      offsetX = clientX - this.modal!.offsetLeft;
      offsetY = clientY - this.modal!.offsetTop;
    };

    // Move modal
    const doDrag = (clientX: number, clientY: number) => {
      if (!dragging) return;
      this.modal!.style.left = `${clientX - offsetX}px`;
      this.modal!.style.top = `${clientY - offsetY}px`;
    };

    // Ends dragging
    const endDrag = () => {
      dragging = false;
    };

    // Named handlers for easier removal
    const handleMouseMove = (e: MouseEvent) => doDrag(e.clientX, e.clientY);
    const handleMouseUp = () => {
      endDrag();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        if (touch) {
          doDrag(touch.clientX, touch.clientY);
        }
      }
      e.preventDefault(); // prevents scroll
    };
    const handleTouchEnd = () => {
      endDrag();
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    // --- Desktop Events ---
    this.header.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button !== 0) return; // only primary button
      startDrag(e.clientX, e.clientY, canDragDesktop);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault(); // evita seleção de texto
    });

    // --- Mobile Events (if supported) ---
    if (isTouchDevice) {
      this.header.addEventListener('touchstart', (e: TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        if (touch) {
          startDrag(touch.clientX, touch.clientY, canDragMobile);
        }
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
        e.preventDefault();
      }, { passive: false });
    }
    return this;
  }

  public set_drag(enable: boolean) {
    this.can_drag = enable;
    return this;
  }

  public set_drag_mobile(enable: boolean) {
    if (!this.can_drag) return this;
    this.can_drag_mobile = enable;
    return this;
  }

  public set_state(newState: UltraDialogState): this {
    if (newState !== "waiting" && newState !== "default") {
      console.warn(`Invalid state: ${newState}. State must be 'waiting' or 'default'.`);
      return this;
    }
    console.log(`[set_state] Mudando estado de ${this.state} para: ${newState}`);
    const oldState = this.state;
    this.state = newState;

    const backdropEl = document.getElementById(`${this.id}-backdrop`);
    if (!backdropEl && (newState === 'waiting' || (this.modal && this.modal.style.display !== 'none'))) {
      this.create_backdrop();
    }

    if (this.backdrop) {
      if (newState === "waiting") {
        this.backdrop.style.display = 'block';
      } else if (oldState === "waiting" && newState === "default") {
        this.backdrop.style.display = 'none';
      }
    }

    this.update_close_btn_state();

    return this;
  }

  public close(): this {
    if (this.state === 'waiting') {
      console.warn(`[UltraDialog ${this.id}] Tentativa de fechar o diálogo no estado '${this.state}'. Ação ignorada.`);
      return this;
    }

    if (!this.modal) return this;

    this.modal.remove();
    this.modal = null;
    this.destroy_backdrop();

    console.log(`[UltraDialog ${this.id}] Fechado e removido do DOM.`);

    return this;
  }

  public set_z_order(z: number): this {
    if (!this.modal) return this;
    this.zOrder = z;
    this.modal.style.zIndex = z.toString();
    return this;
  }

  public set_size(size: number): this {
    if (!this.modal) return this;
    this.size = size;
    this.modal.style.width = `${size}px`;
    return this;
  }

  public visible(is_visible?: boolean): this {
    const should_show = is_visible === undefined || is_visible === true;
    if (should_show) {
      this.show();
    } else {
      this.hide();
    }
    return this;
  }

  /**
  * This function is used to hide the dialog.
  * It will hide the dialog from the DOM.
  * @returns Returns the current instance of the dialog.
  */
  private hide(): this {
    if (this.modal) this.modal.style.display = 'none';
    if (this.backdrop) this.backdrop.style.display = 'none';
    return this;
  }

  /**
  * This function is used to show the dialog.
  * It will show the dialog in the DOM.
  * @returns Returns the current instance of the dialog.
  */
  private show(): this {
    // If the modal has been removed, recreate it
    if (!this.modal) {
      this.default_initialization();
    } else {
      this.modal.style.display = '';
    }
    if (this.backdrop) {
      this.backdrop.style.display = '';
    }
    return this;
  }

  public add_field(field: UltraDialogField): this {
    if (!this.body) return this;

    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-group';
    fieldContainer.style.marginBottom = '1rem';

    if (field.label && field.fieldtype !== 'Button') {
      const label = document.createElement('label');
      label.innerHTML = field.label;
      if (field.reqd) {
        label.innerHTML += ' <span class="text-danger">*</span>';
      }
      fieldContainer.appendChild(label);
    }

    let input: HTMLElement;

    switch (field.fieldtype) {
      case 'Text':
      case 'Small Text':
      case 'Long Text':
        input = document.createElement('textarea');
        (input as HTMLTextAreaElement).value = field.default || '';
        input.className = 'form-control';
        break;

      case 'Select':
        input = document.createElement('select');
        input.className = 'form-control';
        if (Array.isArray(field.options)) {
          field.options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = option;
            opt.text = option;
            (input as HTMLSelectElement).add(opt);
          });
        }
        if (field.default) {
          (input as HTMLSelectElement).value = field.default;
        }
        break;

      case 'Check':
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'checkbox';
        input.className = 'form-check-input';
        if (field.default) {
          (input as HTMLInputElement).checked = field.default;
        }
        break;

      case 'Button':
        input = document.createElement('button');
        input.className = 'btn btn-primary btn-sm';
        input.textContent = field.label;
        if (field.click) {
          input.onclick = field.click;
        }
        break;

      case 'Date':
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'date';
        input.className = 'form-control';
        if (field.default) {
          (input as HTMLInputElement).value = field.default;
        }
        break;

      case 'Time':
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'time';
        input.className = 'form-control';
        if (field.default) {
          (input as HTMLInputElement).value = field.default;
        }
        break;

      case 'Int':
      case 'Float':
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'number';
        input.className = 'form-control';
        if (field.fieldtype === 'Float') {
          (input as HTMLInputElement).step = '0.01';
        }
        if (field.default) {
          (input as HTMLInputElement).value = field.default;
        }
        break;

      case 'Color':
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'color';
        input.className = 'form-control';
        if (field.default) {
          (input as HTMLInputElement).value = field.default;
        }
        break;

      case 'Rating':
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'range';
        input.className = 'form-range';
        (input as HTMLInputElement).min = '0';
        (input as HTMLInputElement).max = '5';
        if (field.default) {
          (input as HTMLInputElement).value = field.default;
        }
        break;

      default:
        input = document.createElement('input');
        (input as HTMLInputElement).type = 'text';
        input.className = 'form-control';
        if (field.default) {
          (input as HTMLInputElement).value = field.default;
        }
    }

    input.id = `field-${field.fieldname}`;
    if (field.placeholder) {
      (input as HTMLInputElement).placeholder = field.placeholder;
    }
    if (field.onchange) {
      input.onchange = field.onchange;
    }
    if (field.read_only) {
      (input as HTMLInputElement).readOnly = true;
    }
    if (field.depends_on) {
      input.setAttribute('data-depends-on', field.depends_on);
    }

    if (field.description) {
      const description = document.createElement('small');
      description.className = 'form-text text-muted';
      description.textContent = field.description;
      fieldContainer.appendChild(description);
    }

    fieldContainer.appendChild(input);
    this.body?.appendChild(fieldContainer);

    return this;
  }

  public removeElementByProperty(propName: RemovableProps): this {
    const el = (this as any)[propName] as HTMLElement | null;
    if (el && this.modal && this.modal.contains(el)) {
      el.remove();
      (this as any)[propName] = null;
    }
    return this;
  }

  public removeElementById(elementId: string): this {
    if (!this.modal) return this;
    const el = this.modal.querySelector<HTMLElement>(`#${elementId}`);
    if (el) el.remove();
    return this;
  }

  public removeElementsByName(name: string): this {
    if (!this.modal) return this;
    const els = this.modal.querySelectorAll<HTMLElement>(`[name="${name}"]`);
    els.forEach(el => el.remove());
    return this;
  }

  /**
   * Sets up a MutationObserver to monitor changes in theme-related CSS variables.
   * Automatically updates modal styles (background, text, border, header, footer) when the theme changes.
   */
  load_theme_changer() {
    const observer = new MutationObserver(() => {
      const updated = getComputedStyle(document.documentElement);

      // Retrieves the values of the relevant CSS variables
      const bgColor = updated.getPropertyValue('--bg-color').trim();
      const textColor = updated.getPropertyValue('--text-color').trim();
      const headingBg = updated.getPropertyValue('--heading-bg').trim();
      const borderColor = updated.getPropertyValue('--border-color').trim(); // Main border color

      // *** Potential Adaptation: ***
      // If the header/footer use DIFFERENT border colors, define specific
      // CSS variables and retrieve them here:
      // const headerBorderColor = updated.getPropertyValue('--header-border-color').trim() || borderColor;
      // const footerBorderColor = updated.getPropertyValue('--footer-border-color').trim() || borderColor;
      // And use these variables below instead of 'borderColor' for the header/footer.

      const currentThemeKey = [
        bgColor,
        textColor,
        headingBg,
        borderColor,
        // If using specific colors, add them to the key as well:
        // headerBorderColor,
        // footerBorderColor,
      ].join('|');

      if (!this.modal) {
        console.warn("Theme changer: this.modal is not defined."); // Keep original string literal as requested
        return;
      }

      if (currentThemeKey !== this.themeKeyCacheLocal) {
        console.log("Theme changed, updating modal, header, and footer styles..."); // Keep original string literal as requested
        this.themeKeyCacheLocal = currentThemeKey;

        // --- Main Modal Styles ---
        if (bgColor) {
          this.modal.style.backgroundColor = bgColor;
        }
        if (textColor) {
          this.modal.style.color = textColor;
        }
        if (borderColor) {
          this.modal.style.border = `1px solid ${borderColor}`;
        } else {
          this.modal.style.border = 'none';
        }

        // --- Header Styles ---
        if (this.header) {
          // Background and Text Color
          this.header.style.backgroundColor = headingBg || bgColor; // Fallback to main bg
          if (textColor) {
            this.header.style.color = textColor;
          }

          // Header Bottom Border (Assuming this is the line you want)
          if (borderColor) {
            // Use 'borderColor' or 'headerBorderColor' if you defined a specific one
            this.header.style.borderBottom = `1px solid ${borderColor}`;
          } else {
            // Remove the border if the variable doesn't exist
            this.header.style.borderBottom = 'none';
          }
          // If you need other borders (top, left, right), add them here.
          // Ex: this.header.style.borderTop = ...
        }

        // --- Footer Styles ---
        if (this.footer) { // Adds the check and logic for the footer
          // Background and Text Color (Optional, but consistent)
          // Can use specific colors if necessary (e.g., --footer-bg-color)
          if (bgColor) {
            this.footer.style.backgroundColor = bgColor; // Or headingBg? Or a specific color?
          }
          if (textColor) {
            this.footer.style.color = textColor;
          }

          // Footer Top Border (Assuming this is the line you want)
          if (borderColor) {
            // Use 'borderColor' or 'footerBorderColor' if you defined a specific one
            this.footer.style.borderTop = `1px solid ${borderColor}`;
          } else {
            // Remove the border if the variable doesn't exist
            this.footer.style.borderTop = 'none';
          }
          // If you need other borders (bottom, left, right), add them here.
          // Ex: this.footer.style.borderBottom = ...
        }

        // --- Margin Styles (if necessary) ---
        // const marginValue = updated.getPropertyValue('--modal-margin').trim();
        // if (this.modal && marginValue) {
        //    this.modal.style.margin = marginValue;
        // }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'style'], // Observe changes to class and style attributes
      subtree: true, // Observe changes in descendants as well
    });

    // this.themeObserver = observer; // To disconnect later, if needed
  }
}

// Assign the class to the namespace
agt.ui.UltraDialog = UltraDialogImpl;

// Export for module usage (optional)
export { UltraDialogImpl as UltraDialog };