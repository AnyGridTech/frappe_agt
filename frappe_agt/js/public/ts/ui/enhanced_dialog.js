frappe.provide('agt.ui.enhanced_dialog');
frappe.ui.Dialog = class EnhancedDialog extends frappe.ui.Dialog {
    constructor(opts) {
        super(opts);
        this['$wrapper'].on('show.bs.modal', () => {
            const wrapperEl = this['$wrapper'][0];
            wrapperEl.style.left = '';
            wrapperEl.style.top = '';
            wrapperEl.style.margin = '';
        });
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        if (isMobile) {
            this['$wrapper'].addClass('modal-fullscreen');
            this['$wrapper'].css({
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
                margin: 0,
                borderRadius: 0
            });
            this['$wrapper'].find('.modal-content').css({
                height: '100%',
                borderRadius: 0
            });
        }
        this['$wrapper'].on('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });
        this['$wrapper'].on('click', (e) => {
            if ($(e.target).hasClass('modal')) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        });
        this.makeDraggable();
    }
    makeDraggable() {
        const wrapperEl = this['$wrapper'][0];
        const headerEl = this['$wrapper'].find('.modal-header')[0];
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
        headerEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.modal-header .close, .modal-header .btn-close, [data-dismiss="modal"]')) {
                return;
            }
            startDrag(e.clientX, e.clientY);
        });
        document.addEventListener('mousemove', (e) => doDrag(e.clientX, e.clientY));
        document.addEventListener('mouseup', () => { dragging = false; });
        headerEl.addEventListener('touchstart', (e) => {
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
        document.addEventListener('touchend', () => { dragging = false; });
    }
};
