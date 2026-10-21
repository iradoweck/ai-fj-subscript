/**
 * Admin Dashboard Controller — MEGASON
 * Desenvolvido por Zedecks IT
 * Gerencia a conferência de comprovativos SMS, aprovação de contas, faturas e métricas
 */

import {
  subscribeToAuthChanges,
  loginUser,
  logoutUser
} from "./services/auth.js";

import {
  getAllSubscriptions,
  getAllInvoices,
  approveSubscriptionOrder,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscriptionOrder,
  getFinancialMetrics,
  adminCreateCustomerWithSubscription
} from "./services/subscriptions.js";

import {
  fetchDynamicPlans,
  savePlanToFirestore,
  deletePlanFromFirestore,
  seedOfficialPlansToFirestore,
  SHARED_FEATURES
} from "./services/plans.js";

import {
  db,
  isFirebaseConfigured,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "./services/firebase.js";

// Estado da Aplicação Administrativa
let currentAdmin = null;
let allSubscriptions = [];
let allInvoices = [];
let allPlans = [];
let systemSettings = {
  adminEmail: "comercial@admin-megason.site",
  adminWhatsapp: "842256366"
};
let activeTab = "subscriptions";
let searchQuery = "";
let statusFilter = "all";

// Elementos DOM Principais
const guardContainer = document.getElementById("admin-guard-container");
const guardTitle = document.getElementById("guard-title");
const guardDescription = document.getElementById("guard-description");
const guardIconBox = document.getElementById("guard-icon-box");
const btnOpenAdminLogin = document.getElementById("btn-open-admin-login");
const dashboardContainer = document.getElementById("admin-dashboard-container");

const adminUserProfileWidget = document.getElementById("admin-user-profile-widget");
const adminUserName = document.getElementById("admin-user-name");
const btnAdminLogout = document.getElementById("btn-admin-logout");
const btnRefreshData = document.getElementById("btn-refresh-data");

// KPIs
const kpiTotalReceived = document.getElementById("kpi-total-received");
const kpiTotalBilled = document.getElementById("kpi-total-billed");
const kpiActiveSubscribers = document.getElementById("kpi-active-subscribers");
const kpiPendingOrders = document.getElementById("kpi-pending-orders");
const tabBadgePendingCount = document.getElementById("tab-badge-pending-count");

// Abas
const tabBtnSubscriptions = document.getElementById("tab-btn-subscriptions");
const tabBtnInvoices = document.getElementById("tab-btn-invoices");
const tabBtnPlans = document.getElementById("tab-btn-plans");
const tabBtnSettings = document.getElementById("tab-btn-settings");
const tabContentSubscriptions = document.getElementById("tab-content-subscriptions");
const tabContentInvoices = document.getElementById("tab-content-invoices");
const tabContentPlans = document.getElementById("tab-content-plans");
const tabContentSettings = document.getElementById("tab-content-settings");

// Elementos de Configurações
const formAdminSettings = document.getElementById("form-admin-settings");
const adminSettingEmail = document.getElementById("admin-setting-email");
const adminSettingWhatsapp = document.getElementById("admin-setting-whatsapp");

// Filtros
const adminSearchInput = document.getElementById("admin-search-input");
const adminStatusFilter = document.getElementById("admin-status-filter");

// Tabelas
const tbodySubscriptions = document.getElementById("tbody-subscriptions");
const tbodyInvoices = document.getElementById("tbody-invoices");
const tbodyPlans = document.getElementById("tbody-plans");

// Modais
const modalOrderDetails = document.getElementById("modal-order-details");
const modalApproveOrder = document.getElementById("modal-approve-order");
const modalSuspendOrder = document.getElementById("modal-suspend-order");
const modalCancelOrder = document.getElementById("modal-cancel-order");
const modalAdminLogin = document.getElementById("modal-admin-login");
const modalAdminCreateClient = document.getElementById("modal-admin-create-client");
const modalAdminClientCreatedSuccess = document.getElementById("modal-admin-client-created-success");
const modalAdminPlanForm = document.getElementById("modal-admin-plan-form");

// Elementos de Planos
const btnAdminOpenCreatePlan = document.getElementById("btn-admin-open-create-plan");
const btnAdminSeedPlans = document.getElementById("btn-admin-seed-plans");
const formAdminPlan = document.getElementById("form-admin-plan");
const modalPlanFormTitle = document.getElementById("modal-plan-form-title");
const adminClientPlanSelect = document.getElementById("admin-client-plan");

// Botão de Criar Cliente
const btnAdminOpenCreateClient = document.getElementById("btn-admin-open-create-client");
const btnAdminGenPassword = document.getElementById("btn-admin-gen-password");
const btnCopyWhatsappCreds = document.getElementById("btn-copy-whatsapp-creds");
const adminSuccessWhatsappMessage = document.getElementById("admin-success-whatsapp-message");

// Formulários
const formApproveOrder = document.getElementById("form-approve-order");
const formSuspendOrder = document.getElementById("form-suspend-order");
const formCancelOrder = document.getElementById("form-cancel-order");
const formAdminLogin = document.getElementById("form-admin-login");
const formAdminCreateClient = document.getElementById("form-admin-create-client");

// Container de Toasts
const toastContainer = document.getElementById("toast-container");

/**
 * Inicialização do Painel Administrativo
 */
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initAuthGuard();
});

/**
 * Guarda de Rota e Autenticação
 */
