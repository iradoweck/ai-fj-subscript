/**
 * Application Entry Point — Zedecks IT
 * Gerencia a inicialização, interface e navegação estática
 */

import { isFirebaseConfigured } from "./services/firebase.js";
import { Icons } from "./utils/icons.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  renderBrandIcons();
  checkEnvironment();
  setupSmoothScrolling();
}

function renderBrandIcons() {
  const brandIconEl = document.getElementById("brand-icon-slot");
  if (brandIconEl) {
    brandIconEl.innerHTML = Icons.sparkles;
  }
}

function checkEnvironment() {
  const noticeContainer = document.getElementById("config-notice-container");
  if (!noticeContainer) return;

  if (!isFirebaseConfigured()) {
    noticeContainer.innerHTML = `
      <div class="alert alert-warning" role="status">
        ${Icons.alertTriangle}
        <div>
          <strong>Ambiente em Preparação (Modo Demonstração):</strong> 
          As credenciais do Firebase ainda estão no modelo de exemplo. A interface e os planos estão activos. Para activar autenticação e pagamentos em produção, configure o ficheiro <code>js/config/firebase-config.js</code>.
        </div>
      </div>
    `;
  }
}

function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#") {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });
}
