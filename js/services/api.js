/**
 * Cliente REST API Oficial — MEGASON
 * Conecta o frontend moderno ao backend nativo PHP 8.x + MySQL no cPanel
 * Desenvolvido por Zedecks IT
 */

/**
 * Resolve dinamicamente a URL base da API PHP
 * Funciona transparentemente na raiz do domínio, em subpastas ou em ambiente local
 */
export function getApiBaseUrl() {
  if (typeof window === "undefined") return "/api";
  
  // Se houver override manual no localStorage
  const customBase = localStorage.getItem("megason_api_base_url");
  if (customBase) return customBase.replace(/\/+$/, "");

  // Detecta o caminho relativo da aplicação
  const pathname = window.location.pathname;
  let basePath = "";
  
  if (pathname.includes("/admin")) {
    basePath = pathname.substring(0, pathname.indexOf("/admin"));
  } else {
    // Remove o arquivo html se houver
    basePath = pathname.replace(/\/[^/]*\.(html|php)$/i, "");
  }
  
  basePath = basePath.replace(/\/+$/, "");
  return `${basePath}/api`;
}

/**
 * Cliente HTTP unificado para chamadas REST à API PHP
 * @param {string} endpoint Ex: 'auth.php', 'subscriptions.php'
 * @param {string} action Ex: 'login', 'list', 'approve'
 * @param {object} [options]
 * @param {string} [options.method='GET']
 * @param {object} [options.body=null]
 * @param {object} [options.params={}] Parâmetros de query string adicionais
 * @returns {Promise<any>}
 */
export async function apiFetch(endpoint, action = '', { method = 'GET', body = null, params = {} } = {}) {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}/${endpoint}`, window.location.origin);
  
  if (action) {
    url.searchParams.set('action', action);
  }
  
  if (params && typeof params === 'object') {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const token = localStorage.getItem("megason_auth_token") || "";

  const headers = {
    "Accept": "application/json"
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions = {
    method: method.toUpperCase(),
    headers
  };

  if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method)) {
    headers["Content-Type"] = "application/json";
    fetchOptions.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(url.toString(), fetchOptions);
    
    // Tenta interpretar como JSON
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Resposta inválida do servidor (${res.status}): ${text.substring(0, 120)}`);
    }

    if (!res.ok) {
      const errMsg = json?.error || `Erro de servidor HTTP ${res.status}`;
      throw new Error(errMsg);
    }

    return json;
  } catch (err) {
    // Propaga o erro mantendo a clareza
    throw err;
  }
}

/**
 * Módulo de Autenticação MySQL / PHP
 */
export const authApi = {
  login: (email, password) => apiFetch('auth.php', 'login', { method: 'POST', body: { email, password } }),
  register: (userData) => apiFetch('auth.php', 'register', { method: 'POST', body: userData }),
  me: (userId) => apiFetch('auth.php', 'me', { params: { userId } }),
  updateProfile: (userData) => apiFetch('auth.php', 'updateProfile', { method: 'POST', body: userData }),
  changePassword: (userId, currentPassword, newPassword) => 
    apiFetch('auth.php', 'changePassword', { method: 'POST', body: { userId, currentPassword, newPassword } })
};

/**
 * Módulo de Subscrições e Pedidos MySQL / PHP
 */
export const subscriptionsApi = {
  list: (params = {}) => apiFetch('subscriptions.php', 'list', { params }),
  create: (orderData) => apiFetch('subscriptions.php', 'create', { method: 'POST', body: orderData }),
  approve: (subscriptionId, confirmedBy = 'Admin MEGASON') => 
    apiFetch('subscriptions.php', 'approve', { method: 'POST', body: { subscriptionId, confirmedBy } }),
  suspend: (subscriptionId, reason = '') => 
    apiFetch('subscriptions.php', 'suspend', { method: 'POST', body: { subscriptionId, reason } }),
  reactivate: (subscriptionId) => 
    apiFetch('subscriptions.php', 'reactivate', { method: 'POST', body: { subscriptionId } }),
  cancel: (subscriptionId, reason = '') => 
    apiFetch('subscriptions.php', 'cancel', { method: 'POST', body: { subscriptionId, reason } }),
  assignPlan: (payload) => 
    apiFetch('subscriptions.php', 'assignPlan', { method: 'POST', body: payload }),
  metrics: () => apiFetch('subscriptions.php', 'metrics')
};

/**
 * Módulo de Faturas Oficiais FT[ANO]AIXXX MySQL / PHP
 */
export const invoicesApi = {
  list: (params = {}) => apiFetch('invoices.php', 'list', { params }),
  get: (id) => apiFetch('invoices.php', 'get', { params: { id } }),
  nextNumber: () => apiFetch('invoices.php', 'nextNumber')
};

/**
 * Módulo de Gestão de Clientes MySQL / PHP (com ON DELETE CASCADE)
 */
export const customersApi = {
  list: () => apiFetch('customers.php', 'list'),
  update: (userData) => apiFetch('customers.php', 'update', { method: 'POST', body: userData }),
  delete: (userId) => apiFetch('customers.php', 'delete', { method: 'POST', body: { userId } })
};

/**
 * Módulo de Planos Comerciais MySQL / PHP
 */
export const plansApi = {
  list: (includeAll = false) => apiFetch('plans.php', 'list', { params: { all: includeAll ? '1' : '0' } }),
  save: (planData) => apiFetch('plans.php', 'save', { method: 'POST', body: planData }),
  delete: (planId) => apiFetch('plans.php', 'delete', { method: 'POST', body: { id: planId } }),
  seed: () => apiFetch('plans.php', 'seed', { method: 'POST' })
};

/**
 * Módulo de Configurações do Sistema MySQL / PHP
 */
export const settingsApi = {
  get: () => apiFetch('settings.php', 'get'),
  save: (settingsData) => apiFetch('settings.php', 'save', { method: 'POST', body: settingsData })
};

/**
 * Testa se o backend PHP + MySQL está disponível no servidor
 * @returns {Promise<boolean>}
 */
export async function checkBackendAvailability() {
  try {
    const res = await apiFetch('plans.php', 'list');
    return Boolean(res && res.success);
  } catch {
    return false;
  }
}
