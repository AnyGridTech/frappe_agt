// Copyright (c) 2025, AnyGridTech and contributors
// For license information, please see license.txt
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
frappe.provide("agt.ui.ultra_dialog");
class UltraDialogImpl {
  /**
  * Creates a new UltraDialog with given properties.
  * @param props.title - Initial title text.
  * @param props.message - Initial body message.
  */
  constructor(props) {
    // --- Private DOM references ---
    __publicField(this, "modal", null);
    __publicField(this, "header", null);
    __publicField(this, "body", null);
    __publicField(this, "footer", null);
    __publicField(this, "backdrop", null);
    __publicField(this, "hide_btn", null);
    __publicField(this, "copy_btn", null);
    __publicField(this, "close_btn", null);
    // --- Internal state and identifiers ---
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
    // UI Element Content (Buttons/Icons)
    __publicField(this, "close_btn_default", __("Fechar"));
    __publicField(this, "close_btn_waiting", `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> ${__("Aguarde...")}`);
    __publicField(this, "hide_btn_default", __("Ocultar"));
    __publicField(this, "hide_btn_show", __("Mostrar"));
    // private closeIconDefault = frappe.utils.icon('close', 'sm');
    // private closeIconWaiting = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`;
    // --- Public properties ---
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
  /**
   * This function initializes the properties of the Dialog.
   * It will set the default values for the dialog.
   * It sets the initial visibility, drag, copy, hide and close properties.
   * @param props - Properties to initialize the dialog with.
   */
  parameters_initialization(props) {
    this.visible(props.visible);
    this.show_hide_btn(props.can_hide ?? true);
    this.show_copy_btn(props.can_copy ?? true);
    this.show_close_btn(props.can_close ?? true);
    this.set_drag(props.can_drag ?? true);
    this.set_drag_mobile(props.can_drag_mobile ?? true);
    this.set_state(props.initial_state || "default");
  }
  // --- Initializes the default settings ---
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
  /**
  * Generates unique element IDs for body, header, footer, log and close button.
  * @returns A unique ID for the modal dialog.
  */
  generate_random_id() {
    this.id = `${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
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
  /**
   * Creates the header element, applies title and drag cursor if enabled.
   */
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
  /**
   * Creates the body element and inserts the initial message log container.
   */
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
  /**
   * Creates the footer element, adding hide, copy and close buttons as configured.
   */
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
  /**
   * Creates a semi-transparent backdrop element for the modal dialog.
   * The backdrop covers the full viewport and sits just below the modal in z-order.
   */
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
  /**
  * Destroys the backdrop element if it exists.
  *
  * This method checks if the `backdrop` element has been created. 
  * If so, it removes it from the DOM and sets the reference to null, 
  * ensuring proper cleanup and avoiding memory leaks.
  */
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
    const shouldScroll = options?.auto_scroll !== void 0 ? options.auto_scroll : this.auto_scroll;
    if (shouldScroll) {
      setTimeout(() => {
        bodyElement.scrollTop = bodyElement.scrollHeight;
      }, 500);
    }
    return this;
  }
  set_title(title) {
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
  create_hide_btn() {
    if (!this.footer) return;
    this.hide_btn = document.createElement("button");
    this.hide_btn.id = this.hide_id;
    this.hide_btn.setAttribute("name", "hide_btn");
    this.hide_btn.className = "btn btn-sm btn-secondary";
    const isHidden = this.body && this.body.style.display === "none";
    this.hide_btn.textContent = isHidden ? this.hide_btn_default : this.hide_btn_show;
    this.hide_btn.onclick = () => {
      if (this.hide_btn === null) return;
      if (!this.body) return;
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
    if (!this.footer) return this;
    if (!show && this.hide_btn) this.removeElementById(this.hide_id);
    if (show && !this.hide_btn) this.create_hide_btn();
    return this;
  }
  /**
   * Creates a button to copy the content of the modal body to the clipboard.
   * @returns The created copy button element.
   */
  create_copy_btn() {
    if (!this.footer) return;
    this.copy_btn = document.createElement("button");
    this.copy_btn.id = this.copy_id;
    this.copy_btn.setAttribute("name", "copy_btn");
    this.copy_btn.className = "btn btn-sm btn-secondary";
    this.copy_btn.textContent = __("Copiar");
    this.copy_btn.onclick = () => {
      const logContainer = this.body;
      if (!logContainer || !logContainer.textContent?.trim()) {
        frappe.show_alert({ message: __("Nenhuma mensagem para copiar."), indicator: "orange" }, 5);
        return;
      }
      navigator.clipboard.writeText(logContainer.innerText || logContainer.textContent || "").then(() => frappe.show_alert({ message: __("Mensagens copiadas."), indicator: "green" }, 5)).catch((err) => {
        console.error("Erro ao copiar:", err);
        frappe.show_alert({ message: __("Falha ao copiar mensagens."), indicator: "red" }, 5);
      });
    };
    if (this.hide_btn && this.hide_btn.nextSibling) this.footer.insertBefore(this.copy_btn, this.hide_btn.nextSibling);
    else if (this.hide_btn) this.footer.appendChild(this.copy_btn);
    else this.footer.insertBefore(this.copy_btn, this.footer.firstChild);
    return this.copy_btn;
  }
  show_copy_btn(show) {
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
  create_close_btn() {
    if (!this.footer) return;
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
    if (!this.footer) return this;
    this.can_close = show;
    if (show && !this.close_btn) this.create_close_btn();
    if (show && this.close_btn) this.update_close_btn_state();
    if (!show && this.close_btn) this.removeElementById(this.close_id);
    return this;
  }
  /** Helper to update close button based on state */
  update_close_btn_state() {
    if (!this.close_btn) return;
    if (this.state === "waiting") {
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
      if (!allow) return;
      dragging = true;
      offsetX = clientX - this.modal.offsetLeft;
      offsetY = clientY - this.modal.offsetTop;
    };
    const doDrag = (clientX, clientY) => {
      if (!dragging) return;
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
      if (e.button !== 0) return;
      startDrag(e.clientX, e.clientY, canDragDesktop);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      e.preventDefault();
    });
    if (isTouchDevice) {
      this.header.addEventListener("touchstart", (e) => {
        if (e.touches.length !== 1) return;
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
    if (!this.can_drag) return this;
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
    if (!this.modal) return this;
    this.modal.remove();
    this.modal = null;
    this.destroy_backdrop();
    console.log(`[UltraDialog ${this.id}] Fechado e removido do DOM.`);
    return this;
  }
  set_z_order(z) {
    if (!this.modal) return this;
    this.zOrder = z;
    this.modal.style.zIndex = z.toString();
    return this;
  }
  set_size(size) {
    if (!this.modal) return this;
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
  /**
  * This function is used to hide the dialog.
  * It will hide the dialog from the DOM.
  * @returns Returns the current instance of the dialog.
  */
  hide() {
    if (this.modal) this.modal.style.display = "none";
    if (this.backdrop) this.backdrop.style.display = "none";
    return this;
  }
  /**
  * This function is used to show the dialog.
  * It will show the dialog in the DOM.
  * @returns Returns the current instance of the dialog.
  */
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
    if (!this.body) return this;
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
    this.body?.appendChild(fieldContainer);
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
    if (!this.modal) return this;
    const el = this.modal.querySelector(`#${elementId}`);
    if (el) el.remove();
    return this;
  }
  removeElementsByName(name) {
    if (!this.modal) return this;
    const els = this.modal.querySelectorAll(`[name="${name}"]`);
    els.forEach((el) => el.remove());
    return this;
  }
  /**
   * Sets up a MutationObserver to monitor changes in theme-related CSS variables.
   * Automatically updates modal styles (background, text, border, header, footer) when the theme changes.
   */
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
        // If using specific colors, add them to the key as well:
        // headerBorderColor,
        // footerBorderColor,
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
      // Observe changes to class and style attributes
      subtree: true
      // Observe changes in descendants as well
    });
  }
}
agt.ui.UltraDialog = UltraDialogImpl;
export {
  UltraDialogImpl as UltraDialog
};
