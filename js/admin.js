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
  getFinancialMetrics
} from "./services/subscriptions.js";

// Estado da Aplicação Administrativa
let currentAdmin = null;
let allSubscriptions = [];
let allInvoices = [];
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
const tabContentSubscriptions = document.getElementById("tab-content-subscriptions");
const tabContentInvoices = document.getElementById("tab-content-invoices");

// Filtros
const adminSearchInput = document.getElementById("admin-search-input");
const adminStatusFilter = document.getElementById("admin-status-filter");

// Tabelas
const tbodySubscriptions = document.getElementById("tbody-subscriptions");
const tbodyInvoices = document.getElementById("tbody-invoices");

// Modais
const modalOrderDetails = document.getElementById("modal-order-details");
const modalApproveOrder = document.getElementById("modal-approve-order");
const modalSuspendOrder = document.getElementById("modal-suspend-order");
const modalCancelOrder = document.getElementById("modal-cancel-order");
const modalAdminLogin = document.getElementById("modal-admin-login");

// Formulários
const formApproveOrder = document.getElementById("form-approve-order");
const formSuspendOrder = document.getElementById("form-suspend-order");
const formCancelOrder = document.getElementById("form-cancel-order");
const formAdminLogin = document.getElementById("form-admin-login");

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

  // Fechamento de Modais pelos botões [data-close]
  document.querySelectorAll("[data-close]").forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      const modal = document.getElementById(modalId);
      if (modal) closeModal(modal);
    });
  });

  // Fechamento pelo backdrop
  [modalOrderDetails, modalApproveOrder, modalSuspendOrder, modalCancelOrder, modalAdminLogin].forEach(modal => {
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
    const [metrics, subs, invs] = await Promise.all([
      getFinancialMetrics(),
      getAllSubscriptions("all"),
      getAllInvoices("all")
    ]);

    allSubscriptions = subs;
    allInvoices = invs;

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
  if (tabName === "subscriptions") {
    tabBtnSubscriptions.classList.add("active");
    tabBtnInvoices.classList.remove("active");
    tabContentSubscriptions.style.display = "block";
    tabContentInvoices.style.display = "none";
  } else {
    tabBtnInvoices.classList.add("active");
    tabBtnSubscriptions.classList.remove("active");
    tabContentInvoices.style.display = "block";
    tabContentSubscriptions.style.display = "none";
  }
  renderActiveTab();
}

/**
 * Renderiza a aba atualmente ativa
 */
function renderActiveTab() {
  if (activeTab === "subscriptions") {
    renderSubscriptionsTable();
  } else {
    renderInvoicesTable();
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
          <span style="font-size: var(--font-size-xs); font-family: monospace; font-weight: var(--font-weight-bold);">${inv.id.slice(0, 10)}...</span>
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
 * Funções Auxiliares de UI e Modais
 */
function openModal(modal) {
  if (modal) modal.style.display = "flex";
}

function closeModal(modal) {
  if (modal) modal.style.display = "none";
}

function closeAllModals() {
  [modalOrderDetails, modalApproveOrder, modalSuspendOrder, modalCancelOrder, modalAdminLogin].forEach(closeModal);
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