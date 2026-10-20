/**
 * Plans Service — MEGASON (Desenvolvido por Zedecks IT)
 * Definição canónica dos 4 planos oficiais de subscrição do ChatGPT Plus.
 * REGRA: Todos os pacotes têm EXATAMENTE os mesmos recursos de IA.
 * O que varia é apenas o valor e o tempo de uso, com gatilhos mentais de poupança.
 */

export const SHARED_FEATURES = [
  "Modelos avançados de IA (GPT-6 Astra)",
  "Criação de textos, artigos e ideias (Básico)",
  "Geração e edição de imagens em alta resolução",
  "Envio e análise de documentos, PDFs e ficheiros",
  "Pesquisa na Internet aprofundada em tempo real",
  "Conversas fluidas por voz",
  "Pasta dedicada exclusiva e senhas de acesso"
];

export const OFFICIAL_PLANS = [
  {
    id: "plan-30d",
    name: "30 Dias",
    durationLabel: "30 Dias (1 Mês)",
    durationDays: 30,
    price: 300,
    currency: "MZN",
    featured: false,
    badge: null,
    savings: null,
    monthlyEquiv: "300 MT/mês",
    features: SHARED_FEATURES
  },
  {
    id: "plan-60d",
    name: "60 Dias",
    durationLabel: "60 Dias (2 Meses)",
    durationDays: 60,
    price: 550,
    currency: "MZN",
    featured: false,
    badge: "Poupa 50 MT",
    savings: "Poupa 50 MT",
    features: SHARED_FEATURES
  },
  {
    id: "plan-90d",
    name: "90 Dias",
    durationLabel: "90 Dias (3 Meses)",
    durationDays: 90,
    price: 800,
    currency: "MZN",
    featured: false,
    badge: "Poupa 100 MT",
    savings: "Poupa 100 MT",
    features: SHARED_FEATURES
  },
  {
    id: "plan-120d",
    name: "120 Dias",
    durationLabel: "120 Dias (4 Meses)",
    durationDays: 120,
    price: 1000,
    currency: "MZN",
    featured: true,
    badge: "Melhor Oferta • Poupa 200 MT",
    savings: "Poupa 200 MT",
    features: SHARED_FEATURES
  }
];

const SELECTED_PLAN_KEY = "megason_selected_plan_id";

/**
 * Obtém o snapshot canónico de um plano a partir do seu ID
 * @param {string} planId
 * @returns {object|null}
 */
export function getPlanById(planId) {
  return OFFICIAL_PLANS.find(p => p.id === planId) || null;
}

/**
 * Grava o plano selecionado em sessionStorage de forma segura
 * @param {string} planId
 */
export function setSelectedPlan(planId) {
  const plan = getPlanById(planId);
  if (plan) {
    sessionStorage.setItem(SELECTED_PLAN_KEY, plan.id);
  }
}

/**
 * Recupera o plano atualmente selecionado no fluxo de checkout
 * @returns {object}
 */
export function getSelectedPlan() {
  const storedId = sessionStorage.getItem(SELECTED_PLAN_KEY);
  if (storedId) {
    const plan = getPlanById(storedId);
    if (plan) return plan;
  }
  // Padrão: plano de 120 dias (destaque)
  return OFFICIAL_PLANS[3];
}
