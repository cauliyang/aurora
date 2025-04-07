/**
 * Display an alert message to the user
 * @param {string} message - The message to display
 * @param {string} type - The type of alert: 'info', 'success', 'warning', or 'error'
 * @param {number} timeout - Time in milliseconds before the alert disappears (0 for no auto-dismiss)
 */
function showAlert(message, type = "info", timeout = 0) {
  // Map alert types to Bootstrap classes and icons
  const typeMap = {
    info: { class: "alert-info", icon: "bi-info-circle" },
    success: { class: "alert-success", icon: "bi-check-circle" },
    warning: { class: "alert-warning", icon: "bi-exclamation-triangle" },
    error: { class: "alert-danger", icon: "bi-exclamation-circle" },
  };

  // Get the appropriate class and icon
  const alertClass = typeMap[type]?.class || "alert-info";
  const alertIcon = typeMap[type]?.icon || "bi-info-circle";

  // Create alert element
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
  alertDiv.style.bottom = "20px";
  alertDiv.style.left = "20px";
  alertDiv.style.zIndex = "9999";
  alertDiv.style.maxWidth = "400px";

  // Add content with icon
  alertDiv.innerHTML = `
        <i class="bi ${alertIcon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

  // Add to document
  document.body.appendChild(alertDiv);

  // Auto-dismiss if timeout is provided
  if (timeout > 0) {
    setTimeout(() => {
      alertDiv.classList.remove("show");
      setTimeout(() => alertDiv.remove(), 300); // Remove after fade animation
    }, timeout);
  }

  return alertDiv;
}

window.showAlert = showAlert;
