frappe.provide('growatt.ui');
growatt.ui.UltraDialog = class GrowattUltraDialogImpl {
    modal = null;
    header = null;
    body = null;
    footer = null;
    backdrop = null;
    hide_btn = null;
    copy_btn = null;
    close_btn = null;
    themeKeyCacheLocal = '';
    body_prefix_id = 'ultra-modal-body';
    header_prefix_id = 'ultra-modal-header';
    footer_prefix_id = 'ultra-modal-footer';
    close_prefix_id = 'ultra-modal-close';
    copy_prefix_id = 'ultra-modal-copy';
    hide_prefix_id = 'ultra-modal-hide';
    body_id = '';
    header_id = '';
    footer_id = '';
    hide_id = '';
    copy_id = '';
    close_id = '';
    close_btn_default = __('Fechar');
    close_btn_waiting = `<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> ${__('Aguarde...')}`;
    hide_btn_default = __('Ocultar');
    hide_btn_show = __('Mostrar');
    id;
    title;
    message;
    size = 360;
    zOrder = 1050;
    can_copy = true;
    can_hide = true;
    can_close = true;
    can_drag = true;
    can_drag_mobile = true;
    auto_scroll = true;
    backdrop_blur = true;
    state = "default";
    constructor(props) {
        this.title = props.title;
        this.message = props.message;
        this.generate_random_id();
        this.default_initialization();
        this.parameters_initialization(props);
    }
    parameters_initialization(props) {
        this.visible(props.visible);
        this.show_hide_btn(props.can_hide ?? true);
        this.show_copy_btn(props.can_copy ?? true);
        this.show_close_btn(props.can_close ?? true);
        this.set_drag(props.can_drag ?? true);
        this.set_drag_mobile(props.can_drag_mobile ?? true);
        this.set_state(props.initial_state || 'default');
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
        this.id = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
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
        this.modal.setAttribute('aria-modal', 'true');
        this.modal.setAttribute('aria-labelledby', this.header_id);
        this.modal.setAttribute('aria-describedby', this.body_id);
        const rootStyles = getComputedStyle(document.documentElement);
        const backgroundColor = rootStyles.getPropertyValue('--bg-color').trim() || '#fff';
        const textColor = rootStyles.getPropertyValue('--text-color').trim() || '#212529';
        const borderColor = rootStyles.getPropertyValue('--border-color').trim() || '#ced4da';
        const headerBgColor = rootStyles.getPropertyValue('--heading-bg').trim() || rootStyles.getPropertyValue('--bg-color').trim() || '#f5f5f5';
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
    create_header() {
        if (this.header) {
            console.warn(`Header already exists. You can not create another header for modal id: ${this.id}`);
            return this.header;
        }
        this.header = document.createElement('div');
        this.header.id = this.header_id;
        this.header.setAttribute('name', 'header');
        this.header.style.padding = '10px';
        this.header.style.backgroundColor = '#f5f5f5';
        this.header.style.color = '#212529';
        this.header.style.borderBottom = `1px solid #ced4da`;
        this.header.style.fontWeight = 'bold';
        this.header.textContent = this.title;
        this.header.style.cursor = this.can_drag || this.can_drag_mobile ? 'move' : 'default';
        this.header.style.borderRadius = '6px 6px 0 0';
        if (this.modal) {
            this.modal.appendChild(this.header);
        }
        else {
            console.error(`Could not initialize the header. Modal is not yet defined, please instantiate the modal before trying to create the header. Modal ID: ${this.id}`);
        }
        return this.header;
    }
    create_body() {
        if (this.body) {
            return this.body;
        }
        this.body = document.createElement('div');
        this.body.id = this.body_id;
        this.body.setAttribute('name', 'body');
        this.body.style.padding = '10px';
        this.body.style.maxHeight = '300px';
        this.body.style.overflowY = 'auto';
        if (this.modal) {
            this.modal.appendChild(this.body);
        }
        else {
            console.error(`Could not initialize the body. Modal is not yet defined, please instantiate the modal before trying to create the body. Modal ID: ${this.id}`);
        }
        return this.body;
    }
    create_footer() {
        if (this.footer) {
            return this.footer;
        }
        this.footer = document.createElement('div');
        this.footer.id = this.footer_id;
        this.footer.setAttribute('name', 'footer');
        this.footer.style.padding = '10px';
        this.footer.style.display = 'flex';
        this.footer.style.justifyContent = 'flex-end';
        this.footer.style.gap = '10px';
        this.footer.style.borderTop = `1px solid #ced4da`;
        this.footer.style.borderRadius = '0 0 6px 6px';
        if (this.modal) {
            this.modal.appendChild(this.footer);
        }
        else {
            console.error(`Could not initialize the footer. Modal is not yet defined, please instantiate the modal before trying to create the footer. Modal ID: ${this.id}`);
        }
        return this.footer;
    }
    create_backdrop() {
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
            console.error(`UltraDialog body element not found for ID: ${this.body_id}`);
            return this;
        }
        const messageElement = document.createElement('div');
        messageElement.style.marginBottom = '8px';
        messageElement.innerHTML = message;
        bodyElement.appendChild(messageElement);
        const shouldScroll = options?.auto_scroll !== undefined ? options.auto_scroll : this.auto_scroll;
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
        this.hide_btn = document.createElement('button');
        this.hide_btn.id = this.hide_id;
        this.hide_btn.setAttribute('name', 'hide_btn');
        this.hide_btn.className = 'btn btn-sm btn-secondary';
        const isHidden = this.body && this.body.style.display === 'none';
        this.hide_btn.textContent = isHidden ? this.hide_btn_default : this.hide_btn_show;
        this.hide_btn.onclick = () => {
            if (this.hide_btn === null)
                return;
            if (!this.body)
                return;
            if (this.body.style.display === 'none') {
                this.body.style.display = '';
                this.hide_btn.textContent = this.hide_btn_default;
            }
            else {
                this.body.style.display = 'none';
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
        if (this.state === 'waiting') {
            this.close_btn.disabled = true;
            this.close_btn.innerHTML = this.close_btn_waiting;
        }
        else {
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
        const isTouchDevice = 'ontouchstart' in window;
        this.header.style.cursor = (canDragDesktop || canDragMobile) ? 'move' : 'default';
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
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        const handleTouchMove = (e) => {
            doDrag(e.touches[0].clientX, e.touches[0].clientY);
            e.preventDefault();
        };
        const handleTouchEnd = () => {
            endDrag();
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
        this.header.addEventListener('mousedown', (e) => {
            if (e.button !== 0)
                return;
            startDrag(e.clientX, e.clientY, canDragDesktop);
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            e.preventDefault();
        });
        if (isTouchDevice) {
            this.header.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1)
                    return;
                startDrag(e.touches[0].clientX, e.touches[0].clientY, canDragMobile);
                document.addEventListener('touchmove', handleTouchMove, { passive: false });
                document.addEventListener('touchend', handleTouchEnd);
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
        if (!backdropEl && (newState === 'waiting' || (this.modal && this.modal.style.display !== 'none'))) {
            this.create_backdrop();
        }
        if (this.backdrop) {
            if (newState === "waiting") {
                this.backdrop.style.display = 'block';
            }
            else if (oldState === "waiting" && newState === "default") {
                this.backdrop.style.display = 'none';
            }
        }
        this.update_close_btn_state();
        return this;
    }
    close() {
        if (this.state === 'waiting') {
            console.warn(`[UltraDialog ${this.id}] Tentativa de fechar o diálogo no estado '${this.state}'. Ação ignorada.`);
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
        const should_show = is_visible === undefined || is_visible === true;
        if (should_show) {
            this.show();
        }
        else {
            this.hide();
        }
        return this;
    }
    hide() {
        if (this.modal)
            this.modal.style.display = 'none';
        if (this.backdrop)
            this.backdrop.style.display = 'none';
        return this;
    }
    show() {
        if (!this.modal) {
            this.default_initialization();
        }
        else {
            this.modal.style.display = '';
        }
        if (this.backdrop) {
            this.backdrop.style.display = '';
        }
        return this;
    }
    add_field(field) {
        if (!this.body)
            return this;
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
        let input;
        switch (field.fieldtype) {
            case 'Text':
            case 'Small Text':
            case 'Long Text':
                input = document.createElement('textarea');
                input.value = field.default || '';
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
                        input.add(opt);
                    });
                }
                if (field.default) {
                    input.value = field.default;
                }
                break;
            case 'Check':
                input = document.createElement('input');
                input.type = 'checkbox';
                input.className = 'form-check-input';
                if (field.default) {
                    input.checked = field.default;
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
                input.type = 'date';
                input.className = 'form-control';
                if (field.default) {
                    input.value = field.default;
                }
                break;
            case 'Time':
                input = document.createElement('input');
                input.type = 'time';
                input.className = 'form-control';
                if (field.default) {
                    input.value = field.default;
                }
                break;
            case 'Int':
            case 'Float':
                input = document.createElement('input');
                input.type = 'number';
                input.className = 'form-control';
                if (field.fieldtype === 'Float') {
                    input.step = '0.01';
                }
                if (field.default) {
                    input.value = field.default;
                }
                break;
            case 'Color':
                input = document.createElement('input');
                input.type = 'color';
                input.className = 'form-control';
                if (field.default) {
                    input.value = field.default;
                }
                break;
            case 'Rating':
                input = document.createElement('input');
                input.type = 'range';
                input.className = 'form-range';
                input.min = '0';
                input.max = '5';
                if (field.default) {
                    input.value = field.default;
                }
                break;
            default:
                input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-control';
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
        els.forEach(el => el.remove());
        return this;
    }
    load_theme_changer() {
        const observer = new MutationObserver(() => {
            const updated = getComputedStyle(document.documentElement);
            const bgColor = updated.getPropertyValue('--bg-color').trim();
            const textColor = updated.getPropertyValue('--text-color').trim();
            const headingBg = updated.getPropertyValue('--heading-bg').trim();
            const borderColor = updated.getPropertyValue('--border-color').trim();
            const currentThemeKey = [
                bgColor,
                textColor,
                headingBg,
                borderColor,
            ].join('|');
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
                }
                else {
                    this.modal.style.border = 'none';
                }
                if (this.header) {
                    this.header.style.backgroundColor = headingBg || bgColor;
                    if (textColor) {
                        this.header.style.color = textColor;
                    }
                    if (borderColor) {
                        this.header.style.borderBottom = `1px solid ${borderColor}`;
                    }
                    else {
                        this.header.style.borderBottom = 'none';
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
                    }
                    else {
                        this.footer.style.borderTop = 'none';
                    }
                }
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'style'],
            subtree: true,
        });
    }
};
//# sourceMappingURL=UltraDialog.js.map