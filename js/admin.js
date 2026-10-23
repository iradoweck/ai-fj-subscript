/**
 * Admin Dashboard Controller — MEGASON
 * Desenvolvido por Zedecks IT
 * Gerencia a conferência de comprovativos SMS, aprovação de contas, faturas e métricas
 */

import {
  subscribeToAuthChanges,
  loginUser,
  logoutUser,
  updateAdminProfile,
  changeAdminPassword
} from "./services/auth.js";

import {
  getAllSubscriptions,
  getAllInvoices,
  getInvoiceById,
  calculateSubscriptionDates,
  listenToAdminSubscriptions,
  approveSubscriptionOrder,
  suspendSubscription,
  reactivateSubscription,
  cancelSubscriptionOrder,
  getFinancialMetrics,
  adminCreateCustomerWithSubscription,
  getAllCustomers,
  adminUpdateCustomer,
  adminAssignPlanToCustomer,
  deleteCustomerCascade
} from "./services/subscriptions.js";

import {
  buildWhatsAppInvoiceUrl,
  formatWhatsAppWelcomeCredentialsText,
  sendInvoiceEmail,
  getEmailSettings
} from "./services/email.js";

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
let allCustomers = [];
let systemSettings = {
  adminEmail: "comercial@admin-megason.site",
  adminWhatsapp: "842256366",
  mpesaNumber: "842256366",
  mpesaHolder: "FRANCISCO",
  emolaNumber: "861557953",
  emolaHolder: "FRANCISCO",
  absaAccount: "0708101028295",
  absaNib: "000207080810102829586",
  absaHolder: "MEGASON",
  emailjsServiceId: "",
  emailjsTemplateId: "",
  emailjsPublicKey: ""
};
let activeTab = "dashboard";
let searchQuery = "";
let statusFilter = "all";
let customersSearchQuery = "";
let customersStatusFilter = "all";
let invoicesSearchQuery = "";
let invoicesStatusFilter = "all";

// Elementos DOM Principais
const guardContainer = document.getElementById("admin-guard-container");
const guardHeader = document.getElementById("admin-guard-header");
const guardMain = document.getElementById("admin-guard-main");
const guardTitle = document.getElementById("guard-title");
const guardDescription = document.getElementById("guard-description");
const guardIconBox = document.getElementById("guard-icon-box");
const btnOpenAdminLogin = document.getElementById("btn-open-admin-login");
const dashboardContainer = document.getElementById("admin-dashboard-container");

const adminPageTitle = document.getElementById("admin-page-title");
const adminSidebar = document.getElementById("admin-sidebar");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const btnToggleSidebar = document.getElementById("btn-toggle-sidebar");

const adminUserProfileWidget = document.getElementById("admin-user-profile-widget");
const adminUserName = document.getElementById("admin-user-name");
const btnAdminLogout = document.getElementById("btn-admin-logout");
const btnRefreshData = document.getElementById("btn-refresh-data");

// KPIs da Página Inicial (Dashboard)
const kpiTotalReceived = document.getElementById("kpi-total-received");
const kpiTotalBilled = document.getElementById("kpi-total-billed");
const kpiActiveSubscribers = document.getElementById("kpi-active-subscribers");
const kpiSuspendedSubscribers = document.getElementById("kpi-suspended-subscribers");
const kpiTotalCustomers = document.getElementById("kpi-total-customers");
const kpiPendingOrders = document.getElementById("kpi-pending-orders");
const tabBadgePendingCount = document.getElementById("tab-badge-pending-count");
const tabBadgeCustomersCount = document.getElementById("tab-badge-customers-count");
const tbodyDashPendingOrders = document.getElementById("tbody-dash-pending-orders");
const btnDashViewAllOrders = document.getElementById("btn-dash-view-all-orders");

// Abas da Sidebar Lateral
const tabBtnDashboard = document.getElementById("tab-btn-dashboard");
const tabBtnCustomers = document.getElementById("tab-btn-customers");
const tabBtnSubscriptions = document.getElementById("tab-btn-subscriptions");
const tabBtnInvoices = document.getElementById("tab-btn-invoices");
const tabBtnPlans = document.getElementById("tab-btn-plans");
const tabBtnSettings = document.getElementById("tab-btn-settings");

const tabContentDashboard = document.getElementById("tab-content-dashboard");
const tabContentCustomers = document.getElementById("tab-content-customers");
const tabContentSubscriptions = document.getElementById("tab-content-subscriptions");
const tabContentInvoices = document.getElementById("tab-content-invoices");
const tabContentPlans = document.getElementById("tab-content-plans");
const tabContentSettings = document.getElementById("tab-content-settings");

// Elementos da Tabela de Clientes
const tbodyCustomers = document.getElementById("tbody-customers");
const adminCustomersSearchInput = document.getElementById("admin-customers-search-input");
const adminCustomersStatusFilter = document.getElementById("admin-customers-status-filter");
const customersTotalLabel = document.getElementById("customers-total-label");
const subscriptionsTotalLabel = document.getElementById("subscriptions-total-label");

// Elementos do Modal de Ficha Cadastral do Cliente
const modalCustomerDetails = document.getElementById("modal-customer-details");
const customerModalSubtitle = document.getElementById("customer-modal-subtitle");
const customerViewCode = document.getElementById("customer-view-code");
const customerViewCreatedAt = document.getElementById("customer-view-created-at");
const customerViewStatusBadge = document.getElementById("customer-view-status-badge");
const formCustomerEdit = document.getElementById("form-customer-edit");
const customerEditId = document.getElementById("customer-edit-id");
const customerEditEmail = document.getElementById("customer-edit-email");
const customerEditName = document.getElementById("customer-edit-name");
const customerEditWhatsapp = document.getElementById("customer-edit-whatsapp");
const customerEditProvince = document.getElementById("customer-edit-province");
const customerEditFolder = document.getElementById("customer-edit-folder");
const customerEditCredentials = document.getElementById("customer-edit-credentials");
const customerEditNotes = document.getElementById("customer-edit-notes");
const btnSaveCustomerEdit = document.getElementById("btn-save-customer-edit");
const customerSubPlanName = document.getElementById("customer-sub-plan-name");
const customerSubDates = document.getElementById("customer-sub-dates");
const customerSubCountdown = document.getElementById("customer-sub-countdown");
const btnCustomerOpenAssignPlan = document.getElementById("btn-customer-open-assign-plan");
const tbodyCustomerInvoices = document.getElementById("tbody-customer-invoices");
const btnCustomerModalWa = document.getElementById("btn-customer-modal-wa");

// Elementos do Modal de Atribuição Direta de Pacote
const modalAdminAssignPlan = document.getElementById("modal-admin-assign-plan");
const formAdminAssignPlan = document.getElementById("form-admin-assign-plan");
const assignPlanUserId = document.getElementById("assign-plan-user-id");
const assignPlanEmail = document.getElementById("assign-plan-email");
const assignPlanCode = document.getElementById("assign-plan-code");
const assignPlanName = document.getElementById("assign-plan-name");
const assignPlanWhatsapp = document.getElementById("assign-plan-whatsapp");
const assignPlanDisplayName = document.getElementById("assign-plan-display-name");
const assignPlanDisplayCode = document.getElementById("assign-plan-display-code");
const assignPlanSelect = document.getElementById("assign-plan-select");
const assignPlanFolder = document.getElementById("assign-plan-folder");
const assignPlanCredentials = document.getElementById("assign-plan-credentials");
const assignPlanMarkPaid = document.getElementById("assign-plan-mark-paid");
const assignPlanNotes = document.getElementById("assign-plan-notes");
const btnSubmitAssignPlan = document.getElementById("btn-submit-assign-plan");

// Elementos da Tabela de Faturas
const adminInvoicesSearchInput = document.getElementById("admin-invoices-search-input");
const adminInvoicesStatusFilter = document.getElementById("admin-invoices-status-filter");
const invoicesTotalLabel = document.getElementById("invoices-total-label");

// Elementos de Configurações da Empresa
const formAdminSettings = document.getElementById("form-admin-settings");
const adminSettingEmail = document.getElementById("admin-setting-email");
const adminSettingWhatsapp = document.getElementById("admin-setting-whatsapp");
const adminSettingEmailjsService = document.getElementById("admin-setting-emailjs-service");
const adminSettingEmailjsTemplate = document.getElementById("admin-setting-emailjs-template");
const adminSettingEmailjsPublickey = document.getElementById("admin-setting-emailjs-publickey");

const adminSettingMpesaNumber = document.getElementById("admin-setting-mpesa-number");
const adminSettingMpesaHolder = document.getElementById("admin-setting-mpesa-holder");
const adminSettingEmolaNumber = document.getElementById("admin-setting-emola-number");
const adminSettingEmolaHolder = document.getElementById("admin-setting-emola-holder");
const adminSettingAbsaAccount = document.getElementById("admin-setting-absa-account");
const adminSettingAbsaNib = document.getElementById("admin-setting-absa-nib");
const adminSettingAbsaHolder = document.getElementById("admin-setting-absa-holder");

// Elementos do Perfil do Administrador
const formAdminProfile = document.getElementById("form-admin-profile");
const adminProfileName = document.getElementById("admin-profile-name");
const adminProfileEmail = document.getElementById("admin-profile-email");
const adminProfileWhatsapp = document.getElementById("admin-profile-whatsapp");
const adminProfileTitle = document.getElementById("admin-profile-title");
const btnSaveAdminProfile = document.getElementById("btn-save-admin-profile");

const formAdminPassword = document.getElementById("form-admin-password");
const adminNewPassword = document.getElementById("admin-new-password");
const adminConfirmPassword = document.getElementById("admin-confirm-password");
const btnChangeAdminPassword = document.getElementById("btn-change-admin-password");

