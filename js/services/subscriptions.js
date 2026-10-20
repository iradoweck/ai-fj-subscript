/**
 * Subscriptions & Invoices Service — MEGASON
 * Desenvolvido por Zedecks IT
 * Gerencia a criação de pedidos, faturas com comprovativo em texto e consulta de subscrições
 */

import { 
  db, 
  isFirebaseConfigured, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "./firebase.js";
import { getPlanById } from "./plans.js";

/**
 * Detecta o método de pagamento provável com base no texto do comprovativo SMS
 * @param {string} proofText 
 * @returns {string} "M-Pesa" | "E-Mola" | "Absa Bank" | "Outro"
 */
export function detectPaymentMethod(proofText) {
  if (!proofText) return "Outro";
  const lower = proofText.toLowerCase();

  if (lower.includes("mpesa") || lower.includes("m-pesa") || lower.includes("vodacom") || lower.includes("confirmado. transferiste")) {
    return "M-Pesa";
  }
  if (lower.includes("emola") || lower.includes("e-mola") || lower.includes("movitel") || lower.includes("confirmado")) {
    return "E-Mola";
  }
  if (lower.includes("absa") || lower.includes("banco") || lower.includes("conta")) {
    return "Absa Bank";
  }

  return "Outro";
}

/**
 * Cria uma nova subscrição pendente e a fatura com comprovativo em texto associada
 * @param {object} params
 * @returns {Promise<object>} { subscription, invoice }
 */
export async function createSubscriptionOrder({
  userId,
  planId,
  customerName,
  customerEmail,
  customerWhatsapp,
  proofText,
  paymentMethod
}) {
  if (!userId) throw new Error("ID do utilizador é obrigatório.");
  if (!proofText || proofText.trim().length < 5) {
    throw new Error("Comprovativo em texto inválido ou muito curto. Cole o SMS da transferência.");
  }

  const plan = getPlanById(planId);
  if (!plan) throw new Error("Plano selecionado não é válido.");

  const detectedMethod = paymentMethod || detectPaymentMethod(proofText);
  const now = new Date();

  // Se o Firebase estiver ativo, persiste nas coleções oficiais
  if (isFirebaseConfigured() && db) {
    // 1. Cria ID para a fatura e para a subscrição
    const subRef = doc(collection(db, "subscriptions"));
    const invRef = doc(collection(db, "invoices"));

    const invoiceData = {
      id: invRef.id,
      subscriptionId: subRef.id,
      userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerWhatsapp: customerWhatsapp.trim(),
      amount: plan.price,
      currency: "MZN",
      planId: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      status: "pending",
      proofText: proofText.trim(),
      paymentMethod: detectedMethod,
      adminNotes: null,
      paidAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const subscriptionData = {
      id: subRef.id,
      userId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerWhatsapp: customerWhatsapp.trim(),
      planId: plan.id,
      planName: plan.name,
      price: plan.price,
      currency: "MZN",
      durationDays: plan.durationDays,
      status: "pending",
      folderName: null,
      accessCredentials: null,
      startDate: null,
      endDate: null,
      latestInvoiceId: invRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Salva ambos os documentos
    await setDoc(invRef, invoiceData);
    await setDoc(subRef, subscriptionData);

    return {
      subscription: { ...subscriptionData, createdAt: now.toISOString() },
      invoice: { ...invoiceData, createdAt: now.toISOString() }
    };
  }

  // Modo Demonstração (Persistência Local no localStorage)
  const mockSubId = "sub_" + Date.now();
  const mockInvId = "inv_" + Date.now();

  const mockInvoice = {
    id: mockInvId,
    subscriptionId: mockSubId,
    userId,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerWhatsapp: customerWhatsapp.trim(),
    amount: plan.price,
    currency: "MZN",
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    status: "pending",
    proofText: proofText.trim(),
    paymentMethod: detectedMethod,
    adminNotes: null,
    paidAt: null,
    createdAt: now.toISOString(),
    isMock: true
  };

  const mockSubscription = {
    id: mockSubId,
    userId,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerWhatsapp: customerWhatsapp.trim(),
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    currency: "MZN",
    durationDays: plan.durationDays,
    status: "pending",
    folderName: null,
    accessCredentials: null,
    startDate: null,
    endDate: null,
    latestInvoiceId: mockInvId,
    createdAt: now.toISOString(),
    isMock: true
  };

  saveMockData("megason_demo_invoices", mockInvoice);
  saveMockData("megason_demo_subscriptions", mockSubscription);

  return {
    subscription: mockSubscription,
    invoice: mockInvoice
  };
}

/**
 * Consulta todas as subscrições pertencentes a um utilizador
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getUserSubscriptions(userId) {
  if (!userId) return [];

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, "subscriptions"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => list.push(docSnap.data()));
      return list;
    } catch (err) {
      console.warn("Erro ao buscar subscrições remotas:", err);
    }
  }

  // Modo Demonstração
  const demoList = getMockData("megason_demo_subscriptions");
  return demoList.filter(item => item.userId === userId);
}

/**
 * Consulta todas as faturas pertencentes a um utilizador
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function getUserInvoices(userId) {
  if (!userId) return [];

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, "invoices"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => list.push(docSnap.data()));
      return list;
    } catch (err) {
      console.warn("Erro ao buscar faturas remotas:", err);
    }
  }

  // Modo Demonstração
  const demoList = getMockData("megason_demo_invoices");
  return demoList.filter(item => item.userId === userId);
}

/**
 * Obtém os detalhes de uma subscrição por ID
 * @param {string} subscriptionId 
 * @returns {Promise<object|null>}
 */
export async function getSubscriptionById(subscriptionId) {
  if (!subscriptionId) return null;

  if (isFirebaseConfigured() && db) {
    const snap = await getDoc(doc(db, "subscriptions", subscriptionId));
    if (snap.exists()) return snap.data();
  }

  const demoList = getMockData("megason_demo_subscriptions");
  return demoList.find(s => s.id === subscriptionId) || null;
}

// Helpers para Modo Demonstração
function getMockData(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMockData(key, item) {
  try {
    const list = getMockData(key);
    list.unshift(item);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn("Falha ao salvar mock local:", err);
  }
}
