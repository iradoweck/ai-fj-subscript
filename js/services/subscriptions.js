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

/**
 * Consulta todas as subscrições no sistema (Acesso restrito ao Administrador)
 * @param {string} [filterStatus] - Filtro opcional por status ('pending', 'active', etc.)
 * @returns {Promise<Array>}
 */
export async function getAllSubscriptions(filterStatus = "all") {
  if (isFirebaseConfigured() && db) {
    try {
      let q;
      if (filterStatus && filterStatus !== "all") {
        q = query(
          collection(db, "subscriptions"),
          where("status", "==", filterStatus),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "subscriptions"),
          orderBy("createdAt", "desc")
        );
      }
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => list.push(docSnap.data()));
      return list;
    } catch (err) {
      console.warn("Erro ao buscar subscrições no Firestore:", err);
    }
  }

  // Modo Demonstração
  const demoList = getMockData("megason_demo_subscriptions");
  if (filterStatus && filterStatus !== "all") {
    return demoList.filter(s => s.status === filterStatus);
  }
  return demoList;
}

/**
 * Consulta todas as faturas no sistema (Acesso restrito ao Administrador)
 * @param {string} [filterStatus] - Filtro opcional por status ('pending', 'paid', 'cancelled')
 * @returns {Promise<Array>}
 */
export async function getAllInvoices(filterStatus = "all") {
  if (isFirebaseConfigured() && db) {
    try {
      let q;
      if (filterStatus && filterStatus !== "all") {
        q = query(
          collection(db, "invoices"),
          where("status", "==", filterStatus),
          orderBy("createdAt", "desc")
        );
      } else {
        q = query(
          collection(db, "invoices"),
          orderBy("createdAt", "desc")
        );
      }
      const snapshot = await getDocs(q);
      const list = [];
      snapshot.forEach(docSnap => list.push(docSnap.data()));
      return list;
    } catch (err) {
      console.warn("Erro ao buscar faturas no Firestore:", err);
    }
  }

  // Modo Demonstração
  const demoList = getMockData("megason_demo_invoices");
  if (filterStatus && filterStatus !== "all") {
    return demoList.filter(inv => inv.status === filterStatus);
  }
  return demoList;
}

/**
 * Aprova o pagamento de uma subscrição pendente e entrega a pasta/credenciais do ChatGPT Plus
 * @param {object} params
 * @returns {Promise<boolean>}
 */
export async function approveSubscriptionOrder({
  subscriptionId,
  invoiceId,
  adminUid,
  folderName,
  accessCredentials,
  adminNotes
}) {
  if (!subscriptionId) throw new Error("ID da subscrição é obrigatório.");
  if (!folderName || folderName.trim().length === 0) {
    throw new Error("Por favor, informe o nome da pasta do ChatGPT Plus criada para o cliente.");
  }
  if (!accessCredentials || accessCredentials.trim().length === 0) {
    throw new Error("Por favor, informe os dados ou instruções de acesso da conta ChatGPT Plus.");
  }

  const sub = await getSubscriptionById(subscriptionId);
  if (!sub) throw new Error("Subscrição não encontrada.");

  const durationDays = sub.durationDays || 30;
  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "active",
      folderName: folderName.trim(),
      accessCredentials: accessCredentials.trim(),
      startDate,
      endDate,
      approvedBy: adminUid || "admin",
      approvedAt: serverTimestamp(),
      adminNotes: adminNotes ? adminNotes.trim() : null,
      updatedAt: serverTimestamp()
    });

    const targetInvoiceId = invoiceId || sub.latestInvoiceId;
    if (targetInvoiceId) {
      const invRef = doc(db, "invoices", targetInvoiceId);
      await updateDoc(invRef, {
        status: "paid",
        paidAt: serverTimestamp(),
        confirmedBy: adminUid || "admin",
        adminNotes: adminNotes ? adminNotes.trim() : null,
        updatedAt: serverTimestamp()
      });
    }

    return true;
  }

  // Modo Demonstração
  const subs = getMockData("megason_demo_subscriptions");
  const subIndex = subs.findIndex(s => s.id === subscriptionId);
  if (subIndex !== -1) {
    subs[subIndex] = {
      ...subs[subIndex],
      status: "active",
      folderName: folderName.trim(),
      accessCredentials: accessCredentials.trim(),
      startDate,
      endDate,
      approvedBy: adminUid || "admin_demo",
      approvedAt: now.toISOString(),
      adminNotes: adminNotes ? adminNotes.trim() : null
    };
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
  }

  const targetInvoiceId = invoiceId || (subs[subIndex] && subs[subIndex].latestInvoiceId);
  if (targetInvoiceId) {
    const invs = getMockData("megason_demo_invoices");
    const invIndex = invs.findIndex(inv => inv.id === targetInvoiceId);
    if (invIndex !== -1) {
      invs[invIndex] = {
        ...invs[invIndex],
        status: "paid",
        paidAt: now.toISOString(),
        confirmedBy: adminUid || "admin_demo",
        adminNotes: adminNotes ? adminNotes.trim() : null
      };
      localStorage.setItem("megason_demo_invoices", JSON.stringify(invs));
    }
  }

  return true;
}

