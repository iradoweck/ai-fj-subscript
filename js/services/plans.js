/**
 * Plans Service — MEGASON (Desenvolvido por Zedecks IT)
 * Definição canónica e gestão dinâmica dos planos de subscrição do ChatGPT Plus.
 * REGRA: Todos os pacotes têm EXATAMENTE os mesmos recursos de IA.
 * O que varia é apenas o valor e o tempo de uso, com gatilhos mentais de poupança.
 */

import {
  db,
  isFirebaseConfigured,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp
} from "./firebase.js";

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
let dynamicPlansCache = [...OFFICIAL_PLANS];

/**
 * Obtém os planos ativos da aplicação (do cache ou oficiais)
 * @returns {Array}
 */
export function getLoadedPlans() {
  return dynamicPlansCache.length > 0 ? dynamicPlansCache : OFFICIAL_PLANS;
}

/**
 * Carrega a lista dinâmica de planos do Firestore
 * Se a coleção 'plans' estiver vazia ou offline, retorna e preserva os planos oficiais canónicos.
 * @returns {Promise<Array>}
 */
export async function fetchDynamicPlans() {
  if (!isFirebaseConfigured() || !db) {
    return OFFICIAL_PLANS;
  }

  try {
    const plansColl = collection(db, "plans");
    const snapshot = await getDocs(plansColl);

    if (snapshot.empty) {
      dynamicPlansCache = [...OFFICIAL_PLANS];
      return dynamicPlansCache;
    }

    const fetchedPlans = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      fetchedPlans.push({
        id: docSnap.id,
        name: data.name || `${data.durationDays} Dias`,
        durationLabel: data.durationLabel || `${data.durationDays} Dias`,
        durationDays: Number(data.durationDays) || 30,
        price: Number(data.price) || 300,
        currency: data.currency || "MZN",
        featured: Boolean(data.featured),
        badge: data.badge || null,
        savings: data.savings || null,
        monthlyEquiv: data.monthlyEquiv || null,
        features: Array.isArray(data.features) && data.features.length > 0 ? data.features : SHARED_FEATURES
      });
    });

    // Ordena de forma crescente por duração em dias
    fetchedPlans.sort((a, b) => a.durationDays - b.durationDays);
    dynamicPlansCache = fetchedPlans;
    return dynamicPlansCache;
  } catch (err) {
    console.warn("Aviso ao buscar planos dinâmicos no Firestore, usando fallback canónico:", err);
    dynamicPlansCache = [...OFFICIAL_PLANS];
    return dynamicPlansCache;
  }
}

/**
 * Cria ou atualiza um plano no Firestore
 * @param {object} planData 
 * @returns {Promise<object>}
 */
export async function savePlanToFirestore(planData) {
  if (!isFirebaseConfigured() || !db) {
    throw new Error("A Central MEGASON Cloud não está conectada.");
  }

  const durationDays = parseInt(planData.durationDays, 10);
  const price = parseFloat(planData.price);

  if (isNaN(durationDays) || durationDays < 1) {
    throw new Error("A duração em dias deve ser um número positivo.");
  }
  if (isNaN(price) || price < 50) {
    throw new Error("O preço do plano deve ser de pelo menos 50 MT.");
  }

  const planId = planData.id 
    ? String(planData.id).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-") 
    : `plan-${durationDays}d`;

  const record = {
    name: planData.name ? String(planData.name).trim() : `${durationDays} Dias`,
    durationLabel: planData.durationLabel ? String(planData.durationLabel).trim() : `${durationDays} Dias`,
    durationDays,
    price,
    currency: "MZN",
    featured: Boolean(planData.featured),
    badge: planData.badge ? String(planData.badge).trim() : null,
    savings: planData.savings ? String(planData.savings).trim() : null,
    features: Array.isArray(planData.features) && planData.features.length > 0 ? planData.features : SHARED_FEATURES,
    updatedAt: serverTimestamp()
  };

  const planRef = doc(db, "plans", planId);
  await setDoc(planRef, record, { merge: true });

  await fetchDynamicPlans();
  return { id: planId, ...record };
}

/**
 * Remove um plano do Firestore
 * @param {string} planId 
 * @returns {Promise<boolean>}
 */
export async function deletePlanFromFirestore(planId) {
  if (!isFirebaseConfigured() || !db) {
    throw new Error("A Central MEGASON Cloud não está conectada.");
  }

  if (!planId) {
    throw new Error("ID do plano não informado.");
  }

  const planRef = doc(db, "plans", planId);
  await deleteDoc(planRef);

  await fetchDynamicPlans();
  return true;
}

/**
 * Sincroniza os 4 planos oficiais padrão para a base do Firestore caso o admin queira inicializar
 * @returns {Promise<void>}
 */
export async function seedOfficialPlansToFirestore() {
  if (!isFirebaseConfigured() || !db) {
    throw new Error("A Central MEGASON Cloud não está conectada.");
  }

  for (const plan of OFFICIAL_PLANS) {
    const planRef = doc(db, "plans", plan.id);
    await setDoc(planRef, {
      name: plan.name,
      durationLabel: plan.durationLabel,
      durationDays: plan.durationDays,
      price: plan.price,
      currency: plan.currency,
      featured: plan.featured,
      badge: plan.badge,
      savings: plan.savings,
      features: plan.features,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  await fetchDynamicPlans();
}

/**
 * Obtém o snapshot canónico de um plano a partir do seu ID
 * @param {string} planId
 * @returns {object|null}
 */
export function getPlanById(planId) {
  const currentList = getLoadedPlans();
  const found = currentList.find(p => p.id === planId);
  if (found) return found;
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
  const currentList = getLoadedPlans();
  const featured = currentList.find(p => p.featured);
  if (featured) return featured;
  return currentList[currentList.length - 1] || OFFICIAL_PLANS[3];
}