function initAuthGuard() {
  subscribeToAuthChanges(async ({ user, profile, isAdmin }) => {
    if (user && isAdmin) {
      // Utilizador é Administrador Autorizado
      currentAdmin = profile || { uid: user.uid, email: user.email, fullName: "Admin MEGASON", role: "admin" };
      
      guardContainer.style.display = "none";
      dashboardContainer.style.display = "block";
      
      adminUserName.textContent = currentAdmin.fullName || currentAdmin.email || "Admin";
      adminUserProfileWidget.style.display = "flex";

      closeAllModals();
      await loadDashboardData();
    } else if (user && !isAdmin) {
      // Utilizador autenticado mas NÃO é admin (Cliente comum)
      currentAdmin = null;
      dashboardContainer.style.display = "none";
      adminUserProfileWidget.style.display = "none";
      guardContainer.style.display = "block";

      guardTitle.textContent = "Acesso Negado — Permissão Insuficiente";
      guardDescription.textContent = "A sua conta está autenticada como cliente, mas não possui permissões administrativas na MEGASON. Se precisa de acesso administrativo, contacte a equipa técnica.";
      guardIconBox.style.backgroundColor = "var(--color-danger-bg)";
      guardIconBox.style.color = "var(--color-danger-text)";
      btnOpenAdminLogin.style.display = "none";
    } else {
      // Não autenticado
      currentAdmin = null;
      dashboardContainer.style.display = "none";
      adminUserProfileWidget.style.display = "none";
      guardContainer.style.display = "block";

      guardTitle.textContent = "Área Restrita — Autenticação Necessária";
      guardDescription.textContent = "Este painel é de acesso exclusivo para a equipa da MEGASON validar pagamentos e gerir acessos.";
      guardIconBox.style.backgroundColor = "var(--color-warning-bg)";
      guardIconBox.style.color = "var(--color-warning-text)";
      btnOpenAdminLogin.style.display = "inline-flex";
    }
  });
}

/**
 * Configuração de Listeners de Eventos
 */
function setupEventListeners() {
  // Botão para abrir modal de login de admin na tela de guarda
  btnOpenAdminLogin?.addEventListener("click", () => {
    openModal(modalAdminLogin);
  });

  // Login de Admin
  formAdminLogin?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("admin-login-email").value.trim();
    const password = document.getElementById("admin-login-password").value;
    const errorBox = document.getElementById("admin-login-error");
    const submitBtn = document.getElementById("btn-submit-admin-login");

    errorBox.style.display = "none";
    submitBtn.disabled = true;
    submitBtn.textContent = "A verificar...";

    try {
      const profile = await loginUser(email, password);
      if (profile.role !== "admin") {
        throw new Error("Esta conta não possui perfil de administrador.");
      }
      showToast("Sessão administrativa iniciada com sucesso!", "success");
      closeModal(modalAdminLogin);
    } catch (err) {
      errorBox.textContent = err.message || "Credenciais inválidas.";
      errorBox.style.display = "block";
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Entrar no Painel";
    }
  });

  // Logout do Admin
  btnAdminLogout?.addEventListener("click", async () => {
    if (confirm("Tem a certeza de que deseja encerrar a sua sessão administrativa?")) {
      await logoutUser();
      showToast("Sessão terminada.", "info");
    }
  });

  // Recarregar dados
  btnRefreshData?.addEventListener("click", async () => {
    btnRefreshData.disabled = true;
    showToast("A atualizar dados...", "info");
    await loadDashboardData();
    btnRefreshData.disabled = false;
  });

  // Troca de Abas
  tabBtnSubscriptions?.addEventListener("click", () => switchTab("subscriptions"));
  tabBtnInvoices?.addEventListener("click", () => switchTab("invoices"));
  tabBtnPlans?.addEventListener("click", () => switchTab("plans"));
  tabBtnSettings?.addEventListener("click", () => switchTab("settings"));

  // Gestão de Configurações
  formAdminSettings?.addEventListener("submit", handleSaveSettings);

  // Gestão de Planos
  btnAdminOpenCreatePlan?.addEventListener("click", () => openCreatePlanModal());
  btnAdminSeedPlans?.addEventListener("click", () => handleSeedDefaultPlans());
  formAdminPlan?.addEventListener("submit", handleSavePlan);

  // Filtro de Busca
  adminSearchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderActiveTab();
  });

  // Filtro de Status
  adminStatusFilter?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    renderActiveTab();
  });

  // Submissão do Formulário de Aprovação
  formApproveOrder?.addEventListener("submit", handleApproveOrder);

  // Submissão do Formulário de Suspensão
  formSuspendOrder?.addEventListener("submit", handleSuspendOrder);

  // Submissão do Formulário de Cancelamento / Rejeição
  formCancelOrder?.addEventListener("submit", handleCancelOrder);

  // Abertura do Modal de Novo Cliente & Plano
  btnAdminOpenCreateClient?.addEventListener("click", () => {
    openAdminCreateClientModal();
  });

  // Gerador de Senha Inicial
  btnAdminGenPassword?.addEventListener("click", () => {
    const passwordInput = document.getElementById("admin-client-password");
    if (passwordInput) {
      const generated = generateSecureTempPassword();
      passwordInput.value = generated;
      showToast("Senha segura gerada!", "info");
    }
  });

  // Auto-sugestão de Nome de Pasta ao digitar o Nome do Cliente
  document.getElementById("admin-client-name")?.addEventListener("input", (e) => {
    const folderInput = document.getElementById("admin-client-folder");
    const nameVal = e.target.value.trim();
    if (folderInput && nameVal) {
      const firstName = nameVal.split(" ")[0];
      folderInput.value = `MEGASON - ${firstName}`;
    }
  });

  // Submissão do Cadastro de Cliente pelo Administrador
  formAdminCreateClient?.addEventListener("submit", handleAdminCreateClient);

  // Cópia da Mensagem do WhatsApp
  btnCopyWhatsappCreds?.addEventListener("click", () => {
    if (adminSuccessWhatsappMessage) {
      adminSuccessWhatsappMessage.select();
      navigator.clipboard.writeText(adminSuccessWhatsappMessage.value)
        .then(() => showToast("Mensagem copiada para a área de transferência!", "success"))
        .catch(() => showToast("Erro ao copiar mensagem.", "warning"));
    }
  });

  // Fechamento de Modais pelos botões [data-close]
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      const modal = document.getElementById(modalId);
      if (modal) closeModal(modal);
    });
  });

  // Fechamento pelo backdrop
  [
    modalOrderDetails, 
    modalApproveOrder, 
    modalSuspendOrder, 
    modalCancelOrder, 
    modalAdminLogin, 
    modalAdminCreateClient, 
    modalAdminClientCreatedSuccess,
    modalAdminPlanForm
  ].forEach(modal => {
    if (!modal) return;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal(modal);
    });
  });

  // Fechamento via Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
}