// Elementos do Modal de Pré-visualização de Fatura Oficial
const modalInvoicePreview = document.getElementById("modal-invoice-preview");
const previewInvoiceStatus = document.getElementById("preview-invoice-status");
const previewInvoiceNumber = document.getElementById("preview-invoice-number");
const previewInvoiceCustomerName = document.getElementById("preview-invoice-customer-name");
const previewInvoiceCustomerCode = document.getElementById("preview-invoice-customer-code");
const previewInvoiceCustomerContact = document.getElementById("preview-invoice-customer-contact");
const previewInvoiceIssueDate = document.getElementById("preview-invoice-issue-date");
const previewInvoiceDueDate = document.getElementById("preview-invoice-due-date");
const previewInvoiceMethod = document.getElementById("preview-invoice-method");
const previewInvoicePlanName = document.getElementById("preview-invoice-plan-name");
const previewInvoiceDuration = document.getElementById("preview-invoice-duration");
const previewInvoiceAmount = document.getElementById("preview-invoice-amount");
const previewInvoiceTotalHighlight = document.getElementById("preview-invoice-total-highlight");
const btnPrintInvoicePreview = document.getElementById("btn-print-invoice-preview");
const btnWaInvoicePreview = document.getElementById("btn-wa-invoice-preview");

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
const modalConfirmDeleteClient = document.getElementById("modal-confirm-delete-client");
const deleteClientId = document.getElementById("delete-client-id");
const deleteClientEmail = document.getElementById("delete-client-email");
const deleteClientName = document.getElementById("delete-client-name");
const deleteClientCode = document.getElementById("delete-client-code");
const deleteClientContact = document.getElementById("delete-client-contact");
const btnConfirmDeleteClient = document.getElementById("btn-confirm-delete-client");

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
let adminSyncUnsubscribe = null;

