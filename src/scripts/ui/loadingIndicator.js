/**
 * Modern Loading Indicator System
 * Provides beautiful, non-blocking loading indicators
 */

class LoadingIndicator {
    constructor() {
        this.activeIndicators = new Map();
        this.initializeStyles();
    }

    /**
     * Show a loading indicator
     * @param {string} id - Unique identifier for this loading operation
     * @param {Object} options - Configuration options
     * @returns {string} The loading indicator ID
     */
    show(id, options = {}) {
        const {
            message = "Loading...",
            type = "spinner", // spinner, bar, dots
            container = null,
            overlay = false,
        } = options;

        // Remove existing indicator with same ID
        if (this.activeIndicators.has(id)) {
            this.hide(id);
        }

        const indicator = this.createIndicator(id, message, type, overlay);

        if (container) {
            const containerElement = typeof container === "string"
                ? document.querySelector(container)
                : container;
            if (containerElement) {
                containerElement.appendChild(indicator);
            } else {
                document.body.appendChild(indicator);
            }
        } else {
            document.body.appendChild(indicator);
        }

        this.activeIndicators.set(id, indicator);
        return id;
    }

    /**
     * Hide a loading indicator
     * @param {string} id - The loading indicator ID
     */
    hide(id) {
        const indicator = this.activeIndicators.get(id);
        if (indicator) {
            indicator.classList.add("loading-indicator-hide");
            setTimeout(() => {
                indicator.remove();
                this.activeIndicators.delete(id);
            }, 300);
        }
    }

    /**
     * Update loading indicator message
     * @param {string} id - The loading indicator ID
     * @param {string} message - New message
     */
    updateMessage(id, message) {
        const indicator = this.activeIndicators.get(id);
        if (indicator) {
            const messageElement = indicator.querySelector(".loading-message");
            if (messageElement) {
                messageElement.textContent = message;
            }
        }
    }

    /**
     * Update progress bar
     * @param {string} id - The loading indicator ID
     * @param {number} percent - Progress percentage (0-100)
     */
    updateProgress(id, percent) {
        const indicator = this.activeIndicators.get(id);
        if (indicator) {
            const progressBar = indicator.querySelector(".loading-progress-bar");
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
            }
        }
    }

    /**
     * Create loading indicator element
     */
    createIndicator(id, message, type, overlay) {
        const wrapper = document.createElement("div");
        wrapper.id = `loading-${id}`;
        wrapper.className = `loading-indicator ${overlay ? "loading-overlay" : ""}`;
        wrapper.setAttribute("role", "status");
        wrapper.setAttribute("aria-live", "polite");

        let content = "";
        switch (type) {
            case "bar":
                content = `
                    <div class="loading-content">
                        <div class="loading-message">${message}</div>
                        <div class="loading-progress">
                            <div class="loading-progress-bar"></div>
                        </div>
                    </div>
                `;
                break;
            case "dots":
                content = `
                    <div class="loading-content">
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <div class="loading-message">${message}</div>
                    </div>
                `;
                break;
            case "spinner":
            default:
                content = `
                    <div class="loading-content">
                        <div class="loading-spinner">
                            <svg viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                            </svg>
                        </div>
                        <div class="loading-message">${message}</div>
                    </div>
                `;
        }

        wrapper.innerHTML = content;
        return wrapper;
    }

    /**
     * Initialize loading indicator styles
     */
    initializeStyles() {
        if (document.getElementById("loadingIndicatorStyles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "loadingIndicatorStyles";
        style.textContent = `
            .loading-indicator {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 9999;
                background: var(--bg-primary, #fff);
                padding: 24px 32px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
                animation: loadingFadeIn 0.3s ease;
            }

            .loading-indicator.loading-overlay::before {
                content: "";
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: -1;
                backdrop-filter: blur(4px);
            }

            .loading-indicator-hide {
                animation: loadingFadeOut 0.3s ease forwards;
            }

            .loading-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
                min-width: 200px;
            }

            .loading-message {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary, #212529);
                text-align: center;
            }

            /* Spinner */
            .loading-spinner {
                width: 48px;
                height: 48px;
            }

            .loading-spinner svg {
                width: 100%;
                height: 100%;
                animation: loadingRotate 1s linear infinite;
            }

            .loading-spinner circle {
                stroke: #007bff;
                stroke-linecap: round;
                stroke-dasharray: 1, 150;
                stroke-dashoffset: 0;
                animation: loadingDash 1.5s ease-in-out infinite;
            }

            /* Dots */
            .loading-dots {
                display: flex;
                gap: 8px;
            }

            .loading-dots span {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: #007bff;
                animation: loadingBounce 1.4s infinite ease-in-out both;
            }

            .loading-dots span:nth-child(1) {
                animation-delay: -0.32s;
            }

            .loading-dots span:nth-child(2) {
                animation-delay: -0.16s;
            }

            /* Progress Bar */
            .loading-progress {
                width: 100%;
                height: 4px;
                background: #e9ecef;
                border-radius: 2px;
                overflow: hidden;
            }

            .loading-progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
                border-radius: 2px;
                transition: width 0.3s ease;
                width: 0%;
            }

            /* Animations */
            @keyframes loadingFadeIn {
                from {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
            }

            @keyframes loadingFadeOut {
                from {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                to {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.9);
                }
            }

            @keyframes loadingRotate {
                100% {
                    transform: rotate(360deg);
                }
            }

            @keyframes loadingDash {
                0% {
                    stroke-dasharray: 1, 150;
                    stroke-dashoffset: 0;
                }
                50% {
                    stroke-dasharray: 90, 150;
                    stroke-dashoffset: -35;
                }
                100% {
                    stroke-dasharray: 90, 150;
                    stroke-dashoffset: -124;
                }
            }

            @keyframes loadingBounce {
                0%, 80%, 100% {
                    transform: scale(0);
                }
                40% {
                    transform: scale(1);
                }
            }

            /* Dark theme */
            [data-theme="dark"] .loading-indicator {
                background: var(--bg-primary, #1a1a1a);
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            }

            /* Reduced motion */
            @media (prefers-reduced-motion: reduce) {
                .loading-indicator,
                .loading-spinner svg,
                .loading-dots span,
                .loading-progress-bar {
                    animation: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Create global instance and make available globally
const loadingIndicator = new LoadingIndicator();

if (typeof window !== "undefined") {
    window.loadingIndicator = loadingIndicator;
}
