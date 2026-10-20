/**
 * Application Entry Point — MEGASON
 * Desenvolvido por Zedecks IT
 * Gerencia inicialização, catálogo de planos, interações da landing page e fluxo de checkout
 */

import { isFirebaseConfigured } from "./services/firebase.js";
import { Icons } from "./utils/icons.js";
import { 
  OFFICIAL_PLANS, 
  getPlanById, 
  setSelectedPlan, 
  getSelectedPlan 
} from "./services/plans.js";

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

function initApp() {
  renderBrandIcons();
  renderSVGIcons();
  checkEnvironment();
  setupSmoothScrolling();
  setupPlanSelection();
  setupCopyButtons();
  setupModalEvents();
  setupLoginModal();
  setupScrollTopProgress();
}

/**
 * Renderiza ícones da marca e cabeçalho
 */
function renderBrandIcons() {
  const brandIconEl = document.getElementById("brand-icon-slot");
  if (brandIconEl) {
    brandIconEl.innerHTML = Icons.sparkles;
  }
}

/**
 * Insere ícones SVG em slots específicos da interface
 */
function renderSVGIcons() {
  // Ícones de fechar modal
  document.querySelectorAll(".icon-close-slot").forEach(slot => {
    slot.innerHTML = Icons.close;
  });

  // Ícones de cópia nos botões
  document.querySelectorAll(".copy-icon-slot").forEach(slot => {
    slot.innerHTML = Icons.copy;
  });

  // Ícones de check nos itens de recursos dos planos
  document.querySelectorAll(".plan-feature-icon").forEach(slot => {
    slot.innerHTML = Icons.check;
  });

  // Ícones das seções de personas (Quem Usa)
  const studentSlot = document.getElementById("icon-slot-student");
  if (studentSlot) studentSlot.innerHTML = Icons.brain;

  const proSlot = document.getElementById("icon-slot-pro");
  if (proSlot) proSlot.innerHTML = Icons.bolt;

  const techSlot = document.getElementById("icon-slot-tech");
  if (techSlot) techSlot.innerHTML = Icons.code;

  // Ícone de voltar ao topo
  const scrollTopIconSlot = document.getElementById("scroll-top-icon-slot");
  if (scrollTopIconSlot) scrollTopIconSlot.innerHTML = Icons.arrowUp;

  // Ícone de sucesso no checkout
  const successSlot = document.getElementById("checkout-success-icon-slot");
  if (successSlot) successSlot.innerHTML = Icons.check;
}

/**
 * Alerta sobre estado de configuração do Firebase
 */
function checkEnvironment() {
  const noticeContainer = document.getElementById("config-notice-container");
  if (!noticeContainer) return;

  if (!isFirebaseConfigured()) {
    noticeContainer.innerHTML = `
      <div class="alert alert-warning" role="status">
        ${Icons.alertTriangle}
        <div>
          <strong>Ambiente em Preparação (Modo Demonstração):</strong> 
          A interface e os planos oficiais estão 100% disponíveis. Para ativar autenticação e persistência remota no Firestore, configure o arquivo <code>js/config/firebase-config.js</code>.
        </div>
      </div>
    `;
  }
}

/**
 * Navegação suave para âncoras na mesma página com respeito ao topo fixo
 */
function setupSmoothScrolling() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      const targetId = this.getAttribute("href");
      if (targetId && targetId !== "#" && !targetId.includes("login") && !targetId.includes("checkout")) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          e.preventDefault();
          targetElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    });
  });
}

/**
 * Configura os botões de seleção de plano
 */
function setupPlanSelection() {
  const planButtons = document.querySelectorAll("[data-plan]");
  planButtons.forEach(button => {
    button.addEventListener("click", (e) => {
      e.preventDefault();
      const planId = button.getAttribute("data-plan");
      const plan = getPlanById(planId);

      if (plan) {
        // Preserva o plano canónico em sessionStorage
        setSelectedPlan(plan.id);
        openCheckoutModal(plan);
      }
    });
  });
}

/**
 * Abre o modal de checkout com os dados do plano canónico e reseta para o passo 1
 * @param {object} plan 
 */