function initAuthGuard() {
  subscribeToAuthChanges(async ({ user, profile, isAdmin }) => {
    if (user && isAdmin) {
      // Utilizador é Administrador Autorizado
      currentAdmin = profile || { uid: user.uid, email: user.email, fullName: "Admin MEGASON", role: "admin" };
      
      if (guardContainer) guardContainer.style.display = "none";
      if (guardHeader) guardHeader.style.display = "none";
      if (guardMain) guardMain.style.display = "none";
      if (dashboardContainer) dashboardContainer.style.display = "flex";
      
      if (adminUserName) adminUserName.textContent = currentAdmin.fullName || currentAdmin.email || "Admin";
      if (adminUserProfileWidget) adminUserProfileWidget.style.display = "flex";

      closeAllModals();
      await loadDashboardData();

      // Ativa escuta em tempo real para o painel administrativo
      if (!adminSyncUnsubscribe) {
        adminSyncUnsubscribe = listenToAdminSubscriptions(async (event) => {
          await loadDashboardData();
          if (event && event.type === "order_created") {
            const customerName = event.payload?.customerName || "Cliente";
            showToast(`Novo comprovativo recebido de ${customerName}!`, "success");
          }
        });
      }
    } else {
      if (adminSyncUnsubscribe) {
        adminSyncUnsubscribe();
        adminSyncUnsubscribe = null;
      }

      if (user && !isAdmin) {
        // Utilizador autenticado mas NÃO é admin (Cliente comum)
        currentAdmin = null;
        if (dashboardContainer) dashboardContainer.style.display = "none";
        if (adminUserProfileWidget) adminUserProfileWidget.style.display = "none";
        if (guardHeader) guardHeader.style.display = "block";
        if (guardMain) guardMain.style.display = "block";
        if (guardContainer) guardContainer.style.display = "block";

        guardTitle.textContent = "Acesso Negado — Permissão Insuficiente";
        guardDescription.textContent = "A sua conta está autenticada como cliente, mas não possui permissões administrativas na MEGASON. Se precisa de acesso administrativo, contacte a equipa técnica.";
        guardIconBox.style.backgroundColor = "var(--color-danger-bg)";
        guardIconBox.style.color = "var(--color-danger-text)";
        btnOpenAdminLogin.style.display = "none";
      } else {
        // Não autenticado
        currentAdmin = null;
        if (dashboardContainer) dashboardContainer.style.display = "none";
        if (adminUserProfileWidget) adminUserProfileWidget.style.display = "none";
        if (guardHeader) guardHeader.style.display = "block";
        if (guardMain) guardMain.style.display = "block";
        if (guardContainer) guardContainer.style.display = "block";

        guardTitle.textContent = "Área Restrita — Autenticação Necessária";
        guardDescription.textContent = "Este painel é de acesso exclusivo para a equipa da MEGASON validar pagamentos e gerir acessos.";
        guardIconBox.style.backgroundColor = "var(--color-warning-bg)";
        guardIconBox.style.color = "var(--color-warning-text)";
        btnOpenAdminLogin.style.display = "inline-flex";
      }
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

  // Troca de Abas na Sidebar Lateral
  tabBtnDashboard?.addEventListener("click", () => switchTab("dashboard"));
  tabBtnCustomers?.addEventListener("click", () => switchTab("customers"));
  tabBtnSubscriptions?.addEventListener("click", () => switchTab("subscriptions"));
  tabBtnInvoices?.addEventListener("click", () => switchTab("invoices"));
  tabBtnPlans?.addEventListener("click", () => switchTab("plans"));
  tabBtnSettings?.addEventListener("click", () => switchTab("settings"));

  // Alternância e Colapso da Sidebar (Mobile Drawer & Desktop Collapse)
  btnToggleSidebar?.addEventListener("click", () => {
    if (window.innerWidth <= 960) {
      adminSidebar?.classList.toggle("open");
      sidebarBackdrop?.classList.toggle("active");
    } else {
      adminSidebar?.classList.toggle("collapsed");
      try {
        localStorage.setItem("megason_admin_sidebar_collapsed", adminSidebar?.classList.contains("collapsed") ? "true" : "false");
      } catch {}
    }
  });

  sidebarBackdrop?.addEventListener("click", () => {
    adminSidebar?.classList.remove("open");
    sidebarBackdrop?.classList.remove("active");
  });

  // Restaura estado de colapso no Desktop caso tenha sido previamente ativado
  try {
    if (window.innerWidth > 960 && localStorage.getItem("megason_admin_sidebar_collapsed") === "true") {
      adminSidebar?.classList.add("collapsed");
    }
  } catch {}

  // Atalho do Dashboard para ir a todos os pedidos
  btnDashViewAllOrders?.addEventListener("click", () => switchTab("subscriptions"));

  // Gestão de Configurações da Empresa
  formAdminSettings?.addEventListener("submit", handleSaveSettings);

  // Gestão do Perfil do Administrador
  formAdminProfile?.addEventListener("submit", handleSaveAdminProfile);
  formAdminPassword?.addEventListener("submit", handleChangeAdminPassword);

  // Impressão da Fatura Oficial
  btnPrintInvoicePreview?.addEventListener("click", () => {
    window.print();
  });

  // Gestão de Planos
  btnAdminOpenCreatePlan?.addEventListener("click", () => openCreatePlanModal());
  btnAdminSeedPlans?.addEventListener("click", () => handleSeedDefaultPlans());
  formAdminPlan?.addEventListener("submit", handleSavePlan);

  // Filtro de Busca de Subscrições
  adminSearchInput?.addEventListener("input", (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    renderSubscriptionsTable();
  });

  // Filtro de Busca de Clientes
  adminCustomersSearchInput?.addEventListener("input", (e) => {
    customersSearchQuery = e.target.value.toLowerCase().trim();
    renderCustomersTable();
  });

  adminCustomersStatusFilter?.addEventListener("change", (e) => {
    customersStatusFilter = e.target.value;
    renderCustomersTable();
  });

  // Formulário de Edição de Cliente
  formCustomerEdit?.addEventListener("submit", handleSaveCustomerEdit);

  // Formulário de Atribuição Direta de Pacote
  formAdminAssignPlan?.addEventListener("submit", handleAssignPlanToCustomer);

  // Botão na Ficha do Cliente para Atribuir/Renovar Pacote
  btnCustomerOpenAssignPlan?.addEventListener("click", () => {
    const customerId = customerEditId?.value;
    const customer = allCustomers.find(c => c.id === customerId);
    if (customer) {
      openAssignPlanModal(customer);
    }
  });

  // Filtro de Busca e Status de Faturas
  adminInvoicesSearchInput?.addEventListener("input", (e) => {
    invoicesSearchQuery = e.target.value.toLowerCase().trim();
    renderInvoicesTable();
  });

  adminInvoicesStatusFilter?.addEventListener("change", (e) => {
    invoicesStatusFilter = e.target.value;
    renderInvoicesTable();
  });

  // Filtro de Status de Subscrições
  adminStatusFilter?.addEventListener("change", (e) => {
    statusFilter = e.target.value;
    renderSubscriptionsTable();
  });

  // Confirmação de Eliminação em Cascata de Cliente
  btnConfirmDeleteClient?.addEventListener("click", handleConfirmDeleteClient);

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
    modalAdminPlanForm,
    modalConfirmDeleteClient,
    modalInvoicePreview,
    modalCustomerDetails,
    modalAdminAssignPlan
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
    const [metrics, subs, invs, plans, customers] = await Promise.all([
      getFinancialMetrics(),
      getAllSubscriptions("all"),
      getAllInvoices("all"),
      fetchDynamicPlans(),
      getAllCustomers()
    ]);

    allSubscriptions = subs;
    allInvoices = invs;
    allPlans = plans;
    allCustomers = customers;

    // Atualiza KPIs da Página Inicial
    if (kpiTotalReceived) kpiTotalReceived.textContent = `${metrics.totalReceived.toLocaleString("pt-MZ")} MT`;
    if (kpiTotalBilled) kpiTotalBilled.textContent = `${metrics.totalBilled.toLocaleString("pt-MZ")} MT`;
    if (kpiActiveSubscribers) kpiActiveSubscribers.textContent = metrics.activeSubscribers;
    if (kpiSuspendedSubscribers) kpiSuspendedSubscribers.textContent = metrics.suspendedOrders || 0;
    if (kpiTotalCustomers) kpiTotalCustomers.textContent = metrics.totalCustomers;
    if (kpiPendingOrders) kpiPendingOrders.textContent = metrics.pendingOrders;

    // Atualiza crachás da sidebar
    if (tabBadgePendingCount) {
      if (metrics.pendingOrders > 0) {
        tabBadgePendingCount.textContent = metrics.pendingOrders;
        tabBadgePendingCount.style.display = "inline-flex";
      } else {
        tabBadgePendingCount.style.display = "none";
      }
    }

    if (tabBadgeCustomersCount) {
      tabBadgeCustomersCount.textContent = metrics.totalCustomers;
    }

    populateAdminClientPlanOptions();
    await loadSettingsData();
    renderDashboardPendingOrders();
    renderActiveTab();
  } catch (err) {
    console.error("Falha ao carregar dados administrativos:", err);
    showToast("Erro ao carregar dados do sistema.", "danger");
  }
}

/**
 * Alterna entre abas da sidebar
 */
function switchTab(tabName) {
  activeTab = tabName;
  
  // Reseta classes ativas nos botões
  [tabBtnDashboard, tabBtnCustomers, tabBtnSubscriptions, tabBtnInvoices, tabBtnPlans, tabBtnSettings].forEach(btn => {
    btn?.classList.remove("active");
  });

  // Oculta todos os painéis de conteúdo
  [tabContentDashboard, tabContentCustomers, tabContentSubscriptions, tabContentInvoices, tabContentPlans, tabContentSettings].forEach(pane => {
    if (pane) pane.style.display = "none";
  });

  // Títulos descritivos por seção
  const tabTitles = {
    dashboard: "Visão Geral do Sistema",
    customers: "Gestão de Clientes",
    subscriptions: "Pedidos & Subscrições",
    invoices: "Faturas & Auditoria",
    plans: "Pacotes & Preços",
    settings: "Configurações do Sistema"
  };

  if (adminPageTitle) {
    adminPageTitle.textContent = tabTitles[tabName] || "Painel de Gestão";
  }

  // Ativa a aba selecionada
  if (tabName === "dashboard") {
    tabBtnDashboard?.classList.add("active");
    if (tabContentDashboard) tabContentDashboard.style.display = "block";
  } else if (tabName === "customers") {
    tabBtnCustomers?.classList.add("active");
    if (tabContentCustomers) tabContentCustomers.style.display = "block";
  } else if (tabName === "subscriptions") {
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

  // Fecha sidebar no mobile
  if (adminSidebar) adminSidebar.classList.remove("open");
  if (sidebarBackdrop) sidebarBackdrop.classList.remove("active");

  renderActiveTab();
}

/**
 * Renderiza a aba atualmente ativa
 */
function renderActiveTab() {
  if (activeTab === "dashboard") {
    renderDashboardPendingOrders();
  } else if (activeTab === "customers") {
    renderCustomersTable();
  } else if (activeTab === "subscriptions") {
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
 * Renderiza e preenche o formulário de configurações do sistema e perfil do admin
 */
function renderSettingsForm() {
  // Preenche dados do Perfil do Administrador
  if (currentAdmin) {
    if (adminProfileName) adminProfileName.value = currentAdmin.fullName || currentAdmin.displayName || "Admin MEGASON";
    if (adminProfileEmail) adminProfileEmail.value = currentAdmin.email || "comercial@admin-megason.site";
    if (adminProfileWhatsapp) adminProfileWhatsapp.value = currentAdmin.whatsappNumber || currentAdmin.phoneNumber || systemSettings.adminWhatsapp || "842256366";
    if (adminProfileTitle) adminProfileTitle.value = currentAdmin.roleTitle || currentAdmin.title || "Administrador Geral & Operações";
  }

  // Preenche dados da Empresa & Canais
  if (adminSettingEmail) adminSettingEmail.value = systemSettings.adminEmail || "comercial@admin-megason.site";
  if (adminSettingWhatsapp) adminSettingWhatsapp.value = systemSettings.adminWhatsapp || "842256366";
  if (adminSettingMpesaNumber) adminSettingMpesaNumber.value = systemSettings.mpesaNumber || "842256366";
  if (adminSettingMpesaHolder) adminSettingMpesaHolder.value = systemSettings.mpesaHolder || "FRANCISCO";
  if (adminSettingEmolaNumber) adminSettingEmolaNumber.value = systemSettings.emolaNumber || "861557953";
  if (adminSettingEmolaHolder) adminSettingEmolaHolder.value = systemSettings.emolaHolder || "FRANCISCO";
  if (adminSettingAbsaAccount) adminSettingAbsaAccount.value = systemSettings.absaAccount || "0708101028295";
  if (adminSettingAbsaNib) adminSettingAbsaNib.value = systemSettings.absaNib || "000207080810102829586";
  if (adminSettingAbsaHolder) adminSettingAbsaHolder.value = systemSettings.absaHolder || "MEGASON";

  // Preenche EmailJS
  if (adminSettingEmailjsService) adminSettingEmailjsService.value = systemSettings.emailjsServiceId || "";
  if (adminSettingEmailjsTemplate) adminSettingEmailjsTemplate.value = systemSettings.emailjsTemplateId || "";
  if (adminSettingEmailjsPublickey) adminSettingEmailjsPublickey.value = systemSettings.emailjsPublicKey || "";
}

/**
 * Salva os dados pessoais e profissionais do Administrador
 */
async function handleSaveAdminProfile(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("btn-save-admin-profile");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "A gravar perfil...";
  }

  try {
    const fullName = adminProfileName?.value.trim();
    const whatsappNumber = adminProfileWhatsapp?.value.trim();
    const roleTitle = adminProfileTitle?.value.trim();

    if (!fullName) throw new Error("Por favor, preencha o seu nome completo.");
    if (!whatsappNumber) throw new Error("Por favor, informe o seu número de WhatsApp.");

    const uid = currentAdmin ? (currentAdmin.uid || "admin") : "admin";
    const res = await updateAdminProfile(uid, {
      fullName,
      whatsappNumber,
      roleTitle
    });

    if (currentAdmin) {
      currentAdmin.fullName = res.fullName;
      currentAdmin.whatsappNumber = res.whatsappNumber;
      currentAdmin.roleTitle = res.roleTitle;
    }

    if (adminUserName) {
      adminUserName.textContent = res.fullName;
    }

    showToast("Perfil do administrador atualizado com sucesso!", "success");
  } catch (err) {
    showToast(err.message || "Erro ao atualizar perfil.", "danger");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gravar Meus Dados";
    }
  }
}

/**
 * Altera a senha de acesso do Administrador
 */
async function handleChangeAdminPassword(e) {
  e.preventDefault();
  const submitBtn = document.getElementById("btn-change-admin-password");
  const newPass = adminNewPassword?.value;
  const confPass = adminConfirmPassword?.value;

  if (!newPass || newPass.length < 6) {
    showToast("A nova senha deve ter no mínimo 6 caracteres.", "warning");
    return;
  }
  if (newPass !== confPass) {
    showToast("As senhas informadas não coincidem.", "warning");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "A atualizar senha...";
  }

  try {
    await changeAdminPassword(newPass);
    showToast("Senha administrativa alterada com sucesso!", "success");
    if (adminNewPassword) adminNewPassword.value = "";
    if (adminConfirmPassword) adminConfirmPassword.value = "";
  } catch (err) {
    showToast(err.message || "Erro ao alterar senha.", "danger");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Atualizar Minha Senha";
    }
  }
}

/**
 * Salva as configurações de notificação e pagamento no Firestore / settings/public
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
    const mpesaNumber = adminSettingMpesaNumber?.value.trim() || "842256366";
    const mpesaHolder = adminSettingMpesaHolder?.value.trim() || "FRANCISCO";
    const emolaNumber = adminSettingEmolaNumber?.value.trim() || "861557953";
    const emolaHolder = adminSettingEmolaHolder?.value.trim() || "FRANCISCO";
    const absaAccount = adminSettingAbsaAccount?.value.trim() || "0708101028295";
    const absaNib = adminSettingAbsaNib?.value.trim() || "000207080810102829586";
    const absaHolder = adminSettingAbsaHolder?.value.trim() || "MEGASON";

    const emailjsServiceId = adminSettingEmailjsService?.value.trim() || "";
    const emailjsTemplateId = adminSettingEmailjsTemplate?.value.trim() || "";
    const emailjsPublicKey = adminSettingEmailjsPublickey?.value.trim() || "";

    if (!adminEmail || !adminEmail.includes("@")) {
      throw new Error("Por favor, informe um endereço de e-mail válido.");
    }
    if (!adminWhatsapp || adminWhatsapp.length < 8) {
      throw new Error("Por favor, informe um número de telemóvel/WhatsApp válido.");
    }

    systemSettings = {
      adminEmail,
      adminWhatsapp,
      mpesaNumber,
      mpesaHolder,
      emolaNumber,
      emolaHolder,
      absaAccount,
      absaNib,
      absaHolder,
      emailjsServiceId,
      emailjsTemplateId,
      emailjsPublicKey
    };

    if (isFirebaseConfigured() && db) {
      const settingsRef = doc(db, "settings", "public");
      await setDoc(settingsRef, {
        ...systemSettings,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin ? currentAdmin.uid : "admin"
      }, { merge: true });
    }

    localStorage.setItem("megason_system_settings", JSON.stringify(systemSettings));
    showToast("Configurações da empresa gravadas com sucesso!", "success");
  } catch (err) {
    showToast(err.message || "Erro ao gravar configurações.", "danger");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Gravar Dados da Empresa";
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
        if (data.mpesaNumber) systemSettings.mpesaNumber = data.mpesaNumber;
        if (data.mpesaHolder) systemSettings.mpesaHolder = data.mpesaHolder;
        if (data.emolaNumber) systemSettings.emolaNumber = data.emolaNumber;
        if (data.emolaHolder) systemSettings.emolaHolder = data.emolaHolder;
        if (data.absaAccount) systemSettings.absaAccount = data.absaAccount;
        if (data.absaNib) systemSettings.absaNib = data.absaNib;
        if (data.absaHolder) systemSettings.absaHolder = data.absaHolder;
        if (data.emailjsServiceId) systemSettings.emailjsServiceId = data.emailjsServiceId;
        if (data.emailjsTemplateId) systemSettings.emailjsTemplateId = data.emailjsTemplateId;
        if (data.emailjsPublicKey) systemSettings.emailjsPublicKey = data.emailjsPublicKey;
      }
    } else {
      const stored = localStorage.getItem("megason_system_settings");
      if (stored) {
        systemSettings = Object.assign(systemSettings, JSON.parse(stored));
      }
    }

    // Carrega dados persistentes do perfil do admin local se existirem
    const storedAdminProfile = localStorage.getItem("megason_admin_profile");
    if (storedAdminProfile && currentAdmin) {
      try {
        const ap = JSON.parse(storedAdminProfile);
        currentAdmin.fullName = ap.fullName || currentAdmin.fullName;
        currentAdmin.whatsappNumber = ap.whatsappNumber || currentAdmin.whatsappNumber;
        currentAdmin.roleTitle = ap.roleTitle || currentAdmin.roleTitle;
        if (adminUserName) adminUserName.textContent = currentAdmin.fullName;
      } catch {}
    }

    renderSettingsForm();
  } catch (err) {
    console.warn("Aviso ao carregar configurações públicas:", err);
  }
}

/**
 * Renderiza os pedidos prioritários pendentes na Visão Geral (Dashboard)
 */
function renderDashboardPendingOrders() {
  if (!tbodyDashPendingOrders) return;

  const pendingList = allSubscriptions.filter(sub => sub.status === "pending");

  if (pendingList.length === 0) {
    tbodyDashPendingOrders.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: var(--space-4); color: var(--color-text-muted);">
          Nenhum pedido pendente de conferência no momento.
        </td>
      </tr>
    `;
    return;
  }

  tbodyDashPendingOrders.innerHTML = pendingList.map(sub => {
    const invoice = allInvoices.find(inv => inv.id === sub.latestInvoiceId) || null;
    const clientCodeDisplay = sub.clientCode || (sub.userId && sub.userId.startsWith("AI-") ? sub.userId : `AI-${sub.id.slice(0, 4).toUpperCase()}`);
    const method = invoice?.paymentMethod || "M-Pesa";

    return `
      <tr>
        <td>
          <strong style="display: block; font-size: var(--font-size-xs);">${sub.customerName || "Cliente"}</strong>
          <span style="font-family: monospace; font-size: 10px; color: var(--color-primary); font-weight: 700;">${clientCodeDisplay}</span>
        </td>
        <td style="font-size: var(--font-size-xs); font-weight: 500;">${sub.planName || "ChatGPT Plus"}</td>
        <td style="font-size: var(--font-size-xs); font-weight: 700; color: var(--color-text-primary);">${(sub.price || 0).toLocaleString("pt-MZ")} MT</td>
        <td>
          <span class="payment-pill" style="font-size: 10px; padding: 2px 6px;">${method}</span>
        </td>
        <td>
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-dash-view-proof" data-id="${sub.id}" style="font-size: 11px; padding: 3px 7px;" title="Ver SMS">
              SMS
            </button>
            <button class="btn btn-primary btn-sm btn-dash-approve" data-id="${sub.id}" data-invoice="${sub.latestInvoiceId || ''}" style="font-size: 11px; padding: 3px 7px;" title="Aprovar">
              Aprovar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // Eventos dos botões da tabela de pedidos da Visão Geral
  tbodyDashPendingOrders.querySelectorAll(".btn-dash-view-proof").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      openOrderDetailsModal(subId);
    });
  });

  tbodyDashPendingOrders.querySelectorAll(".btn-dash-approve").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      const invId = btn.getAttribute("data-invoice");
      openApproveModal(subId, invId);
    });
  });
}

