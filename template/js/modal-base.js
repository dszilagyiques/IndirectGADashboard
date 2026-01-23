// === MODAL BASE SYSTEM ===

const ModalManager = (function() {
    // Stack of currently open modals
    const modalStack = [];

    // Track scroll position for body lock
    let scrollPosition = 0;

    /**
     * Open a modal by ID
     * @param {string} modalId - The ID of the modal overlay element
     * @param {Object} options - Optional configuration
     * @param {Function} options.onOpen - Callback after modal opens
     * @param {Function} options.onClose - Callback after modal closes
     */
    function open(modalId, options = {}) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal not found: ${modalId}`);
            return;
        }

        // Lock body scroll on first modal
        if (modalStack.length === 0) {
            scrollPosition = window.pageYOffset;
            document.body.classList.add('modal-open');
            document.body.style.top = `-${scrollPosition}px`;
        }

        // Add to stack
        const stackIndex = modalStack.length + 1;
        modal.setAttribute('data-stack-index', stackIndex);
        modal.dataset.onClose = options.onClose ? 'has-callback' : '';

        // Store callback
        if (options.onClose) {
            modal._onCloseCallback = options.onClose;
        }

        modalStack.push(modalId);

        // Open the modal
        modal.classList.add('open');

        // Focus the modal container for keyboard navigation
        const container = modal.querySelector('.modal-container');
        if (container) {
            container.setAttribute('tabindex', '-1');
            container.focus();
        }

        // Call onOpen callback
        if (options.onOpen) {
            options.onOpen(modal);
        }
    }

    /**
     * Close the topmost modal or a specific modal
     * @param {string} [modalId] - Optional specific modal ID to close
     */
    function close(modalId) {
        if (modalStack.length === 0) return;

        // If specific modalId provided, close that one
        // Otherwise close the topmost modal
        const targetId = modalId || modalStack[modalStack.length - 1];
        const targetIndex = modalStack.indexOf(targetId);

        if (targetIndex === -1) return;

        const modal = document.getElementById(targetId);
        if (!modal) return;

        // Call onClose callback if exists
        if (modal._onCloseCallback) {
            modal._onCloseCallback(modal);
            delete modal._onCloseCallback;
        }

        // Close the modal
        modal.classList.remove('open');
        modal.removeAttribute('data-stack-index');

        // Remove from stack
        modalStack.splice(targetIndex, 1);

        // Restore body scroll if no more modals
        if (modalStack.length === 0) {
            document.body.classList.remove('modal-open');
            document.body.style.top = '';
            window.scrollTo(0, scrollPosition);
        } else {
            // Focus the next topmost modal
            const topModalId = modalStack[modalStack.length - 1];
            const topModal = document.getElementById(topModalId);
            if (topModal) {
                const container = topModal.querySelector('.modal-container');
                if (container) container.focus();
            }
        }
    }

    /**
     * Close all open modals
     */
    function closeAll() {
        while (modalStack.length > 0) {
            close();
        }
    }

    /**
     * Check if any modal is currently open
     * @returns {boolean}
     */
    function isOpen() {
        return modalStack.length > 0;
    }

    /**
     * Get the ID of the topmost modal
     * @returns {string|null}
     */
    function getTopModal() {
        return modalStack.length > 0 ? modalStack[modalStack.length - 1] : null;
    }

    /**
     * Initialize modal event listeners
     */
    function init() {
        // Close modal when clicking overlay background
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay') && e.target.classList.contains('open')) {
                close(e.target.id);
            }
        });

        // Close modal with close button
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                const modal = e.target.closest('.modal-overlay');
                if (modal) {
                    close(modal.id);
                }
            }
        });

        // Escape key closes topmost modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalStack.length > 0) {
                e.preventDefault();
                close();
            }
        });
    }

    return {
        open,
        close,
        closeAll,
        isOpen,
        getTopModal,
        init
    };
})();

// Helper function to create modal HTML
function createModalHTML(config) {
    const {
        id,
        size = 'lg',
        title = '',
        subtitle = '',
        bodyContent = '',
        footerContent = '',
        headerButtons = '',
        bodyClass = ''
    } = config;

    return `
        <div class="modal-overlay" id="${id}">
            <div class="modal-container modal-${size}">
                <div class="modal-header">
                    <div class="modal-header-left">
                        <h2 class="modal-title">${title}</h2>
                        ${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}
                    </div>
                    <div class="modal-header-right">
                        ${headerButtons}
                        <button class="modal-close" aria-label="Close">&#10005;</button>
                    </div>
                </div>
                <div class="modal-body ${bodyClass}">
                    ${bodyContent}
                </div>
                ${footerContent ? `<div class="modal-footer">${footerContent}</div>` : ''}
            </div>
        </div>
    `;
}
