class LoadingIndicator{constructor(){this.activeIndicators=new Map,this.initializeStyles()}show(a,e={}){let{message:i="Loading...",type:t="spinner",container:n=null,overlay:o=!1}=e;this.activeIndicators.has(a)&&this.hide(a);let d=this.createIndicator(a,i,t,o);if(n){let a="string"==typeof n?document.querySelector(n):n;a?a.appendChild(d):document.body.appendChild(d)}else document.body.appendChild(d);return this.activeIndicators.set(a,d),a}hide(a){let e=this.activeIndicators.get(a);e&&(e.classList.add("loading-indicator-hide"),setTimeout(()=>{e.remove(),this.activeIndicators.delete(a)},300))}updateMessage(a,e){let i=this.activeIndicators.get(a);if(i){let a=i.querySelector(".loading-message");a&&(a.textContent=e)}}updateProgress(a,e){let i=this.activeIndicators.get(a);if(i){let a=i.querySelector(".loading-progress-bar");a&&(a.style.width=`${Math.min(100,Math.max(0,e))}%`)}}createIndicator(a,e,i,t){let n=document.createElement("div");n.id=`loading-${a}`,n.className=`loading-indicator ${t?"loading-overlay":""}`,n.setAttribute("role","status"),n.setAttribute("aria-live","polite");let o="";switch(i){case"bar":o=`
                    <div class="loading-content">
                        <div class="loading-message">${e}</div>
                        <div class="loading-progress">
                            <div class="loading-progress-bar"></div>
                        </div>
                    </div>
                `;break;case"dots":o=`
                    <div class="loading-content">
                        <div class="loading-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                        <div class="loading-message">${e}</div>
                    </div>
                `;break;default:o=`
                    <div class="loading-content">
                        <div class="loading-spinner">
                            <svg viewBox="0 0 50 50">
                                <circle cx="25" cy="25" r="20" fill="none" stroke-width="4"></circle>
                            </svg>
                        </div>
                        <div class="loading-message">${e}</div>
                    </div>
                `}return n.innerHTML=o,n}initializeStyles(){if(document.getElementById("loadingIndicatorStyles"))return;let a=document.createElement("style");a.id="loadingIndicatorStyles",a.textContent=`
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
        `,document.head.appendChild(a)}}let loadingIndicator=new LoadingIndicator;"undefined"!=typeof window&&(window.loadingIndicator=loadingIndicator);
//# sourceMappingURL=app.1c3be9a8.js.map