/**
 * Renderiza a Tabela Completa de Clientes (7 Colunas Executivas)
 */
function renderCustomersTable() {
  if (!tbodyCustomers) return;

  const filtered = allCustomers.filter(customer => {
    // Filtro por Estado
    if (customersStatusFilter === "active") {
      if (!customer.activeSubscription || customer.activeSubscription.status !== "active") return false;
    } else if (customersStatusFilter === "none") {
      if (customer.activeSubscription) return false;
    } else if (customersStatusFilter === "expired") {
      if (!customer.activeSubscription || customer.activeSubscription.status === "active") return false;
    }

    if (!customersSearchQuery) return true;
    const name = (customer.fullName || customer.name || "").toLowerCase();
    const email = (customer.email || "").toLowerCase();
    const phone = (customer.whatsappNumber || customer.whatsapp || "").toLowerCase();
    const code = (customer.clientCode || customer.id || "").toLowerCase();
    const province = (customer.province || "").toLowerCase();
    const folder = (customer.folderName || (customer.activeSubscription && customer.activeSubscription.folderName) || "").toLowerCase();

    return name.includes(customersSearchQuery) ||
           email.includes(customersSearchQuery) ||
           phone.includes(customersSearchQuery) ||
           code.includes(customersSearchQuery) ||
           province.includes(customersSearchQuery) ||
           folder.includes(customersSearchQuery);
  });

  if (customersTotalLabel) {
    customersTotalLabel.textContent = `${filtered.length} cliente(s) registado(s)`;
  }

  if (filtered.length === 0) {
    tbodyCustomers.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; padding: var(--space-4); color: var(--color-text-muted);">
          Nenhum cliente cadastrado ou correspondente aos filtros aplicados.
        </td>
      </tr>
    `;
    return;
  }

  tbodyCustomers.innerHTML = filtered.map(customer => {
    const clientCodeDisplay = customer.clientCode || (customer.id && customer.id.startsWith("AI-") ? customer.id : "-");
    const nameDisplay = customer.fullName || customer.name || "Cliente";
    const phoneDisplay = customer.whatsappNumber || customer.whatsapp || "-";
    const emailDisplay = customer.email || "-";
    const provinceDisplay = customer.province || "Moçambique";
    const folderDisplay = customer.folderName || (customer.activeSubscription && customer.activeSubscription.folderName) || "Não atribuída";
    const createdAtDisplay = customer.createdAt ? formatDateOnly(customer.createdAt) : "-";

    // Subscrição Atual & Contagem Regressiva
    let planNameDisplay = "Nenhum";
    let statusBadge = `<span class="status-badge" style="background-color: var(--color-bg-subtle); color: var(--color-text-muted); font-size: 10px;">Sem Plano</span>`;
    let daysLeftDisplay = "-";
    let daysLeftColor = "var(--color-text-muted)";

    if (customer.activeSubscription) {
      const s = customer.activeSubscription;
      planNameDisplay = s.planName || "ChatGPT Plus";
      statusBadge = getStatusBadge(s.status);

      if (s.status === "active" && s.endDate) {
        const endMs = new Date(s.endDate).getTime();
        const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
        if (daysLeft > 0) {
          daysLeftDisplay = `${daysLeft} dia(s)`;
          daysLeftColor = daysLeft <= 7 ? "var(--color-danger)" : "var(--color-success)";
        } else {
          daysLeftDisplay = "Expira hoje";
          daysLeftColor = "var(--color-danger)";
        }
      } else if (s.status === "pending") {
        daysLeftDisplay = "Aguardando";
      } else if (s.status === "suspended") {
        daysLeftDisplay = "Suspenso";
        daysLeftColor = "var(--color-danger)";
      }
    }

    // Faturamento
    const totalPaid = customer.totalPaid || 0;
    const invCount = customer.invoicesCount || 0;

    return `
      <tr data-customer-id="${customer.id}">
        <td>
          <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--color-primary);">${clientCodeDisplay}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${nameDisplay}</strong>
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px;">${phoneDisplay}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${emailDisplay}</span>
        </td>
        <td>
          <span class="payment-pill" style="font-size: 10px; padding: 2px 6px;">${provinceDisplay}</span>
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px; font-weight: 600; color: var(--color-text-primary);">${folderDisplay}</span>
        </td>
        <td>
          <span style="font-size: 11px; font-weight: 500;">${planNameDisplay}</span>
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          <span style="font-size: 11px; font-weight: 600; color: ${daysLeftColor};">${daysLeftDisplay}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${totalPaid.toLocaleString("pt-MZ")} MT</strong>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${invCount}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-muted);">${createdAtDisplay}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-customer-details" data-id="${customer.id}" style="font-size: 11px; padding: 3px 8px;" title="Ver e Editar Ficha Completa">
              Ficha
            </button>
            <button class="btn btn-ghost btn-sm btn-customer-assign-plan" data-id="${customer.id}" style="font-size: 11px; padding: 3px 8px; color: var(--color-primary); border: 1px solid var(--color-border);" title="Atribuir ou Renovar Pacote">
              Plano
            </button>
            <button class="btn btn-secondary btn-sm btn-customer-wa" data-phone="${phoneDisplay}" data-name="${nameDisplay}" data-code="${clientCodeDisplay}" style="font-size: 11px; padding: 3px 8px;" title="Conversar no WhatsApp">
              WA
            </button>
            <button class="btn btn-ghost btn-sm btn-delete-customer" data-id="${customer.id}" data-email="${emailDisplay}" style="color: var(--color-danger); border: 1px solid var(--color-border-subtle); font-size: 11px; padding: 3px 8px;" title="Eliminar Cliente em Cascata">
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  attachCustomerRowActions();
}

/**
 * Conecta ações da tabela de clientes
 */