function openCheckoutModal(plan) {
  const modal = document.getElementById("checkout-modal");
  if (!modal) return;

  const nameEl = document.getElementById("modal-plan-name");
  const durationEl = document.getElementById("modal-plan-duration");
  const priceEl = document.getElementById("modal-plan-price");
  const descEl = document.getElementById("modal-plan-desc");

  if (nameEl) nameEl.textContent = `Plano ${plan.name}`;
  if (durationEl) durationEl.textContent = plan.savings ? `${plan.durationLabel} • ${plan.savings}` : plan.durationLabel;
  if (priceEl) priceEl.textContent = Number(plan.price).toLocaleString("pt-MZ");
  if (descEl) descEl.textContent = `Acesso completo por ${plan.durationDays} dias aos modelos avançados (GPT-6 Astra).`;

  // Reseta visualização para o Passo 1
  setCheckoutStep(1);

  modal.style.display = "flex";
  document.body.style.overflow = "hidden";

  // Foco no botão de prosseguir
  const proceedBtn = document.getElementById("btn-modal-checkout-proceed");
  if (proceedBtn) proceedBtn.focus();
}

/**
 * Controla os passos internos do modal de checkout
 * @param {number} step (1: Pagamento, 2: Comprovativo, 3: Sucesso)
 */
function setCheckoutStep(step) {
  const step1 = document.getElementById("checkout-step-1");
  const step2 = document.getElementById("checkout-step-2");
  const step3 = document.getElementById("checkout-step-3");
  const stepIndicator = document.getElementById("modal-step-indicator");

  if (step1) step1.style.display = step === 1 ? "block" : "none";
  if (step2) step2.style.display = step === 2 ? "block" : "none";
  if (step3) step3.style.display = step === 3 ? "block" : "none";

  if (stepIndicator) {
    if (step === 1) stepIndicator.textContent = "Passo 1 de 2: Pagamento do Plano";
    else if (step === 2) stepIndicator.textContent = "Passo 2 de 2: Envio do Comprovativo";
    else if (step === 3) stepIndicator.textContent = "Concluído • Ativação em Curso";
  }
}

/**
 * Fecha o modal de checkout
 */
function closeCheckoutModal() {
  const modal = document.getElementById("checkout-modal");
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "";
    // Reseta form do comprovativo se existir
    const proofForm = document.getElementById("checkout-proof-form");
    if (proofForm) proofForm.reset();
  }
}

/**
 * Eventos do modal de checkout guiado (Passos 1, 2 e 3)
 */
function setupModalEvents() {
  const closeBtn = document.getElementById("btn-close-checkout-modal");
  const cancelBtn = document.getElementById("btn-cancel-checkout");
  const modal = document.getElementById("checkout-modal");
  const proceedBtn = document.getElementById("btn-modal-checkout-proceed");
  const backToStep1Btn = document.getElementById("btn-back-to-step1");
  const proofForm = document.getElementById("checkout-proof-form");
  const finishBtn = document.getElementById("btn-finish-checkout");

  if (closeBtn) closeBtn.addEventListener("click", closeCheckoutModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeCheckoutModal);

  // Fechar ao clicar fora do card
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        closeCheckoutModal();
      }
    });
  }

  // Fechar com a tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.style.display === "flex") {
      closeCheckoutModal();
    }
  });

  // Passo 1 -> Passo 2 (Avançar para envio do comprovativo)
  if (proceedBtn) {
    proceedBtn.addEventListener("click", () => {
      setCheckoutStep(2);
      const nameInput = document.getElementById("proof-name");
      if (nameInput) nameInput.focus();
    });
  }

  // Passo 2 -> Passo 1 (Voltar ao pagamento)
  if (backToStep1Btn) {
    backToStep1Btn.addEventListener("click", () => {
      setCheckoutStep(1);
    });
  }

  // Submissão do Comprovativo (Passo 2 -> Passo 3 Sucesso)
  if (proofForm) {
    proofForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = document.getElementById("proof-name")?.value.trim();
      const whatsapp = document.getElementById("proof-whatsapp")?.value.trim();
      const proofText = document.getElementById("proof-text")?.value.trim();
      const plan = getSelectedPlan();

      if (!name || !whatsapp || !proofText) {
        alert("Por favor, preencha todos os campos obrigatórios com o texto do comprovativo.");
        return;
      }

      // Salva estado da subscrição solicitada para persistência na Fase 4
      const pendingSubscription = {
        planId: plan ? plan.id : "plan-30d",
        planName: plan ? plan.name : "30 Dias",
        customerName: name,
        whatsapp,
        proofText,
        submittedAt: new Date().toISOString(),
        status: "pending"
      };

      try {
        sessionStorage.setItem("megason_pending_sub", JSON.stringify(pendingSubscription));
      } catch (err) {
        console.warn("Armazenamento local restrito:", err);
      }

      // Exibe tela amigável de sucesso
      setCheckoutStep(3);
    });
  }

  // Finalizar e fechar no Passo 3
  if (finishBtn) {
    finishBtn.addEventListener("click", () => {
      closeCheckoutModal();
    });
  }
}

/**
 * Gerencia o modal de login amigável da MEGASON
 */