/**
 * Carrega todos os dados administrativos do Firestore / Demonstração
 */
async function loadDashboardData() {
  try {
    const [metrics, subs, invs, plans] = await Promise.all([
      getFinancialMetrics(),
      getAllSubscriptions("all"),
      getAllInvoices("all"),
      fetchDynamicPlans()
    ]);

    allSubscriptions = subs;
    allInvoices = invs;
    allPlans = plans;

    // Atualiza KPIs
    kpiTotalReceived.textContent = `${metrics.totalReceived.toLocaleString("pt-MZ")} MT`;
    kpiTotalBilled.textContent = `${metrics.totalBilled.toLocaleString("pt-MZ")} MT`;
    kpiActiveSubscribers.textContent = metrics.activeSubscribers;
    kpiPendingOrders.textContent = metrics.pendingOrders;

    // Atualiza crachá de pendentes na aba
    if (metrics.pendingOrders > 0) {
      tabBadgePendingCount.textContent = metrics.pendingOrders;
      tabBadgePendingCount.style.display = "inline-flex";
    } else {
      tabBadgePendingCount.style.display = "none";
    }

    populateAdminClientPlanOptions();
    await loadSettingsData();
    renderActiveTab();
  } catch (err) {
    console.error("Falha ao carregar dados administrativos:", err);
    showToast("Erro ao carregar dados do sistema.", "danger");
  }
}

/**
 * Alterna entre abas
 */
function switchTab(tabName) {
  activeTab = tabName;
  
  // Reseta classes ativas
  tabBtnSubscriptions?.classList.remove("active");
  tabBtnInvoices?.classList.remove("active");
  tabBtnPlans?.classList.remove("active");
  tabBtnSettings?.classList.remove("active");

  if (tabContentSubscriptions) tabContentSubscriptions.style.display = "none";
  if (tabContentInvoices) tabContentInvoices.style.display = "none";
  if (tabContentPlans) tabContentPlans.style.display = "none";
  if (tabContentSettings) tabContentSettings.style.display = "none";

  if (tabName === "subscriptions") {
    tabBtnSubscriptions?.classList.add("active");
    if (tabContentSubscriptions) tabContentSubscriptions.style.display = "block";
  } else if (tabName === "invoices") {
    tabBtnInvoices?.classList.add("active");
    if (tabContentInvoices) tabContentInvoices.style.display = "block";
  } else if (tabName === "plans") {
    tabBtnPlans?.classList.add("active");
    if (tabContentPlans) tabContentPlans.style.display = "block";
  } else if (tabName === "settings") {
    tabBtnSettings?.classList.add("active");
    if (tabContentSettings) tabContentSettings.style.display = "block";
  }

  renderActiveTab();
}

/**
 * Renderiza a aba atualmente ativa
 */
function renderActiveTab() {
  if (activeTab === "subscriptions") {
    renderSubscriptionsTable();
  } else if (activeTab === "invoices") {
    renderInvoicesTable();
  } else if (activeTab === "plans") {
    renderPlansTable();
  } else if (activeTab === "settings") {
    renderSettingsForm();
  }
}

/**
 * Renderiza e preenche o formulário de configurações do sistema
 */
function renderSettingsForm() {
  if (adminSettingEmail) adminSettingEmail.value = systemSettings.adminEmail || "";
  if (adminSettingWhatsapp) adminSettingWhatsapp.value = systemSettings.adminWhatsapp || "";
}

/**
 * Salva as configurações de notificação do admin no Firestore / settings/public
 */
async function handleSaveSettings(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("btn-save-settings");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "A gravar...";
  }

  try {
    const adminEmail = adminSettingEmail?.value.trim();
    const adminWhatsapp = adminSettingWhatsapp?.value.trim();

    if (!adminEmail || !adminEmail.includes("@")) {
      throw new Error("Por favor, informe um endereço de e-mail válido.");
    }
    if (!adminWhatsapp || adminWhatsapp.length < 8) {
      throw new Error("Por favor, informe um número de telemóvel/WhatsApp válido.");
    }

    systemSettings = {
      adminEmail,
      adminWhatsapp
    };

    if (isFirebaseConfigured() && db) {
      const settingsRef = doc(db, "settings", "public");
      await setDoc(settingsRef, {
        adminEmail,
        adminWhatsapp,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin ? currentAdmin.uid : "admin"
      }, { merge: true });
    }

    localStorage.setItem("megason_system_settings", JSON.stringify(systemSettings));
    showToast("Configurações gravadas com sucesso!", "success");
  } catch (err) {
    showToast(err.message || "Erro ao gravar configurações.", "danger");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gravar Configurações";
    }
  }
}