function attachCustomerRowActions() {
  if (!tbodyCustomers) return;

  // Botão Ficha Completa do Cliente
  tbodyCustomers.querySelectorAll(".btn-customer-details").forEach(btn => {
    btn.addEventListener("click", () => {
      const customerId = btn.getAttribute("data-id");
      const customer = allCustomers.find(c => c.id === customerId);
      if (customer) openCustomerDetailsModal(customer);
    });
  });

  // Botão Atribuir / Renovar Pacote
  tbodyCustomers.querySelectorAll(".btn-customer-assign-plan").forEach(btn => {
    btn.addEventListener("click", () => {
      const customerId = btn.getAttribute("data-id");
      const customer = allCustomers.find(c => c.id === customerId);
      if (customer) openAssignPlanModal(customer);
    });
  });

  // Botão WhatsApp do Cliente
  tbodyCustomers.querySelectorAll(".btn-customer-wa").forEach(btn => {
    btn.addEventListener("click", () => {
      const phone = btn.getAttribute("data-phone") || "";
      const name = btn.getAttribute("data-name") || "Cliente";
      const code = btn.getAttribute("data-code") || "";
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 9) cleanPhone = `258${cleanPhone}`;
      const msg = encodeURIComponent(`Olá, ${name} (${code})! Entramos em contacto pela equipa de suporte da MEGASON.`);
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
    });
  });

  // Botão Eliminar Cliente (em cascata)
  tbodyCustomers.querySelectorAll(".btn-delete-customer").forEach(btn => {
    btn.addEventListener("click", () => {
      const customerId = btn.getAttribute("data-id");
      const customerEmail = btn.getAttribute("data-email");
      const customer = allCustomers.find(c => c.id === customerId || c.email === customerEmail);
      if (customer) {
        openDeleteCustomerModal(customer);
      } else {
        openDeleteCustomerModal({ id: customerId, email: customerEmail, name: "Cliente" });
      }
    });
  });
}

/**
 * Abre o modal de eliminação em cascata com os dados do cliente
 */
function openDeleteCustomerModal(customer) {
  if (deleteClientId) deleteClientId.value = customer.id || "";
  if (deleteClientEmail) deleteClientEmail.value = customer.email || "";
  if (deleteClientName) deleteClientName.textContent = customer.fullName || customer.name || "Cliente";
  if (deleteClientCode) deleteClientCode.textContent = customer.clientCode || customer.id || "-";
  if (deleteClientContact) deleteClientContact.textContent = `${customer.whatsappNumber || customer.whatsapp || "-"} (${customer.email || "-"})`;

  openModal(modalConfirmDeleteClient);
}

/**
 * Abre o modal de Ficha Completa do Cliente com dados cadastrais, acesso e faturas
 */
