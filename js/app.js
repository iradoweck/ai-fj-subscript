/**
 * Application Entry Point — MEGASON
 * Desenvolvido por Zedecks IT
 * Gerencia inicialização, catálogo de planos, interações da landing page e fluxo de checkout
 */

import { isFirebaseConfigured } from "./config/firebase-config.js";
import { Icons } from "./utils/icons.js";
import { 
  OFFICIAL_PLANS, 
  getPlanById, 
  setSelectedPlan, 
  getSelectedPlan 
} from "./services/plans.js";
import {
  registerUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  resetPassword,
  subscribeToAuthChanges,
  normalizeMozambicanPhone
} from "./services/auth.js";

// Estado global de autenticação em memória
let currentAuthState = {
  user: null,
  profile: null,
  isAdmin: false
};

// Inicialização segura que previne perda do evento DOMContentLoaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

function initApp() {
  renderBrandIcons();
  renderSVGIcons();
  checkEnvironment();
  setupSmoothScrolling();
  setupPlanSelection();
  setupCopyButtons();
  setupModalEvents();
  setupAuthModal();
  setupAuthStateListener();
  setupMobileMenu();
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
 * @param {number} step (1: Pagamento, 2: Comprovativo e Conta, 3: Sucesso)
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
    else if (step === 2) stepIndicator.textContent = currentAuthState.user ? "Passo 2 de 2: Envio do Comprovativo" : "Passo 2 de 2: Criar Conta & Enviar Comprovativo";
    else if (step === 3) stepIndicator.textContent = "Concluído • Ativação em Curso";
  }

  // Ajusta formulário do Passo 2 conforme estado de autenticação
  if (step === 2) {
    const loggedBanner = document.getElementById("checkout-user-logged-banner");
    const loggedName = document.getElementById("checkout-logged-user-name");
    const loggedEmail = document.getElementById("checkout-logged-user-email");
    const guestFields = document.getElementById("checkout-guest-fields");
    const alreadyAccountWrap = document.getElementById("checkout-already-account-wrap");
    const introText = document.getElementById("checkout-step-intro-text");

    const emailInput = document.getElementById("proof-email");
    const passInput = document.getElementById("proof-password");
    const provSelect = document.getElementById("proof-province");
    const humanCheck = document.getElementById("proof-is-human");
    const nameInput = document.getElementById("proof-name");
    const whatsappInput = document.getElementById("proof-whatsapp");

    if (currentAuthState.user) {
      // Cliente já autenticado
      if (loggedBanner) loggedBanner.style.display = "block";
      if (loggedName) loggedName.textContent = currentAuthState.profile?.fullName || "Cliente";
      if (loggedEmail) loggedEmail.textContent = currentAuthState.user.email || "";
      if (guestFields) guestFields.style.display = "none";
      if (alreadyAccountWrap) alreadyAccountWrap.style.display = "none";
      if (introText) introText.textContent = "Confirme os seus dados e cole o comprovativo SMS para associarmos o acesso à sua conta.";

      if (emailInput) emailInput.required = false;
      if (passInput) passInput.required = false;
      if (provSelect) provSelect.required = false;
      if (humanCheck) humanCheck.required = false;

      if (nameInput && !nameInput.value) nameInput.value = currentAuthState.profile?.fullName || "";
      if (whatsappInput && !whatsappInput.value) whatsappInput.value = currentAuthState.profile?.whatsappNumber || "";
    } else {
      // Visitante não autenticado (Criação de Conta Embutida no Checkout)
      if (loggedBanner) loggedBanner.style.display = "none";
      if (guestFields) guestFields.style.display = "block";
      if (alreadyAccountWrap) alreadyAccountWrap.style.display = "block";
      if (introText) introText.textContent = "Preencha os seus dados para criarmos a sua conta na MEGASON e ativarmos a sua pasta exclusiva no ChatGPT Plus.";

      if (emailInput) emailInput.required = true;
      if (passInput) passInput.required = true;
      if (provSelect) provSelect.required = true;
      if (humanCheck) humanCheck.required = true;
    }
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

  // Atalho do Checkout para abrir Login se já possuir conta
  const checkoutLoginLink = document.getElementById("link-checkout-login");
  if (checkoutLoginLink) {
    checkoutLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      closeCheckoutModal();
      if (window.__openAuthModal) window.__openAuthModal("login");
    });
  }

  // Submissão do Comprovativo (com Criação de Conta Automática se deslogado)
  if (proofForm) {
    proofForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const submitBtn = document.getElementById("btn-submit-proof");
      const name = document.getElementById("proof-name")?.value.trim();
      const whatsapp = document.getElementById("proof-whatsapp")?.value.trim();
      const proofText = document.getElementById("proof-text")?.value.trim();
      const plan = getSelectedPlan();

      if (!name || !whatsapp || !proofText) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
      }

      let userId = currentAuthState.user ? currentAuthState.user.uid : null;
      let userEmail = currentAuthState.user ? currentAuthState.user.email : null;

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "A processar subscrição...";
        }

        // Se o cliente NÃO está autenticado, cria a conta no Firebase Auth agora mesmo
        if (!currentAuthState.user) {
          const email = document.getElementById("proof-email")?.value.trim();
          const password = document.getElementById("proof-password")?.value;
          const province = document.getElementById("proof-province")?.value;
          const isHuman = document.getElementById("proof-is-human")?.checked;

          if (!email || !password || !province) {
            alert("Para criar a sua conta e ativar o acesso, preencha o email, senha e selecione a sua província.");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Confirmar e Ativar Meu Acesso";
            }
            return;
          }

          if (!isHuman) {
            alert("Por favor, marque a caixa confirmando que é humano.");
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = "Confirmar e Ativar Meu Acesso";
            }
            return;
          }

          // Cria conta com perfil moçambicano
          const newProfile = await registerUser({
            fullName: name,
            email,
            password,
            whatsappNumber: whatsapp,
            province,
            isHumanVerified: true
          });

          userId = newProfile.uid;
          userEmail = newProfile.email;
        }

        // Prepara os dados da subscrição pendente vinculados ao UID do utilizador
        const pendingSubscription = {
          userId,
          customerName: name,
          customerEmail: userEmail,
          whatsapp,
          planId: plan ? plan.id : "plan-30d",
          planName: plan ? plan.name : "30 Dias",
          price: plan ? plan.price : 300,
          currency: "MZN",
          durationDays: plan ? plan.durationDays : 30,
          proofText,
          status: "pending",
          submittedAt: new Date().toISOString()
        };

        try {
          sessionStorage.setItem("megason_pending_sub", JSON.stringify(pendingSubscription));
        } catch (err) {
          console.warn("Armazenamento local restrito:", err);
        }

        // Avança para o Passo 3 (Confirmação de Sucesso)
        setCheckoutStep(3);

      } catch (err) {
        alert(err.message || "Ocorreu um erro ao processar os seus dados. Verifique as informações inseridas.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Confirmar e Ativar Meu Acesso";
        }
      }
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
 * Gerencia o modal unificado de autenticação (Login, Registo Moçambicano e Recuperação de Senha)
 */
