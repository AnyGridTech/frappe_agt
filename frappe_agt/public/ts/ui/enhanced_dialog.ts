import type { DialogConfiguration } from "@anygridtech/frappe-types/client/frappe/ui/Dialog";

frappe.provide('agt.ui.enhanced_dialog');
frappe.ui.Dialog = class EnhancedDialog extends frappe.ui.Dialog {
  constructor(opts: DialogConfiguration) {
    super(opts);

    // Reset position for each new modal
    this['$wrapper'].on('show.bs.modal', () => {
      const wrapperEl = this['$wrapper'][0] as HTMLElement;
      wrapperEl.style.left = '';
      wrapperEl.style.top = '';
      // Also clear any margin offsets
      wrapperEl.style.margin = '';
    });

    // Detect if the device is mobile
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // Always make dialog fullscreen on mobile devices
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

    // Prevent closing with ESC or external click
    this['$wrapper'].on('keydown', (e: JQuery.KeyDownEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
    this['$wrapper'].on('click', (e: JQuery.ClickEvent) => {
      if ($(e.target).hasClass('modal')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    });
    
    this.makeDraggable();
  }

  private makeDraggable(): void {
    const wrapperEl = this['$wrapper'][0] as HTMLElement;
    const headerEl = this['$wrapper'].find('.modal-header')[0] as HTMLElement;
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    // Start drag (mouse or touch)
    const startDrag = (clientX: number, clientY: number) => {
      dragging = true;
      offsetX = clientX - wrapperEl.offsetLeft;
      offsetY = clientY - wrapperEl.offsetTop;
    };

    // Move element
    const doDrag = (clientX: number, clientY: number) => {
      if (dragging) {
        wrapperEl.style.left = `${clientX - offsetX}px`;
        wrapperEl.style.top = `${clientY - offsetY}px`;
      }
    };

    // Mouse events
    headerEl.addEventListener('mousedown', (e: MouseEvent) => {
      // Don't start dragging when clicking the close button
      if ((e.target as HTMLElement).closest('.modal-header .close, .modal-header .btn-close, [data-dismiss="modal"]')) {
        return;
      }
      startDrag(e.clientX, e.clientY);
    });
    document.addEventListener('mousemove', (e: MouseEvent) => doDrag(e.clientX, e.clientY));
    document.addEventListener('mouseup', () => { dragging = false; });

    // Touch events
    headerEl.addEventListener('touchstart', (e: TouchEvent) => {
      // Ignore touches on close elements
      const target = e.target as HTMLElement;
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