function setupLoginModal() {
  const loginModal = document.getElementById("login-modal");
  const openLoginBtn = document.getElementById("btn-header-login");
  const closeLoginBtn = document.getElementById("btn-close-login-modal");
  const loginToPlansBtn = document.getElementById("btn-login-to-plans");
  const loginForm = document.getElementById("login-form");

  function openLogin() {
    if (loginModal) {
      loginModal.style.display = "flex";
      document.body.style.overflow = "hidden";
      const identifierInput = document.getElementById("login-identifier");
      if (identifierInput) identifierInput.focus();
    }
  }

  function closeLogin() {
    if (loginModal) {
      loginModal.style.display = "none";
      document.body.style.overflow = "";
    }
  }

  if (openLoginBtn) {
    openLoginBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openLogin();
    });
  }

  if (closeLoginBtn) {
    closeLoginBtn.addEventListener("click", closeLogin);
  }

  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) closeLogin();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && loginModal && loginModal.style.display === "flex") {
      closeLogin();
    }
  });

  if (loginToPlansBtn) {
    loginToPlansBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeLogin();
      const targetElement = document.querySelector("#planos");
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      alert("A autenticação direta será vinculada com Firebase na Fase 4. Se ainda não possui acesso, escolha um plano para ativar a sua pasta!");
      closeLogin();
    });
  }
}

/**
 * Configura botões de cópia rápida para números de pagamento
 */
function setupCopyButtons() {
  const copyButtons = document.querySelectorAll(".btn-copy");
  copyButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const textToCopy = button.getAttribute("data-copy");
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalContent = button.innerHTML;
        button.innerHTML = `${Icons.check} Copiado!`;
        button.classList.add("btn-primary");
        button.classList.remove("btn-secondary");

        setTimeout(() => {
          button.innerHTML = originalContent;
          button.classList.remove("btn-primary");
          button.classList.add("btn-secondary");
          renderSVGIcons();
        }, 2000);
      } catch (err) {
        console.warn("Falha ao copiar para a área de transferência:", err);
      }
    });
  });
}

/**
 * Gerencia o botão circular flutuante de Voltar ao Topo com anel de progresso
 */
function setupScrollTopProgress() {
  const scrollTopBtn = document.getElementById("btn-back-to-top");
  const progressCircle = document.getElementById("scroll-progress-circle");
  if (!scrollTopBtn || !progressCircle) return;

  const circumference = 2 * Math.PI * 22; // ~138.23

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    // Visibilidade do botão
    if (scrollTop > 200) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }

    // Cálculo do preenchimento da borda (0 a 100%)
    if (docHeight > 0) {
      const scrollPercentage = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      const strokeOffset = circumference - (scrollPercentage * circumference);
      progressCircle.style.strokeDashoffset = strokeOffset;
    }
  }

  // Listener de rolagem com requestAnimationFrame para performance ultra suave
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Ação de voltar ao topo
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // Executa uma vez no carregamento
  updateProgress();
}

/**
 * Configura botões de cópia rápida para números de pagamento
 */
function setupCopyButtons() {
  const copyButtons = document.querySelectorAll(".btn-copy");
  copyButtons.forEach(button => {
    button.addEventListener("click", async () => {
      const textToCopy = button.getAttribute("data-copy");
      if (!textToCopy) return;

      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalContent = button.innerHTML;
        button.innerHTML = `${Icons.check} Copiado!`;
        button.classList.add("btn-primary");
        button.classList.remove("btn-secondary");

        setTimeout(() => {
          button.innerHTML = originalContent;
          button.classList.remove("btn-primary");
          button.classList.add("btn-secondary");
          renderSVGIcons();
        }, 2000);
      } catch (err) {
        console.warn("Falha ao copiar para a área de transferência:", err);
      }
    });
  });
}

/**
 * Gerencia o botão circular flutuante de Voltar ao Topo com anel de progresso
 */
function setupScrollTopProgress() {
  const scrollTopBtn = document.getElementById("btn-back-to-top");
  const progressCircle = document.getElementById("scroll-progress-circle");
  if (!scrollTopBtn || !progressCircle) return;

  const circumference = 2 * Math.PI * 22; // ~138.23

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    
    // Visibilidade do botão
    if (scrollTop > 200) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }

    // Cálculo do preenchimento da borda (0 a 100%)
    if (docHeight > 0) {
      const scrollPercentage = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      const strokeOffset = circumference - (scrollPercentage * circumference);
      progressCircle.style.strokeDashoffset = strokeOffset;
    }
  }

  // Listener de rolagem com requestAnimationFrame para performance ultra suave
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateProgress();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Ação de voltar ao topo
  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // Executa uma vez no carregamento
  updateProgress();
}