function setupAuthModal() {
  const authModal = document.getElementById("auth-modal");
  const closeBtn = document.getElementById("btn-close-auth-modal");
  const alertContainer = document.getElementById("auth-alert");

  const viewLogin = document.getElementById("auth-view-login");
  const viewRegister = document.getElementById("auth-view-register");
  const viewReset = document.getElementById("auth-view-reset");

  const modalTitle = document.getElementById("modal-auth-title");
  const modalSubtitle = document.getElementById("modal-auth-subtitle");

  const formLogin = document.getElementById("form-login");
  const formRegister = document.getElementById("form-register");
  const formReset = document.getElementById("form-reset-password");
  const btnGoogle = document.getElementById("btn-google-login");

  const btnToggleToRegister = document.getElementById("btn-toggle-to-register");
  const btnToggleToLogin = document.getElementById("btn-toggle-to-login");
  const linkToReset = document.getElementById("link-to-reset");
  const btnResetBackToLogin = document.getElementById("btn-reset-back-to-login");

  // Alterna a visualização ativa dentro do modal
  function showView(view) {
    clearAlert();
    if (viewLogin) viewLogin.style.display = view === "login" ? "block" : "none";
    if (viewRegister) viewRegister.style.display = view === "register" ? "block" : "none";
    if (viewReset) viewReset.style.display = view === "reset" ? "block" : "none";

    if (view === "login") {
      if (modalTitle) modalTitle.textContent = "Acesse a sua Conta MEGASON";
      if (modalSubtitle) modalSubtitle.textContent = "Acesso ao ChatGPT Plus";
      document.getElementById("login-email")?.focus();
    } else if (view === "register") {
      if (modalTitle) modalTitle.textContent = "Criar Conta • Perfil Moçambique";
      if (modalSubtitle) modalSubtitle.textContent = "Acesso com pasta exclusiva no ChatGPT Plus";
      document.getElementById("reg-fullname")?.focus();
    } else if (view === "reset") {
      if (modalTitle) modalTitle.textContent = "Recuperar Senha de Acesso";
      if (modalSubtitle) modalSubtitle.textContent = "Receba um link de redefinição no seu email";
      document.getElementById("reset-email")?.focus();
    }
  }

  function showAlert(message, type = "danger") {
    if (!alertContainer) return;
    alertContainer.innerHTML = `
      <div class="alert alert-${type}" style="margin-bottom: 0;">
        ${type === "danger" ? Icons.alertTriangle : Icons.check}
        <div>${message}</div>
      </div>
    `;
    alertContainer.style.display = "block";
  }

  function clearAlert() {
    if (alertContainer) {
      alertContainer.innerHTML = "";
      alertContainer.style.display = "none";
    }
  }

  function openAuth(view = "login") {
    if (authModal) {
      showView(view);
      authModal.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  function closeAuth() {
    if (authModal) {
      authModal.style.display = "none";
      document.body.style.overflow = "";
      clearAlert();
    }
  }

  // Eventos de fechar
  if (closeBtn) closeBtn.addEventListener("click", closeAuth);
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuth();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && authModal && authModal.style.display === "flex") {
      closeAuth();
    }
  });

  // Alternâncias de view
  if (btnToggleToRegister) btnToggleToRegister.addEventListener("click", () => showView("register"));
  if (btnToggleToLogin) btnToggleToLogin.addEventListener("click", () => showView("login"));
  if (linkToReset) linkToReset.addEventListener("click", (e) => { e.preventDefault(); showView("reset"); });
  if (btnResetBackToLogin) btnResetBackToLogin.addEventListener("click", () => showView("login"));

  // Submissão do Login
  if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();
      const submitBtn = document.getElementById("btn-submit-login");
      const email = document.getElementById("login-email")?.value.trim();
      const password = document.getElementById("login-password")?.value;

      if (!email || !password) {
        showAlert("Preencha o email e a senha.");
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "A autenticar...";
        }
        await loginUser(email, password);
        closeAuth();
        formLogin.reset();
      } catch (err) {
        showAlert(err.message || "Credenciais incorretas ou utilizador não encontrado.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Entrar na Minha Conta";
        }
      }
    });
  }

  // Submissão do Registo (com campos moçambicanos e anti-bot)
  if (formRegister) {
    formRegister.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();
      const submitBtn = document.getElementById("btn-submit-register");

      const fullName = document.getElementById("reg-fullname")?.value.trim();
      const email = document.getElementById("reg-email")?.value.trim();
      const password = document.getElementById("reg-password")?.value;
      const whatsappNumber = document.getElementById("reg-whatsapp")?.value.trim();
      const province = document.getElementById("reg-province")?.value;
      const district = document.getElementById("reg-district")?.value.trim();
      const neighborhood = document.getElementById("reg-neighborhood")?.value.trim();
      const username = document.getElementById("reg-username")?.value.trim();
      const isHumanVerified = document.getElementById("reg-is-human")?.checked;

      if (!isHumanVerified) {
        showAlert("Por favor, marque a caixa confirmando que é humano.");
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "A criar conta...";
        }
        await registerUser({
          fullName,
          email,
          password,
          whatsappNumber,
          province,
          district,
          neighborhood,
          username,
          isHumanVerified
        });
        closeAuth();
        formRegister.reset();
        alert("Conta criada com sucesso na MEGASON! O seu perfil moçambicano foi registrado.");
      } catch (err) {
        showAlert(err.message || "Erro ao criar conta. Verifique os dados inseridos.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Criar Minha Conta";
        }
      }
    });
  }

  // Submissão do Reset de Senha
  if (formReset) {
    formReset.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAlert();
      const submitBtn = document.getElementById("btn-submit-reset");
      const email = document.getElementById("reset-email")?.value.trim();

      if (!email) {
        showAlert("Insira o seu email de cadastro.");
        return;
      }

      try {
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = "A enviar link...";
        }
        await resetPassword(email);
        showAlert("Link de redefinição enviado para o seu email! Verifique a sua caixa de entrada.", "success");
        formReset.reset();
      } catch (err) {
        showAlert(err.message || "Erro ao solicitar redefinição de senha.");
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Enviar Link de Recuperação";
        }
      }
    });
  }

  // Login com Google
  if (btnGoogle) {
    btnGoogle.addEventListener("click", async () => {
      clearAlert();
      try {
        btnGoogle.disabled = true;
        await loginWithGoogle();
        closeAuth();
      } catch (err) {
        showAlert(err.message || "Falha na autenticação com o Google.");
      } finally {
        btnGoogle.disabled = false;
      }
    });
  }

  // Exporta função para disparar abertura do modal
  window.__openAuthModal = openAuth;
}