/**
 * Carrega as configurações de notificação do sistema
 */
async function loadSettingsData() {
  try {
    if (isFirebaseConfigured() && db) {
      const settingsRef = doc(db, "settings", "public");
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.adminEmail) systemSettings.adminEmail = data.adminEmail;
        if (data.adminWhatsapp) systemSettings.adminWhatsapp = data.adminWhatsapp;
      }
    } else {
      const stored = localStorage.getItem("megason_system_settings");
      if (stored) {
        systemSettings = JSON.parse(stored);
      }
    }
    renderSettingsForm();
  } catch (err) {
    console.warn("Aviso ao carregar configurações públicas:", err);
  }
}

/**
 * Renderiza a Tabela de Subscrições
 */
function renderSubscriptionsTable() {
  const filtered = allSubscriptions.filter(sub => {
    // Filtro por status
    if (statusFilter !== "all" && sub.status !== statusFilter) return false;

    // Filtro por busca
    if (searchQuery) {
      const name = (sub.customerName || "").toLowerCase();
      const email = (sub.customerEmail || "").toLowerCase();
      const phone = (sub.customerWhatsapp || "").toLowerCase();
      const plan = (sub.planName || "").toLowerCase();
      const id = (sub.id || "").toLowerCase();
      const folder = (sub.folderName || "").toLowerCase();

      return name.includes(searchQuery) ||
             email.includes(searchQuery) ||
             phone.includes(searchQuery) ||
             plan.includes(searchQuery) ||
             folder.includes(searchQuery) ||
             id.includes(searchQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    tbodySubscriptions.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: var(--space-8); color: var(--color-text-muted);">
          Nenhuma subscrição encontrada com os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbodySubscriptions.innerHTML = filtered.map(sub => {
    const dateFormatted = sub.createdAt ? formatDate(sub.createdAt) : "Recentemente";
    const statusBadge = getStatusBadge(sub.status);
    const invoice = allInvoices.find(inv => inv.id === sub.latestInvoiceId) || null;
    const proofText = invoice ? invoice.proofText : null;

    return `
      <tr data-sub-id="${sub.id}">
        <td>
          <div style="font-size: var(--font-size-xs); font-family: monospace; font-weight: var(--font-weight-bold); color: var(--color-text-secondary);">${sub.id.slice(0, 10)}...</div>
          <div style="font-size: 11px; color: var(--color-text-muted);">${dateFormatted}</div>
        </td>
        <td>
          <strong style="display: block; font-size: var(--font-size-sm);">${sub.customerName || "Cliente"}</strong>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${sub.customerEmail || "-"}</span>
        </td>
        <td>
          <div style="font-size: var(--font-size-xs); font-family: monospace;">${sub.customerWhatsapp || "-"}</div>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs);">${sub.planName || "ChatGPT Plus"}</strong>
          <div style="font-size: var(--font-size-xs); color: var(--color-primary); font-weight: var(--font-weight-bold);">${sub.price || 0} MT</div>
        </td>
        <td>${statusBadge}</td>
        <td>
          ${sub.folderName ? `
            <span style="font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); color: var(--color-text-primary); display: inline-flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              ${sub.folderName}
            </span>
          ` : `
            <span style="font-size: 11px; color: var(--color-text-muted); font-style: italic;">Pendente de Atribuição</span>
          `}
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-view-details" data-id="${sub.id}" title="Ver Comprovativo SMS">
              SMS
            </button>
            ${sub.status === "pending" ? `
              <button class="btn btn-primary btn-sm btn-approve" data-id="${sub.id}" data-invoice="${sub.latestInvoiceId || ''}" title="Aprovar e Liberar Pasta">
                Aprovar
              </button>
              <button class="btn btn-ghost btn-sm btn-cancel" data-id="${sub.id}" data-invoice="${sub.latestInvoiceId || ''}" style="color: var(--color-danger);" title="Recusar Pedido">
                ✕
              </button>
            ` : ""}
            ${sub.status === "active" ? `
              <button class="btn btn-ghost btn-sm btn-suspend" data-id="${sub.id}" style="color: #C2410C;" title="Suspender Acesso">
                Suspender
              </button>
            ` : ""}
            ${sub.status === "suspended" ? `
              <button class="btn btn-secondary btn-sm btn-reactivate" data-id="${sub.id}" title="Reativar Acesso">
                Reativar
              </button>
            ` : ""}
          </div>
        </td>
      </tr>
    `;
  }).join("");

  attachSubscriptionRowActions();
}

/**
 * Conecta os eventos dos botões de ação na tabela de subscrições
 */
function attachSubscriptionRowActions() {
  // Ver Detalhes e Comprovativo SMS
  document.querySelectorAll(".btn-view-details").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      openOrderDetailsModal(subId);
    });
  });

  // Aprovar
  document.querySelectorAll(".btn-approve").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      const invId = btn.getAttribute("data-invoice");
      openApproveModal(subId, invId);
    });
  });

  // Suspender
  document.querySelectorAll(".btn-suspend").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      openSuspendModal(subId);
    });
  });

  // Reativar
  document.querySelectorAll(".btn-reactivate").forEach(btn => {
    btn.addEventListener("click", async () => {
      const subId = btn.getAttribute("data-id");
      if (confirm("Deseja restabelecer o acesso desta subscrição?")) {
        try {
          await reactivateSubscription({
            subscriptionId: subId,
            adminUid: currentAdmin ? currentAdmin.uid : "admin"
          });
          showToast("Subscrição reativada com sucesso!", "success");
          await loadDashboardData();
        } catch (err) {
          showToast(err.message || "Erro ao reativar.", "danger");
        }
      }
    });
  });

  // Recusar / Cancelar
  document.querySelectorAll(".btn-cancel").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      const invId = btn.getAttribute("data-invoice");
      openCancelModal(subId, invId);
    });
  });
}