function openCustomerDetailsModal(customer) {
  if (!customer) return;

  const clientCode = customer.clientCode || (customer.id && customer.id.startsWith("AI-") ? customer.id : "-");
  const name = customer.fullName || customer.name || "Cliente";
  const email = customer.email || "";
  const phone = customer.whatsappNumber || customer.whatsapp || "";
  const province = customer.province || "Maputo Cidade";
  const folder = customer.folderName || (customer.activeSubscription && customer.activeSubscription.folderName) || "";
  const creds = customer.accessCredentials || (customer.activeSubscription && customer.activeSubscription.accessCredentials) || "";
  const notes = customer.adminNotes || (customer.activeSubscription && customer.activeSubscription.adminNotes) || "";
  const createdAt = customer.createdAt ? formatDateOnly(customer.createdAt) : "-";

  if (customerViewCode) customerViewCode.textContent = clientCode;
  if (customerViewCreatedAt) customerViewCreatedAt.textContent = createdAt;
  if (customerViewStatusBadge) {
    if (customer.activeSubscription) {
      customerViewStatusBadge.innerHTML = getStatusBadge(customer.activeSubscription.status);
    } else {
      customerViewStatusBadge.innerHTML = `<span class="status-badge" style="background-color: var(--color-bg-subtle); color: var(--color-text-muted);">Sem Plano Ativo</span>`;
    }
  }

  // Preenche formulário cadastral
  if (customerEditId) customerEditId.value = customer.id || "";
  if (customerEditEmail) customerEditEmail.value = email;
  if (customerEditName) customerEditName.value = name;
  if (customerEditWhatsapp) customerEditWhatsapp.value = phone;
  if (customerEditProvince) customerEditProvince.value = province;
  if (customerEditFolder) customerEditFolder.value = folder;
  if (customerEditCredentials) customerEditCredentials.value = creds;
  if (customerEditNotes) customerEditNotes.value = notes;

  // Preenche Resumo da Subscrição
  if (customerSubPlanName && customerSubDates && customerSubCountdown) {
    if (customer.activeSubscription) {
      const s = customer.activeSubscription;
      customerSubPlanName.textContent = `${s.planName || "ChatGPT Plus"} (${(s.price || 0).toLocaleString("pt-MZ")} MT)`;
      const startStr = s.startDate ? formatDateOnly(s.startDate) : "-";
      const endStr = s.endDate ? formatDateOnly(s.endDate) : "-";
      customerSubDates.textContent = `Início: ${startStr} | Término: ${endStr}`;

      if (s.status === "active" && s.endDate) {
        const endMs = new Date(s.endDate).getTime();
        const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
        customerSubCountdown.textContent = daysLeft > 0 ? `${daysLeft} dia(s) restante(s)` : "Expira hoje";
        customerSubCountdown.style.color = daysLeft <= 7 ? "var(--color-danger)" : "var(--color-success)";
      } else {
        customerSubCountdown.textContent = s.status === "pending" ? "Pendente" : "Inativa";
        customerSubCountdown.style.color = "var(--color-text-secondary)";
      }
    } else {
      customerSubPlanName.textContent = "Nenhuma subscrição ativa";
      customerSubDates.textContent = "O cliente ainda não possui período de vigência ativo.";
      customerSubCountdown.textContent = "Sem plano";
      customerSubCountdown.style.color = "var(--color-text-muted)";
    }
  }

  // Preenche Histórico de Faturas do Cliente
  if (tbodyCustomerInvoices) {
    const custInvoices = allInvoices.filter(inv => {
      const matchId = customer.id && inv.userId === customer.id;
      const matchEmail = email && inv.customerEmail && inv.customerEmail.toLowerCase() === email.toLowerCase();
      return matchId || matchEmail;
    });

    if (custInvoices.length === 0) {
      tbodyCustomerInvoices.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: var(--space-3); color: var(--color-text-muted);">
            Nenhuma fatura registada para este cliente.
          </td>
        </tr>
      `;
    } else {
      tbodyCustomerInvoices.innerHTML = custInvoices.map(inv => {
        const invBadge = getInvoiceStatusBadge(inv.status);
        const invDate = inv.createdAt ? formatDateOnly(inv.createdAt) : "-";
        return `
          <tr style="border-bottom: 1px solid var(--color-border-subtle);">
            <td style="padding: 6px 8px; font-family: monospace; font-weight: 700; color: var(--color-primary);">${inv.invoiceNumber || inv.id}</td>
            <td style="padding: 6px 8px;">${inv.planName || "ChatGPT Plus"}</td>
            <td style="padding: 6px 8px; font-weight: 600;">${(inv.amount || 0).toLocaleString("pt-MZ")} MT</td>
            <td style="padding: 6px 8px;">${invBadge}</td>
            <td style="padding: 6px 8px; color: var(--color-text-secondary);">${invDate}</td>
            <td style="padding: 6px 8px; text-align: right;">
              <button type="button" class="btn btn-ghost btn-sm btn-view-cust-invoice" data-invoice-id="${inv.id}" style="font-size: 10px; padding: 2px 6px;">
                Recibo
              </button>
            </td>
          </tr>
        `;
      }).join("");

      tbodyCustomerInvoices.querySelectorAll(".btn-view-cust-invoice").forEach(b => {
        b.addEventListener("click", () => {
          const invId = b.getAttribute("data-invoice-id");
          const inv = allInvoices.find(i => i.id === invId);
          if (inv) openInvoicePreviewModal(inv);
        });
      });
    }
  }

  // Botão WhatsApp no rodapé da ficha
  if (btnCustomerModalWa) {
    btnCustomerModalWa.onclick = () => {
      let cleanPhone = phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 9) cleanPhone = `258${cleanPhone}`;
      const msg = encodeURIComponent(`Olá, ${name} (${clientCode})! Entramos em contacto pela equipa de suporte da MEGASON.`);
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, "_blank", "noopener,noreferrer");
    };
  }

  openModal(modalCustomerDetails);
}

/**
 * Salva as alterações cadastrais do cliente
 */
async function handleSaveCustomerEdit(e) {
  e.preventDefault();
  if (btnSaveCustomerEdit) {
    btnSaveCustomerEdit.disabled = true;
    btnSaveCustomerEdit.textContent = "A gravar alterações...";
  }

  try {
    const userId = customerEditId?.value;
    const customerEmail = customerEditEmail?.value;
    const fullName = customerEditName?.value.trim();
    const whatsappNumber = customerEditWhatsapp?.value.trim();
    const province = customerEditProvince?.value;
    const folderName = customerEditFolder?.value.trim();
    const accessCredentials = customerEditCredentials?.value.trim();
    const adminNotes = customerEditNotes?.value.trim();

    if (!fullName) throw new Error("O nome do cliente é obrigatório.");
    if (!whatsappNumber) throw new Error("O número de WhatsApp do cliente é obrigatório.");

    await adminUpdateCustomer({
      userId,
      customerEmail,
      fullName,
      whatsappNumber,
      province,
      folderName,
      accessCredentials,
      adminNotes
    });

    showToast("Dados cadastrais do cliente atualizados com sucesso!", "success");
    await loadDashboardData();
    closeModal(modalCustomerDetails);
  } catch (err) {
    showToast(err.message || "Erro ao atualizar cliente.", "danger");
  } finally {
    if (btnSaveCustomerEdit) {
      btnSaveCustomerEdit.disabled = false;
      btnSaveCustomerEdit.textContent = "Guardar Alterações Cadastrais";
    }
  }
}

/**
 * Abre o modal de atribuição rápida de plano para o cliente selecionado
 */
function openAssignPlanModal(customer) {
  if (!customer) return;

  const clientCode = customer.clientCode || (customer.id && customer.id.startsWith("AI-") ? customer.id : "-");
  const name = customer.fullName || customer.name || "Cliente";
  const email = customer.email || "";
  const phone = customer.whatsappNumber || customer.whatsapp || "";
  const defaultFolder = customer.folderName || `MEGASON - ${name.split(" ")[0]}`;
  const defaultCreds = customer.accessCredentials || "Instruções de acesso fornecidas pela administração.";

  if (assignPlanUserId) assignPlanUserId.value = customer.id || "";
  if (assignPlanEmail) assignPlanEmail.value = email;
  if (assignPlanCode) assignPlanCode.value = clientCode;
  if (assignPlanName) assignPlanName.value = name;
  if (assignPlanWhatsapp) assignPlanWhatsapp.value = phone;

  if (assignPlanDisplayName) assignPlanDisplayName.textContent = name;
  if (assignPlanDisplayCode) assignPlanDisplayCode.textContent = clientCode;
  if (assignPlanFolder) assignPlanFolder.value = defaultFolder;
  if (assignPlanCredentials) assignPlanCredentials.value = defaultCreds;
  if (assignPlanMarkPaid) assignPlanMarkPaid.checked = true;
  if (assignPlanNotes) assignPlanNotes.value = "";

  openModal(modalAdminAssignPlan);
}

/**
 * Atribui ou renova um pacote diretamente para o cliente
 */
async function handleAssignPlanToCustomer(e) {
  e.preventDefault();
  if (btnSubmitAssignPlan) {
    btnSubmitAssignPlan.disabled = true;
    btnSubmitAssignPlan.textContent = "A atribuir pacote...";
  }

  try {
    const userId = assignPlanUserId?.value;
    const customerEmail = assignPlanEmail?.value;
    const customerName = assignPlanName?.value;
    const customerWhatsapp = assignPlanWhatsapp?.value;
    const clientCode = assignPlanCode?.value;
    const planId = assignPlanSelect?.value;
    const folderName = assignPlanFolder?.value.trim();
    const accessCredentials = assignPlanCredentials?.value.trim();
    const markAsPaid = assignPlanMarkPaid ? assignPlanMarkPaid.checked : true;
    const adminNotes = assignPlanNotes?.value.trim() || "";
    const adminUid = currentAdmin ? (currentAdmin.uid || "admin") : "admin";

    const res = await adminAssignPlanToCustomer({
      userId,
      customerEmail,
      customerName,
      customerWhatsapp,
      clientCode,
      planId,
      folderName,
      accessCredentials,
      markAsPaid,
      adminNotes,
      adminUid
    });

    showToast(`Pacote atribuído com sucesso! Fatura gerada: ${res.invoice.invoiceNumber}`, "success");
    closeModal(modalAdminAssignPlan);
    closeModal(modalCustomerDetails);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Erro ao atribuir pacote.", "danger");
  } finally {
    if (btnSubmitAssignPlan) {
      btnSubmitAssignPlan.disabled = false;
      btnSubmitAssignPlan.textContent = "Atribuir & Ativar Pacote";
    }
  }
}

/**
 * Confirmação de exclusão em cascata do cliente
 */
async function handleConfirmDeleteClient() {
  const customerId = deleteClientId?.value;
  const customerEmail = deleteClientEmail?.value;

  if (!customerId && !customerEmail) {
    showToast("Identificador do cliente não encontrado.", "danger");
    return;
  }

  if (btnConfirmDeleteClient) {
    btnConfirmDeleteClient.disabled = true;
    btnConfirmDeleteClient.textContent = "A eliminar tudo...";
  }

  try {
    await deleteCustomerCascade({
      userId: customerId,
      customerEmail: customerEmail
    });

    showToast("Cliente, subscrições e faturas eliminados com sucesso!", "success");
    closeModal(modalConfirmDeleteClient);
    await loadDashboardData();
  } catch (err) {
    showToast(err.message || "Erro ao eliminar cliente.", "danger");
  } finally {
    if (btnConfirmDeleteClient) {
      btnConfirmDeleteClient.disabled = false;
      btnConfirmDeleteClient.textContent = "Sim, Eliminar Tudo Definitivamente";
    }
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

  if (subscriptionsTotalLabel) {
    subscriptionsTotalLabel.textContent = `${filtered.length} pedido(s) registado(s)`;
  }

  if (filtered.length === 0) {
    tbodySubscriptions.innerHTML = `
      <tr>
        <td colspan="13" style="text-align: center; padding: var(--space-4); color: var(--color-text-muted);">
          Nenhuma subscrição encontrada com os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbodySubscriptions.innerHTML = filtered.map(sub => {
    const statusBadge = getStatusBadge(sub.status);
    const invoice = allInvoices.find(inv => inv.id === sub.latestInvoiceId) || null;
    const clientCodeDisplay = sub.clientCode || (sub.userId && sub.userId.startsWith("AI-") ? sub.userId : `AI-${sub.id.slice(0, 4).toUpperCase()}`);
    const method = invoice?.paymentMethod || "M-Pesa";

    // Pílula Moçambicana do Método de Pagamento
    let methodBadgeClass = "payment-pill";
    const mLower = method.toLowerCase();
    if (mLower.includes("m-pesa") || mLower.includes("mpesa") || mLower.includes("vodacom")) methodBadgeClass += " payment-pill-mpesa";
    else if (mLower.includes("e-mola") || mLower.includes("emola") || mLower.includes("movitel")) methodBadgeClass += " payment-pill-emola";
    else if (mLower.includes("absa") || mLower.includes("banco")) methodBadgeClass += " payment-pill-absa";

    // Datas e Dias Restantes atômicos
    let startDateDisplay = sub.startDate ? formatDateOnly(sub.startDate) : "-";
    let endDateDisplay = sub.endDate ? formatDateOnly(sub.endDate) : "-";
    let daysLeftDisplay = "-";
    let daysLeftColor = "var(--color-text-muted)";

    if (sub.status === "active" && sub.endDate) {
      const endMs = new Date(sub.endDate).getTime();
      const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
      if (daysLeft > 0) {
        daysLeftDisplay = `${daysLeft} dia(s)`;
        daysLeftColor = daysLeft <= 7 ? "var(--color-danger)" : "var(--color-success)";
      } else {
        daysLeftDisplay = "Expira hoje";
        daysLeftColor = "var(--color-danger)";
      }
    } else if (sub.status === "pending") {
      daysLeftDisplay = `${sub.durationDays || 30} dias`;
    } else if (sub.status === "suspended") {
      daysLeftDisplay = "Suspenso";
      daysLeftColor = "var(--color-danger)";
    }

    return `
      <tr data-sub-id="${sub.id}">
        <td>
          <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--color-primary);">${clientCodeDisplay}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${sub.customerName || "Cliente"}</strong>
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px;">${sub.customerWhatsapp || "-"}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${sub.customerEmail || "-"}</span>
        </td>
        <td>
          <span style="font-size: 11px; font-weight: 500;">${sub.planName || "ChatGPT Plus"}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${(sub.price || 0).toLocaleString("pt-MZ")} MT</strong>
        </td>
        <td>
          <span class="${methodBadgeClass}" style="font-size: 10px; padding: 2px 7px;">${method}</span>
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px; font-weight: 600; color: var(--color-text-primary);">${sub.folderName || "Pendente"}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${startDateDisplay}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${endDateDisplay}</span>
        </td>
        <td>
          <span style="font-size: 11px; font-weight: 600; color: ${daysLeftColor};">${daysLeftDisplay}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-view-details" data-id="${sub.id}" style="font-size: 11px; padding: 3px 7px;" title="Ler Comprovativo SMS">
              SMS
            </button>
            ${sub.status === "pending" ? `
              <button class="btn btn-primary btn-sm btn-approve" data-id="${sub.id}" data-invoice="${sub.latestInvoiceId || ''}" style="font-size: 11px; padding: 3px 8px;" title="Aprovar e Ativar Pasta">
                Aprovar
              </button>
              <button class="btn btn-ghost btn-sm btn-cancel" data-id="${sub.id}" data-invoice="${sub.latestInvoiceId || ''}" style="color: var(--color-danger); border: 1px solid var(--color-border-subtle); font-size: 11px; padding: 3px 7px;" title="Rejeitar Pedido">
                Rejeitar
              </button>
            ` : ""}
            ${sub.status === "active" ? `
              <button class="btn btn-secondary btn-sm btn-sub-wa" data-id="${sub.id}" style="font-size: 11px; padding: 3px 7px;" title="Enviar Fatura por WhatsApp">
                WA
              </button>
              <button class="btn btn-ghost btn-sm btn-sub-email" data-id="${sub.id}" style="font-size: 11px; padding: 3px 7px;" title="Enviar Fatura por E-mail">
                Email
              </button>
              <button class="btn btn-ghost btn-sm btn-suspend" data-id="${sub.id}" style="color: #C2410C; font-size: 11px; padding: 3px 7px;" title="Suspender Acesso">
                Suspender
              </button>
            ` : ""}
            ${sub.status === "suspended" ? `
              <button class="btn btn-secondary btn-sm btn-reactivate" data-id="${sub.id}" style="font-size: 11px; padding: 3px 7px;" title="Reativar Acesso">
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

  // Enviar Lembrete / Fatura por WhatsApp
  document.querySelectorAll(".btn-sub-wa").forEach(btn => {
    btn.addEventListener("click", () => {
      const subId = btn.getAttribute("data-id");
      const sub = allSubscriptions.find(s => s.id === subId);
      if (!sub) return;

      const invoice = allInvoices.find(inv => inv.id === sub.latestInvoiceId) || {
        id: sub.latestInvoiceId || "FT2026AI001",
        amount: sub.price || 250
      };

      let daysLeft = null;
      let dueDateFormatted = "Conforme fatura";
      if (sub.endDate) {
        const endMs = new Date(sub.endDate).getTime();
        daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
        dueDateFormatted = formatDate(sub.endDate);
      }

      const clientCodeVal = sub.clientCode || (sub.userId && sub.userId.startsWith("AI-") ? sub.userId : `AI-${sub.id.slice(0, 4).toUpperCase()}`);
      const waUrl = buildWhatsAppInvoiceUrl({
        customerWhatsapp: sub.customerWhatsapp,
        customerName: sub.customerName,
        customerCode: clientCodeVal,
        invoiceId: invoice.id || invoice.invoiceNumber || "FT2026AI001",
        amount: invoice.amount || sub.price || 250,
        planName: sub.planName || "ChatGPT Plus",
        dueDate: dueDateFormatted,
        daysLeft
      });

      window.open(waUrl, "_blank", "noopener,noreferrer");
      showToast("Link de cobrança do WhatsApp aberto em nova aba!", "info");
    });
  });

  // Enviar Fatura por E-mail
  document.querySelectorAll(".btn-sub-email").forEach(btn => {
    btn.addEventListener("click", async () => {
      const subId = btn.getAttribute("data-id");
      const sub = allSubscriptions.find(s => s.id === subId);
      if (!sub) return;

      if (!sub.customerEmail || !sub.customerEmail.includes("@")) {
        showToast("Este cliente não possui um endereço de e-mail válido cadastrado.", "warning");
        return;
      }

      const invoice = allInvoices.find(inv => inv.id === sub.latestInvoiceId) || {
        id: sub.latestInvoiceId || "FT2026AI001",
        amount: sub.price || 250
      };

      let daysLeft = null;
      let dueDateFormatted = "Conforme fatura";
      if (sub.endDate) {
        const endMs = new Date(sub.endDate).getTime();
        daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
        dueDateFormatted = formatDate(sub.endDate);
      }

      try {
        btn.disabled = true;
        btn.textContent = "...";
        const clientCodeVal = sub.clientCode || (sub.userId && sub.userId.startsWith("AI-") ? sub.userId : `AI-${sub.id.slice(0, 4).toUpperCase()}`);
        const res = await sendInvoiceEmail({
          customerEmail: sub.customerEmail,
          customerName: sub.customerName,
          customerCode: clientCodeVal,
          invoiceId: invoice.id || invoice.invoiceNumber || "FT2026AI001",
          amount: invoice.amount || sub.price || 250,
          planName: sub.planName || "ChatGPT Plus",
          dueDate: dueDateFormatted,
          daysLeft
        });

        if (res.method === "emailjs") {
          showToast(`Fatura enviada com sucesso para ${sub.customerEmail}!`, "success");
        } else if (res.method === "mailto") {
          window.location.href = res.mailtoUrl;
          showToast(`Cliente de e-mail aberto para envio a ${sub.customerEmail}.`, "info");
        }
      } catch (err) {
        showToast(err.message || "Erro ao disparar e-mail.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Email";
      }
    });
  });
}

/**
 * Renderiza a Tabela de Faturas Financeiras
 */
function renderInvoicesTable() {
  if (!tbodyInvoices) return;

  const filtered = allInvoices.filter(inv => {
    // Filtro por status da fatura
    if (invoicesStatusFilter !== "all" && inv.status !== invoicesStatusFilter) {
      return false;
    }

    // Filtro por busca
    if (invoicesSearchQuery) {
      const name = (inv.customerName || "").toLowerCase();
      const email = (inv.customerEmail || "").toLowerCase();
      const phone = (inv.customerWhatsapp || "").toLowerCase();
      const id = (inv.id || "").toLowerCase();
      const subId = (inv.subscriptionId || "").toLowerCase();
      const invNum = (inv.invoiceNumber || "").toLowerCase();
      const clientCode = (inv.clientCode || "").toLowerCase();

      return name.includes(invoicesSearchQuery) ||
             email.includes(invoicesSearchQuery) ||
             phone.includes(invoicesSearchQuery) ||
             id.includes(invoicesSearchQuery) ||
             subId.includes(invoicesSearchQuery) ||
             invNum.includes(invoicesSearchQuery) ||
             clientCode.includes(invoicesSearchQuery);
    }
    return true;
  });

  if (invoicesTotalLabel) {
    invoicesTotalLabel.textContent = `${filtered.length} fatura(s) registada(s)`;
  }

  if (filtered.length === 0) {
    tbodyInvoices.innerHTML = `
      <tr>
        <td colspan="12" style="text-align: center; padding: var(--space-4); color: var(--color-text-muted);">
          Nenhuma fatura encontrada com os filtros selecionados.
        </td>
      </tr>
    `;
    return;
  }

  tbodyInvoices.innerHTML = filtered.map(inv => {
    const statusBadge = getInvoiceStatusBadge(inv.status);
    const associatedSub = allSubscriptions.find(s => s.id === inv.subscriptionId || s.latestInvoiceId === inv.id);
    const clientCode = inv.clientCode || (associatedSub ? associatedSub.clientCode : null) || (inv.userId && inv.userId.startsWith("AI-") ? inv.userId : "AI-CLIENTE");

    // Cores oficiais moçambicanas para o método de pagamento
    let methodBadgeClass = "payment-pill";
    const mLower = (inv.paymentMethod || "").toLowerCase();
    if (mLower.includes("m-pesa") || mLower.includes("mpesa") || mLower.includes("vodacom")) methodBadgeClass += " payment-pill-mpesa";
    else if (mLower.includes("e-mola") || mLower.includes("emola") || mLower.includes("movitel")) methodBadgeClass += " payment-pill-emola";
    else if (mLower.includes("absa") || mLower.includes("banco")) methodBadgeClass += " payment-pill-absa";

    const issueDateDisplay = formatDateOnly(inv.createdAt);
    const paidDateDisplay = inv.paidAt ? formatDateOnly(inv.paidAt) : (inv.status === "paid" ? issueDateDisplay : "-");

    return `
      <tr data-invoice-id="${inv.id}">
        <td>
          <span style="font-family: monospace; font-size: 11px; font-weight: 700; color: var(--color-primary);">${inv.invoiceNumber || inv.id}</span>
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px; font-weight: 600; color: var(--color-text-secondary);">${clientCode}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${inv.customerName || "Cliente"}</strong>
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px;">${inv.customerWhatsapp || "-"}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${inv.customerEmail || "-"}</span>
        </td>
        <td>
          <span style="font-size: 11px; font-weight: 500;">${inv.planName || "ChatGPT Plus"}</span>
        </td>
        <td>
          <strong style="font-size: var(--font-size-xs); color: var(--color-text-primary);">${(inv.amount || 0).toLocaleString("pt-MZ")} MT</strong>
        </td>
        <td>
          <span class="${methodBadgeClass}" style="font-size: 10px; padding: 2px 7px;">${inv.paymentMethod || "M-Pesa"}</span>
        </td>
        <td>
          ${statusBadge}
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${issueDateDisplay}</span>
        </td>
        <td>
          <span style="font-size: 11px; color: var(--color-text-secondary);">${paidDateDisplay}</span>
        </td>
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-inv-preview" data-id="${inv.id}" style="font-size: 11px; padding: 3px 7px;" title="Ver e Imprimir Recibo Oficial">
              Recibo
            </button>
            <button class="btn btn-primary btn-sm btn-inv-wa" data-id="${inv.id}" style="font-size: 11px; padding: 3px 7px;" title="Enviar Fatura via WhatsApp">
              WA
            </button>
            <button class="btn btn-ghost btn-sm btn-inv-email" data-id="${inv.id}" style="font-size: 11px; padding: 3px 7px;" title="Enviar Fatura via E-mail">
              Email
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
        <td style="text-align: right; white-space: nowrap;">
          <div style="display: inline-flex; gap: 4px;">
            <button class="btn btn-secondary btn-sm btn-inv-preview" data-inv-id="${inv.id}" title="Ver e Imprimir Espelho da Fatura">
              Recibo
            </button>
            <button class="btn btn-secondary btn-sm btn-inv-wa" data-inv-id="${inv.id}" title="Enviar cobrança oficial por WhatsApp">
              WA
            </button>
            <button class="btn btn-ghost btn-sm btn-inv-email" data-inv-id="${inv.id}" title="Enviar Fatura por E-mail">
              Email
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  attachInvoiceRowActions();
}

/**
 * Conecta os eventos dos botões de ação na tabela de faturas
 */
function attachInvoiceRowActions() {
  // Pré-visualização de Espelho da Fatura
  document.querySelectorAll(".btn-inv-preview").forEach(btn => {
    btn.addEventListener("click", () => {
      const invId = btn.getAttribute("data-inv-id");
      const inv = allInvoices.find(i => i.id === invId);
      if (inv) openInvoicePreviewModal(inv);
    });
  });

  // Envio por WhatsApp
  document.querySelectorAll(".btn-inv-wa").forEach(btn => {
    btn.addEventListener("click", () => {
      const invId = btn.getAttribute("data-inv-id");
      const inv = allInvoices.find(i => i.id === invId);
      if (!inv) return;

      const sub = allSubscriptions.find(s => s.id === inv.subscriptionId || s.latestInvoiceId === inv.id);
      let daysLeft = null;
      let dueDateFormatted = formatDateOnly(inv.createdAt);
      if (sub && sub.endDate) {
        const endMs = new Date(sub.endDate).getTime();
        daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
        dueDateFormatted = formatDateOnly(sub.endDate);
      }

      const clientCodeVal = inv.clientCode || (sub ? sub.clientCode : null) || (inv.userId && inv.userId.startsWith("AI-") ? inv.userId : "AI-CLIENTE");

      const waUrl = buildWhatsAppInvoiceUrl({
        customerWhatsapp: inv.customerWhatsapp,
        customerName: inv.customerName,
        customerCode: clientCodeVal,
        invoiceId: inv.invoiceNumber || inv.id,
        amount: inv.amount || 300,
        planName: inv.planName || "ChatGPT Plus",
        dueDate: dueDateFormatted,
        daysLeft
      });

      window.open(waUrl, "_blank", "noopener,noreferrer");
      showToast("Link de fatura comercial para WhatsApp aberto!", "info");
    });
  });

  // Envio por E-mail
  document.querySelectorAll(".btn-inv-email").forEach(btn => {
    btn.addEventListener("click", async () => {
      const invId = btn.getAttribute("data-inv-id");
      const inv = allInvoices.find(i => i.id === invId);
      if (!inv) return;

      if (!inv.customerEmail || !inv.customerEmail.includes("@")) {
        showToast("Esta fatura não possui endereço de e-mail associado.", "warning");
        return;
      }

      const sub = allSubscriptions.find(s => s.id === inv.subscriptionId || s.latestInvoiceId === inv.id);
      let daysLeft = null;
      let dueDateFormatted = formatDate(inv.createdAt);
      if (sub && sub.endDate) {
        const endMs = new Date(sub.endDate).getTime();
        daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / (1000 * 60 * 60 * 24)));
        dueDateFormatted = formatDate(sub.endDate);
      }

      const clientCodeVal = inv.clientCode || (sub ? sub.clientCode : null) || (inv.userId && inv.userId.startsWith("AI-") ? inv.userId : "AI-CLIENTE");

      try {
        btn.disabled = true;
        btn.textContent = "...";
        const res = await sendInvoiceEmail({
          customerEmail: inv.customerEmail,
          customerName: inv.customerName,
          customerCode: clientCodeVal,
          invoiceId: inv.invoiceNumber || inv.id,
          amount: inv.amount || 250,
          planName: inv.planName || "ChatGPT Plus",
          dueDate: dueDateFormatted,
          daysLeft
        });

        if (res.method === "emailjs") {
          showToast(`Fatura #${inv.invoiceNumber || inv.id} enviada para ${inv.customerEmail}!`, "success");
        } else if (res.method === "mailto") {
          window.location.href = res.mailtoUrl;
          showToast(`Cliente de e-mail aberto para envio a ${inv.customerEmail}.`, "info");
        }
      } catch (err) {
        showToast(err.message || "Erro ao disparar e-mail.", "danger");
      } finally {
        btn.disabled = false;
        btn.textContent = "Email";
      }
    });
  });
}

/**
 * Abre o modal de espelho visual oficial da fatura MEGASON
 */
function openInvoicePreviewModal(invoice) {
  if (!modalInvoicePreview || !invoice) return;

  const associatedSub = allSubscriptions.find(s => s.id === invoice.subscriptionId || s.latestInvoiceId === invoice.id);
  const clientCode = invoice.clientCode || (associatedSub ? associatedSub.clientCode : null) || (invoice.userId && invoice.userId.startsWith("AI-") ? invoice.userId : "AI-CLIENTE");

  if (previewInvoiceStatus) {
    const isPaid = invoice.status === "paid";
    previewInvoiceStatus.textContent = isPaid ? "PAGA" : (invoice.status === "cancelled" ? "CANCELADA" : "PENDENTE");
    previewInvoiceStatus.className = isPaid ? "status-badge status-badge-paid" : (invoice.status === "cancelled" ? "status-badge status-badge-cancelled" : "status-badge status-badge-pending");
  }

  if (previewInvoiceNumber) previewInvoiceNumber.textContent = invoice.invoiceNumber || invoice.id;
  if (previewInvoiceCustomerName) previewInvoiceCustomerName.textContent = invoice.customerName || "Cliente MEGASON";
  if (previewInvoiceCustomerCode) previewInvoiceCustomerCode.textContent = clientCode;
  if (previewInvoiceCustomerContact) previewInvoiceCustomerContact.textContent = `${invoice.customerWhatsapp || "-"} | ${invoice.customerEmail || "-"}`;
  if (previewInvoiceIssueDate) previewInvoiceIssueDate.textContent = formatDateOnly(invoice.createdAt);
  if (previewInvoiceDueDate) previewInvoiceDueDate.textContent = associatedSub?.endDate ? formatDateOnly(associatedSub.endDate) : "Imediato";
  if (previewInvoiceMethod) previewInvoiceMethod.textContent = invoice.paymentMethod || "M-Pesa";
  if (previewInvoicePlanName) previewInvoicePlanName.textContent = invoice.planName || "Subscrição ChatGPT Plus";
  if (previewInvoiceDuration) previewInvoiceDuration.textContent = `${associatedSub?.durationDays || 30} dias`;
  if (previewInvoiceAmount) previewInvoiceAmount.textContent = `${(invoice.amount || 300).toLocaleString("pt-MZ")} MT`;
  if (previewInvoiceTotalHighlight) previewInvoiceTotalHighlight.textContent = `${(invoice.amount || 300).toLocaleString("pt-MZ")} MT`;

  if (btnWaInvoicePreview) {
    btnWaInvoicePreview.onclick = () => {
      const waUrl = buildWhatsAppInvoiceUrl({
        customerWhatsapp: invoice.customerWhatsapp,
        customerName: invoice.customerName,
        customerCode: clientCode,
        invoiceId: invoice.invoiceNumber || invoice.id,
        amount: invoice.amount || 300,
        planName: invoice.planName || "ChatGPT Plus",
        dueDate: associatedSub?.endDate ? formatDateOnly(associatedSub.endDate) : "Apos Recepcao"
      });
      window.open(waUrl, "_blank", "noopener,noreferrer");
    };
  }

  openModal(modalInvoicePreview);
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

  const targetInvoiceId = invoiceId || sub.latestInvoiceId || "";
  const inv = allInvoices.find(i => (i.id === targetInvoiceId || i.invoiceNumber === targetInvoiceId)) || null;

  document.getElementById("approve-subscription-id").value = subscriptionId;
  document.getElementById("approve-invoice-id").value = targetInvoiceId;

  // Cálculo matemático rigoroso da vigência para visualização prévia
  const durationDaysToAdd = Number(inv?.durationDays || sub.durationDays || 30);
  const now = new Date();
  const dates = calculateSubscriptionDates({
    existingStartDate: sub.startDate,
    existingEndDate: sub.endDate,
    durationDays: durationDaysToAdd,
    now
  });

  const planSummaryEl = document.getElementById("approve-plan-summary");
  const dateCreatedEl = document.getElementById("approve-date-created");
  const dateApprovalEl = document.getElementById("approve-date-approval");
  const dateEndEl = document.getElementById("approve-date-end");
  const extensionNoteEl = document.getElementById("approve-extension-note");

  if (planSummaryEl) {
    const pName = inv?.planName || sub.planName || "ChatGPT Plus";
    const pPrice = inv?.amount || sub.price || 0;
    planSummaryEl.textContent = `${pName} (${pPrice} MT / ${durationDaysToAdd} Dias)`;
  }

  if (dateCreatedEl) {
    const rawCreated = inv?.createdAt || sub.createdAt;
    const dCreated = rawCreated?.toDate ? rawCreated.toDate() : (rawCreated ? new Date(rawCreated) : new Date());
    dateCreatedEl.textContent = dCreated.toLocaleString("pt-MZ");
  }

  if (dateApprovalEl) {
    dateApprovalEl.textContent = `${now.toLocaleDateString("pt-MZ")} às ${now.toLocaleTimeString("pt-MZ", { hour: "2-digit", minute: "2-digit" })}`;
  }

  if (dateEndEl) {
    const dEnd = new Date(dates.endDate);
    dateEndEl.textContent = `${dEnd.toLocaleDateString("pt-MZ")} (+${durationDaysToAdd} dias)`;
  }

  if (extensionNoteEl) {
    if (dates.isExtended) {
      extensionNoteEl.style.display = "block";
      const oldEndDate = new Date(sub.endDate).toLocaleDateString("pt-MZ");
      extensionNoteEl.innerHTML = `<strong>Extensão de Vigência:</strong> A subscrição anterior vencia em <strong>${oldEndDate}</strong>. Com a aprovação desta fatura de ${durationDaysToAdd} dias, a nova expiração foi ampliada para <strong>${new Date(dates.endDate).toLocaleDateString("pt-MZ")}</strong>.`;
    } else {
      extensionNoteEl.style.display = "none";
    }
  }

  // Sugestão de pasta padronizada MEGASON
  const cleanName = (sub.customerName || "Cliente").split(" ")[0];
  document.getElementById("approve-folder-name").value = sub.folderName || `MEGASON - ${cleanName} (${sub.id.slice(0, 4).toUpperCase()})`;

  document.getElementById("approve-credentials").value = sub.accessCredentials || `Acesso ChatGPT Plus:
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

    // Formata mensagem para WhatsApp pronta para copiar utilizando o padrão estruturado
    const planName = result.subscription.planName || "ChatGPT Plus";
    const planPrice = result.subscription.price || 0;
    const clientCode = result.user?.clientCode || "AI-Cliente";
    const invoiceNum = result.invoice?.invoiceNumber || result.invoice?.id;

    const whatsappMsg = formatWhatsAppWelcomeCredentialsText({
      fullName,
      clientCode,
      invoiceNumber: invoiceNum,
      planName,
      durationDays: result.subscription.durationDays || 30,
      price: planPrice,
      folderName: result.subscription.folderName || folderName,
      markAsPaid,
      accessCredentials,
      email,
      password
    });

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

/**
 * Formata apenas a data DD/MM/AAAA para exibição limpa sem horas redundantes
 */
function formatDateOnly(isoOrTimestamp) {
  if (!isoOrTimestamp) return "-";
  try {
    const d = isoOrTimestamp.toDate ? isoOrTimestamp.toDate() : new Date(isoOrTimestamp);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-MZ", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch {
    return "-";
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