/**
 * Observa alterações de sessão e atualiza a barra superior em tempo real
 */
function setupAuthStateListener() {
  subscribeToAuthChanges((state) => {
    currentAuthState = state;
    updateHeaderAuth(state);

    // Se o cliente estiver autenticado, pré-preenche o formulário de comprovativo
    if (state.user && state.profile) {
      const nameInput = document.getElementById("proof-name");
      const whatsappInput = document.getElementById("proof-whatsapp");
      if (nameInput && !nameInput.value) nameInput.value = state.profile.fullName || "";
      if (whatsappInput && !whatsappInput.value) whatsappInput.value = state.profile.whatsappNumber || "";
    }
  });
}

/**
 * Atualiza os botões e saudações do cabeçalho
 * @param {object} state ({ user, profile, isAdmin })
 */
function updateHeaderAuth(state) {
  const headerActions = document.getElementById("header-actions");
  if (!headerActions) return;

  if (!state.user) {
    // Visitante desconectado
    headerActions.innerHTML = `
      <button type="button" class="btn btn-secondary btn-sm" id="btn-header-login">
        Entrar
      </button>
      <a href="#planos" class="btn btn-primary btn-sm">
        Garantir Acesso
      </a>
    `;

    const loginBtn = document.getElementById("btn-header-login");
    if (loginBtn) {
      loginBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.__openAuthModal) window.__openAuthModal("login");
      });
    }
    return;
  }

  // Utilizador Autenticado
  const firstName = state.profile?.fullName ? state.profile.fullName.split(" ")[0] : "Cliente";

  if (state.isAdmin) {
    headerActions.innerHTML = `
      <span class="badge badge-active" style="padding: 4px 10px; font-size: 11px;">Administrador</span>
      <a href="admin.html" class="btn btn-secondary btn-sm" id="btn-header-admin">
        Painel Admin
      </a>
      <button type="button" class="btn btn-outline btn-sm" id="btn-header-logout" title="Terminar Sessão">
        Sair
      </button>
    `;
  } else {
    headerActions.innerHTML = `
      <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); color: var(--color-text-secondary);">
        Olá, <strong>${firstName}</strong>
      </span>
      <a href="#planos" class="btn btn-secondary btn-sm">
        Novo Plano
      </a>
      <button type="button" class="btn btn-outline btn-sm" id="btn-header-logout" title="Terminar Sessão">
        Sair
      </button>
    `;
  }

  const logoutBtn = document.getElementById("btn-header-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await logoutUser();
      location.reload();
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
    const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
    const docHeight = (document.documentElement.scrollHeight || document.body.scrollHeight) - document.documentElement.clientHeight;
    
    // Visibilidade do botão a partir de 100px de rolagem
    if (scrollTop > 100) {
      scrollTopBtn.classList.add("visible");
    } else {
      scrollTopBtn.classList.remove("visible");
    }

    // Preenchimento do anel da borda conforme rolagem (0 a 100%)
    if (docHeight > 0) {
      const scrollPercentage = Math.min(Math.max(scrollTop / docHeight, 0), 1);
      const strokeOffset = circumference - (scrollPercentage * circumference);
      progressCircle.style.strokeDashoffset = strokeOffset;
    }
  }

  // Listener de rolagem com requestAnimationFrame
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

  // Ação de rolagem suave até o topo
  scrollTopBtn.addEventListener("click", (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });

  // Atualização inicial
  updateProgress();
}

/**
 * Gerencia a abertura e fechamento do menu de navegação em telas mobile
 */
function setupMobileMenu() {
  const menuBtn = document.getElementById("btn-mobile-menu");
  const nav = document.getElementById("header-nav");
  if (!menuBtn || !nav) return;

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    nav.classList.toggle("is-open");
  });

  // Fecha o menu ao clicar num link de navegação
  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
    });
  });

  // Fecha o menu ao clicar fora dele
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
      nav.classList.remove("is-open");
    }
  });
}