/**
 * Renderiza a Tabela de Faturas Financeiras
 */
function renderInvoicesTable() {
  const filtered = allInvoices.filter(inv => {
    if (searchQuery) {
      const name = (inv.customerName || "").toLowerCase();
      const email = (inv.customerEmail || "").toLowerCase();
      const phone = (inv.customerWhatsapp || "").toLowerCase();
      const id = (inv.id || "").toLowerCase();
      const subId = (inv.subscriptionId || "").toLowerCase();

      return name.includes(searchQuery) ||
             email.includes(searchQuery) ||
             phone.includes(searchQuery) ||
             id.includes(searchQuery) ||
             subId.includes(searchQuery);
    }
    return true;
  });

  if (filtered.length === 0) {
    tbodyInvoices.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: var(--space-8); color: var(--color-text-muted);">
          Nenhuma fatura encontrada.
        </td>
      </tr>
    `;
    return;
  }

  tbodyInvoices.innerHTML = filtered.map(inv => {
    const dateFormatted = inv.createdAt ? formatDate(inv.createdAt) : "Recentemente";
    const statusBadge = getInvoiceStatusBadge(inv.status);

    return `
      <tr>
        <td>
          <span style="font-size: var(--font-size-xs); font-family: monospace; font-weight: var(--font-weight-bold); color: var(--color-primary);">${inv.invoiceNumber || inv.id}</span>
        </td>
        <td>
          <span style="font-size: var(--font-size-xs); font-family: monospace; color: var(--color-text-muted);">${(inv.subscriptionId || "-").slice(0, 10)}...</span>
        </td>
        <td>
          <strong style="display: block; font-size: var(--font-size-xs);">${inv.customerName || "Cliente"}</strong>
          <span style="font-size: 11px; color: var(--color-text-muted);">${inv.customerWhatsapp || "-"}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${(inv.amount || 0).toLocaleString("pt-MZ")} MT</strong>
        </td>
        <td>
          <span class="payment-pill" style="font-size: 11px; padding: 2px 8px;">
            ${inv.paymentMethod || "M-Pesa / E-Mola"}
          </span>
        </td>
        <td>${statusBadge}</td>
        <td style="font-size: 11px; color: var(--color-text-secondary);">${dateFormatted}</td>
        <td style="font-size: 11px; color: var(--color-text-muted); font-family: monospace;">
          ${inv.confirmedBy || (inv.status === "paid" ? "admin" : "-")}
        </td>
      </tr>
    `;
  }).join("");
}

/**
 * Abertura de Modal de Detalhes & SMS
 */
function openOrderDetailsModal(subscriptionId) {
  const sub = allSubscriptions.find(s => s.id === subscriptionId);
  if (!sub) return;

  const invoice = allInvoices.find(inv => inv.id === sub.latestInvoiceId) || null;

  document.getElementById("modal-detail-client-name").textContent = sub.customerName || "Cliente";
  document.getElementById("modal-detail-client-phone").textContent = sub.customerWhatsapp || "Não informado";
  document.getElementById("modal-detail-client-email").textContent = sub.customerEmail || "-";
  document.getElementById("modal-detail-plan-info").textContent = `${sub.planName || "ChatGPT Plus"} (${sub.price || 0} MT / ${sub.durationDays || 30} Dias)`;

  const proofBox = document.getElementById("modal-detail-proof-box");
  if (invoice && invoice.proofText) {
    proofBox.textContent = invoice.proofText;
  } else {
    proofBox.textContent = "(Nenhum texto de comprovativo SMS submetido)";
  }

  const credentialsBox = document.getElementById("modal-detail-credentials-box");
  if (sub.folderName || sub.accessCredentials) {
    credentialsBox.style.display = "block";
    document.getElementById("modal-detail-folder-name").textContent = sub.folderName || "Não informado";
    document.getElementById("modal-detail-credentials-text").textContent = sub.accessCredentials || "(Sem instruções gravadas)";
  } else {
    credentialsBox.style.display = "none";
  }

  openModal(modalOrderDetails);
}

/**
 * Abertura de Modal de Aprovação
 */
function openApproveModal(subscriptionId, invoiceId) {
  const sub = allSubscriptions.find(s => s.id === subscriptionId);
  if (!sub) return;

  document.getElementById("approve-subscription-id").value = subscriptionId;
  document.getElementById("approve-invoice-id").value = invoiceId || sub.latestInvoiceId || "";

  // Sugestão de pasta padronizada MEGASON
  const cleanName = (sub.customerName || "Cliente").split(" ")[0];
  document.getElementById("approve-folder-name").value = `MEGASON - ${cleanName} (${sub.id.slice(0, 4).toUpperCase()})`;

  document.getElementById("approve-credentials").value = `Acesso ChatGPT Plus:
1. Faça login na conta partilhada enviada pela equipa MEGASON.
2. Acesse a pasta dedicada "${cleanName}" na barra lateral para manter as suas conversas isoladas.
3. Não altere a senha ou configurações da conta principal.`;

  document.getElementById("approve-admin-notes").value = "";

  openModal(modalApproveOrder);
}

/**
 * Abertura de Modal de Suspensão
 */
function openSuspendModal(subscriptionId) {
  document.getElementById("suspend-subscription-id").value = subscriptionId;
  document.getElementById("suspend-reason").value = "";
  openModal(modalSuspendOrder);
}

/**
 * Abertura de Modal de Cancelamento
 */
function openCancelModal(subscriptionId, invoiceId) {
  document.getElementById("cancel-subscription-id").value = subscriptionId;
  document.getElementById("cancel-invoice-id").value = invoiceId || "";
  document.getElementById("cancel-reason").value = "";
  openModal(modalCancelOrder);
}

/**
 * Handler de Aprovação de Pedido
 */
async function handleApproveOrder(e) {
  e.preventDefault();
  const subId = document.getElementById("approve-subscription-id").value;
  const invId = document.getElementById("approve-invoice-id").value;
  const folderName = document.getElementById("approve-folder-name").value;
  const credentials = document.getElementById("approve-credentials").value;
  const notes = document.getElementById("approve-admin-notes").value;
  const submitBtn = document.getElementById("btn-submit-approve");

  submitBtn.disabled = true;
  submitBtn.textContent = "A aprovar e ativar...";

  try {
    await approveSubscriptionOrder({
      subscriptionId: subId,
      invoiceId: invId,
      adminUid: currentAdmin ? currentAdmin.uid : "admin",
      folderName,
      accessCredentials: credentials,
      adminNotes: notes
    });

    showToast("Pagamento confirmado e subscrição ativada com sucesso!", "success");
    closeModal(modalApproveOrder);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Falha ao aprovar pedido.", "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar Pagamento e Ativar";
  }
}

/**
 * Handler de Suspensão de Subscrição
 */
async function handleSuspendOrder(e) {
  e.preventDefault();
  const subId = document.getElementById("suspend-subscription-id").value;
  const reason = document.getElementById("suspend-reason").value;
  const submitBtn = document.getElementById("btn-submit-suspend");

  submitBtn.disabled = true;
  submitBtn.textContent = "A suspender...";

  try {
    await suspendSubscription({
      subscriptionId: subId,
      adminUid: currentAdmin ? currentAdmin.uid : "admin",
      reason
    });

    showToast("Subscrição suspensa com sucesso.", "warning");
    closeModal(modalSuspendOrder);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Falha ao suspender subscrição.", "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar Suspensão";
  }
}

/**
 * Handler de Cancelamento / Rejeição
 */
async function handleCancelOrder(e) {
  e.preventDefault();
  const subId = document.getElementById("cancel-subscription-id").value;
  const invId = document.getElementById("cancel-invoice-id").value;
  const reason = document.getElementById("cancel-reason").value;
  const submitBtn = document.getElementById("btn-submit-cancel");

  submitBtn.disabled = true;
  submitBtn.textContent = "A rejeitar...";

  try {
    await cancelSubscriptionOrder({
      subscriptionId: subId,
      invoiceId: invId,
      adminUid: currentAdmin ? currentAdmin.uid : "admin",
      reason
    });

    showToast("Pedido rejeitado e registo cancelado.", "info");
    closeModal(modalCancelOrder);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Falha ao rejeitar pedido.", "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Rejeitar Pedido";
  }
}

/**
 * Abre o modal de cadastro administrativo de cliente e atribuição de plano
 */
function openAdminCreateClientModal() {
  if (formAdminCreateClient) formAdminCreateClient.reset();

  const passwordInput = document.getElementById("admin-client-password");
  if (passwordInput) passwordInput.value = generateSecureTempPassword();

  const credentialsInput = document.getElementById("admin-client-credentials");
  if (credentialsInput) {
    credentialsInput.value = `Instruções ChatGPT Plus:
1. Faça login na conta de equipa com o email oficial fornecido.
2. Selecione a sua pasta dedicada na barra lateral para isolar todas as suas conversas.
3. Não altere as credenciais mestras da conta.`;
  }

  const markPaidCheckbox = document.getElementById("admin-client-mark-paid");
  if (markPaidCheckbox) markPaidCheckbox.checked = true;

  openModal(modalAdminCreateClient);
}

/**
 * Gera uma senha temporária segura para o cliente
 */
function generateSecureTempPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let pass = "Mg@";
  for (let i = 0; i < 5; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + "26";
}

/**
 * Handler de criação de cliente e atribuição direta de plano pelo Administrador
 */
async function handleAdminCreateClient(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("btn-submit-create-client");

  const fullName = document.getElementById("admin-client-name")?.value.trim();
  const email = document.getElementById("admin-client-email")?.value.trim();
  const whatsappNumber = document.getElementById("admin-client-whatsapp")?.value.trim();
  const province = document.getElementById("admin-client-province")?.value || "Maputo Cidade";
  const password = document.getElementById("admin-client-password")?.value;

  const planId = document.getElementById("admin-client-plan")?.value;
  const paymentMethod = document.getElementById("admin-client-payment-method")?.value;
  const folderName = document.getElementById("admin-client-folder")?.value.trim();
  const accessCredentials = document.getElementById("admin-client-credentials")?.value.trim();
  const markAsPaid = document.getElementById("admin-client-mark-paid")?.checked;
  const adminNotes = document.getElementById("admin-client-notes")?.value.trim();

  submitBtn.disabled = true;
  submitBtn.textContent = "A registar cliente e plano...";

  try {
    const result = await adminCreateCustomerWithSubscription({
      fullName,
      email,
      password,
      whatsappNumber,
      province,
      planId,
      folderName,
      accessCredentials,
      paymentMethod,
      markAsPaid,
      adminNotes,
      adminUid: currentAdmin ? currentAdmin.uid : "admin"
    });

    showToast("Cliente e plano criados com sucesso!", "success");
    closeModal(modalAdminCreateClient);

    // Formata mensagem para WhatsApp pronta para copiar
    const planName = result.subscription.planName || "ChatGPT Plus";
    const planPrice = result.subscription.price || 0;
    const clientCode = result.user?.clientCode || "AI-Cliente";
    const invoiceNum = result.invoice?.invoiceNumber || result.invoice?.id;

    const whatsappMsg = `*MEGASON — Acesso Ativado ChatGPT Plus*
Olá, ${fullName}! O seu acesso ao ChatGPT Plus foi criado e ativado com sucesso pela nossa equipa.

📋 *Detalhes da Subscrição:*
• *ID de Cliente:* ${clientCode}
• *Fatura Oficial:* ${invoiceNum}
• *Plano:* ${planName} (${result.subscription.durationDays || 30} dias)
• *Valor:* ${planPrice.toLocaleString("pt-MZ")} MT
• *Pasta Exclusiva:* ${result.subscription.folderName || folderName}
• *Estado:* ${markAsPaid ? "Ativo e Confirmado" : "Aguardando Pagamento"}

🔑 *Credenciais / Instruções de Acesso:*
${accessCredentials}

🌐 *Painel do Cliente MEGASON:*
Poderá consultar a sua subscrição e faturas no nosso site:
• *Site:* https://ai.admin-megason.site
• *Email:* ${email}
• *Senha Temporária:* ${password}

_Nota: Recomendamos que altere a sua senha no primeiro acesso caso deseje._
Obrigado por escolher a MEGASON!`;

    if (adminSuccessWhatsappMessage) {
      adminSuccessWhatsappMessage.value = whatsappMsg;
    }

    openModal(modalAdminClientCreatedSuccess);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Erro ao criar cliente.", "danger");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Cadastrar Cliente e Liberar Acesso";
  }
}

/**
 * Funções Auxiliares de UI e Modais
 */
function openModal(modal) {
  if (modal) modal.style.display = "flex";
}

function closeModal(modal) {
  if (modal) modal.style.display = "none";
}

function closeAllModals() {
  [
    modalOrderDetails, 
    modalApproveOrder, 
    modalSuspendOrder, 
    modalCancelOrder, 
    modalAdminLogin,
    modalAdminCreateClient,
    modalAdminClientCreatedSuccess,
    modalAdminPlanForm
  ].forEach(closeModal);
}

/**
 * Renderiza a Tabela de Gestão de Planos & Preços
 */
function renderPlansTable() {
  if (!tbodyPlans) return;

  if (!allPlans || allPlans.length === 0) {
    tbodyPlans.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: var(--space-8); color: var(--color-text-muted);">
          Nenhum plano cadastrado. Clique em "Sincronizar Padrão" para carregar os 4 pacotes oficiais.
        </td>
      </tr>
    `;
    return;
  }

  tbodyPlans.innerHTML = allPlans.map(plan => {
    const isFeatured = plan.featured;
    const badgeText = plan.badge || (plan.savings ? plan.savings : "-");

    return `
      <tr data-plan-id="${plan.id}">
        <td><code style="font-size: 11px; background-color: var(--color-bg-subtle); padding: 2px 6px; border-radius: 4px;">${plan.id}</code></td>
        <td>
          <div style="font-weight: var(--font-weight-bold); color: var(--color-text-primary); font-size: var(--font-size-sm);">
            ${plan.name}
          </div>
          <div style="font-size: 11px; color: var(--color-text-muted);">${plan.durationLabel || `${plan.durationDays} Dias`}</div>
        </td>
        <td><strong>${plan.durationDays}</strong> dias</td>
        <td>
          <strong style="font-size: var(--font-size-sm); color: var(--color-primary);">${Number(plan.price).toLocaleString("pt-MZ")} MT</strong>
        </td>
        <td>
          ${isFeatured 
            ? '<span class="status-badge status-badge-active" style="font-size: 11px;">Melhor Oferta</span>' 
            : '<span style="color: var(--color-text-muted); font-size: 11px;">Normal</span>'}
        </td>
        <td>
          <span style="font-size: 12px; color: var(--color-text-secondary);">${badgeText}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm btn-edit-plan" data-id="${plan.id}" style="padding: 4px 8px; margin-right: 4px;" title="Editar Pacote">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Editar
          </button>
          <button class="btn btn-ghost btn-sm btn-delete-plan" data-id="${plan.id}" style="color: var(--color-danger); padding: 4px 8px;" title="Apagar Pacote">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Apagar
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Conectar botões de ação na tabela
  tbodyPlans.querySelectorAll(".btn-edit-plan").forEach(btn => {
    btn.addEventListener("click", () => {
      const planId = btn.getAttribute("data-id");
      openEditPlanModal(planId);
    });
  });

  tbodyPlans.querySelectorAll(".btn-delete-plan").forEach(btn => {
    btn.addEventListener("click", () => {
      const planId = btn.getAttribute("data-id");
      handleDeletePlan(planId);
    });
  });
}

/**
 * Abre o modal para criar um novo plano
 */
function openCreatePlanModal() {
  if (!modalAdminPlanForm || !formAdminPlan) return;
  formAdminPlan.reset();

  document.getElementById("admin-plan-id").value = "";
  if (modalPlanFormTitle) modalPlanFormTitle.textContent = "Criar Novo Pacote Comercial";

  const featuresTextarea = document.getElementById("admin-plan-features");
  if (featuresTextarea) {
    featuresTextarea.value = SHARED_FEATURES.join("\n");
  }

  openModal(modalAdminPlanForm);
}

/**
 * Abre o modal para editar um plano existente
 */
function openEditPlanModal(planId) {
  const plan = allPlans.find(p => p.id === planId);
  if (!plan || !modalAdminPlanForm) return;

  document.getElementById("admin-plan-id").value = plan.id;
  document.getElementById("admin-plan-name").value = plan.name || "";
  document.getElementById("admin-plan-duration").value = plan.durationDays || "";
  document.getElementById("admin-plan-duration-label").value = plan.durationLabel || "";
  document.getElementById("admin-plan-price").value = plan.price || "";
  document.getElementById("admin-plan-badge").value = plan.badge || plan.savings || "";
  document.getElementById("admin-plan-featured").checked = Boolean(plan.featured);

  const featuresTextarea = document.getElementById("admin-plan-features");
  if (featuresTextarea) {
    featuresTextarea.value = (plan.features && plan.features.length > 0 ? plan.features : SHARED_FEATURES).join("\n");
  }

  if (modalPlanFormTitle) modalPlanFormTitle.textContent = `Editar Pacote: ${plan.name}`;
  openModal(modalAdminPlanForm);
}

/**
 * Submissão de criação/edição de plano
 */
async function handleSavePlan(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("btn-submit-plan-form");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "A gravar pacote...";
  }

  try {
    const id = document.getElementById("admin-plan-id").value.trim();
    const name = document.getElementById("admin-plan-name").value.trim();
    const durationDays = parseInt(document.getElementById("admin-plan-duration").value, 10);
    const durationLabel = document.getElementById("admin-plan-duration-label").value.trim() || `${durationDays} Dias`;
    const price = parseFloat(document.getElementById("admin-plan-price").value);
    const badge = document.getElementById("admin-plan-badge").value.trim() || null;
    const featured = document.getElementById("admin-plan-featured").checked;
    
    const featuresRaw = document.getElementById("admin-plan-features").value.trim();
    const features = featuresRaw ? featuresRaw.split("\n").map(f => f.trim()).filter(Boolean) : SHARED_FEATURES;

    await savePlanToFirestore({
      id: id || `plan-${durationDays}d`,
      name,
      durationDays,
      durationLabel,
      price,
      badge,
      savings: badge,
      featured,
      features
    });

    showToast("Pacote gravado com sucesso!", "success");
    closeModal(modalAdminPlanForm);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Erro ao gravar pacote.", "danger");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gravar Pacote";
    }
  }
}

/**
 * Exclusão de plano
 */
async function handleDeletePlan(planId) {
  const plan = allPlans.find(p => p.id === planId);
  const planName = plan ? plan.name : planId;

  if (!confirm(`Tem a certeza de que deseja apagar o pacote "${planName}"? Esta ação removerá o plano da vitrine comercial.`)) {
    return;
  }

  try {
    showToast("A apagar pacote...", "info");
    await deletePlanFromFirestore(planId);
    showToast(`Pacote "${planName}" apagado com sucesso.`, "success");
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Erro ao apagar pacote.", "danger");
  }
}

/**
 * Sincronização dos planos oficiais padrão
 */
async function handleSeedDefaultPlans() {
  if (!confirm("Deseja sincronizar e gravar os 4 planos oficiais da MEGASON na base de dados?")) {
    return;
  }

  try {
    showToast("A sincronizar pacotes padrão...", "info");
    await seedOfficialPlansToFirestore();
    showToast("4 planos oficiais sincronizados com sucesso!", "success");
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Erro ao sincronizar planos.", "danger");
  }
}

/**
 * Atualiza as opções do select de planos no formulário de criação de cliente
 */
function populateAdminClientPlanOptions() {
  if (!adminClientPlanSelect) return;

  const currentSelected = adminClientPlanSelect.value;
  adminClientPlanSelect.innerHTML = allPlans.map(plan => {
    return `<option value="${plan.id}">${plan.name} — ${Number(plan.price).toLocaleString("pt-MZ")} MT (${plan.durationDays} dias)</option>`;
  }).join("");

  if (currentSelected && allPlans.some(p => p.id === currentSelected)) {
    adminClientPlanSelect.value = currentSelected;
  }
}

function getStatusBadge(status) {
  switch (status) {
    case "active":
      return `<span class="status-badge status-badge-active">Ativa</span>`;
    case "pending":
      return `<span class="status-badge status-badge-pending">Pendente</span>`;
    case "suspended":
      return `<span class="status-badge status-badge-suspended">Suspensa</span>`;
    case "cancelled":
      return `<span class="status-badge status-badge-cancelled">Cancelada</span>`;
    default:
      return `<span class="status-badge">${status || "Desconhecido"}</span>`;
  }
}

function getInvoiceStatusBadge(status) {
  switch (status) {
    case "paid":
      return `<span class="status-badge status-badge-paid">Paga</span>`;
    case "pending":
      return `<span class="status-badge status-badge-pending">Pendente</span>`;
    case "cancelled":
      return `<span class="status-badge status-badge-cancelled">Cancelada</span>`;
    default:
      return `<span class="status-badge">${status || "-"}</span>`;
  }
}

function formatDate(isoOrTimestamp) {
  try {
    const d = isoOrTimestamp.toDate ? isoOrTimestamp.toDate() : new Date(isoOrTimestamp);
    return d.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return "Data Inválida";
  }
}

function showToast(message, type = "info") {
  if (!toastContainer) return;
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}