/**
 * Suspende uma subscrição activa
 * @param {object} params
 * @returns {Promise<boolean>}
 */
export async function suspendSubscription({ subscriptionId, adminUid, reason }) {
  if (!subscriptionId) throw new Error("ID da subscrição é obrigatório.");
  if (!reason || reason.trim().length === 0) {
    throw new Error("Por favor, informe o motivo da suspensão.");
  }

  const now = new Date();

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "suspended",
      suspendedBy: adminUid || "admin",
      suspendedAt: serverTimestamp(),
      suspendReason: reason.trim(),
      updatedAt: serverTimestamp()
    });
    return true;
  }

  // Modo Demonstração
  const subs = getMockData("megason_demo_subscriptions");
  const idx = subs.findIndex(s => s.id === subscriptionId);
  if (idx !== -1) {
    subs[idx] = {
      ...subs[idx],
      status: "suspended",
      suspendedBy: adminUid || "admin_demo",
      suspendedAt: now.toISOString(),
      suspendReason: reason.trim()
    };
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
  }
  return true;
}

/**
 * Reativa uma subscrição que estava suspensa
 * @param {object} params
 * @returns {Promise<boolean>}
 */
export async function reactivateSubscription({ subscriptionId, adminUid }) {
  if (!subscriptionId) throw new Error("ID da subscrição é obrigatório.");

  const now = new Date();

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "active",
      reactivatedBy: adminUid || "admin",
      reactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return true;
  }

  // Modo Demonstração
  const subs = getMockData("megason_demo_subscriptions");
  const idx = subs.findIndex(s => s.id === subscriptionId);
  if (idx !== -1) {
    subs[idx] = {
      ...subs[idx],
      status: "active",
      reactivatedBy: adminUid || "admin_demo",
      reactivatedAt: now.toISOString()
    };
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
  }
  return true;
}

/**
 * Cancela/Rejeita um pedido de subscrição e invalida a fatura correspondente
 * @param {object} params
 * @returns {Promise<boolean>}
 */
export async function cancelSubscriptionOrder({ subscriptionId, invoiceId, adminUid, reason }) {
  if (!subscriptionId) throw new Error("ID da subscrição é obrigatório.");
  if (!reason || reason.trim().length === 0) {
    throw new Error("Por favor, informe a razão do cancelamento/rejeição.");
  }

  const now = new Date();

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "cancelled",
      cancelledBy: adminUid || "admin",
      cancelledAt: serverTimestamp(),
      cancelReason: reason.trim(),
      updatedAt: serverTimestamp()
    });

    if (invoiceId) {
      const invRef = doc(db, "invoices", invoiceId);
      await updateDoc(invRef, {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelledBy: adminUid || "admin",
        cancelReason: reason.trim(),
        updatedAt: serverTimestamp()
      });
    }
    return true;
  }

  // Modo Demonstração
  const subs = getMockData("megason_demo_subscriptions");
  const subIdx = subs.findIndex(s => s.id === subscriptionId);
  if (subIdx !== -1) {
    subs[subIdx] = {
      ...subs[subIdx],
      status: "cancelled",
      cancelledBy: adminUid || "admin_demo",
      cancelledAt: now.toISOString(),
      cancelReason: reason.trim()
    };
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
  }

  if (invoiceId) {
    const invs = getMockData("megason_demo_invoices");
    const invIdx = invs.findIndex(i => i.id === invoiceId);
    if (invIdx !== -1) {
      invs[invIdx] = {
        ...invs[invIdx],
        status: "cancelled",
        cancelledAt: now.toISOString(),
        cancelledBy: adminUid || "admin_demo",
        cancelReason: reason.trim()
      };
      localStorage.setItem("megason_demo_invoices", JSON.stringify(invs));
    }
  }

  return true;
}

/**
 * Calcula os indicadores financeiros e operacionais consolidados
 * @returns {Promise<object>}
 */
export async function getFinancialMetrics() {
  const [subscriptions, invoices] = await Promise.all([
    getAllSubscriptions("all"),
    getAllInvoices("all")
  ]);

  let totalReceived = 0;
  let totalBilled = 0;

  invoices.forEach(inv => {
    const amt = Number(inv.amount) || 0;
    if (inv.status === "paid") {
      totalReceived += amt;
      totalBilled += amt;
    } else if (inv.status === "pending") {
      totalBilled += amt;
    }
    // Faturas canceladas não entram no total faturado ou são desconsideradas
  });

  const activeSubscribers = subscriptions.filter(s => s.status === "active").length;
  const pendingOrders = subscriptions.filter(s => s.status === "pending").length;
  const suspendedOrders = subscriptions.filter(s => s.status === "suspended").length;

  return {
    totalReceived,
    totalBilled,
    activeSubscribers,
    pendingOrders,
    suspendedOrders,
    totalSubscriptions: subscriptions.length,
    totalInvoices: invoices.length
  };
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
