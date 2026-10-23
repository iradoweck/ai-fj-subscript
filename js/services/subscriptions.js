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
  deleteDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  onSnapshot 
} from "./firebase.js";
import { getPlanById } from "./plans.js";
import { generateCustomerCode } from "./auth.js";
import { subscriptionsApi, invoicesApi, customersApi, settingsApi } from "./api.js";

/**
 * Canal unificado de sincronização em tempo real (Reatividade bidirecional)
 * Permite que ações do cliente reflitam instantaneamente para o admin e vice-versa
 */
const syncChannel = (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined")
  ? new BroadcastChannel("megason_live_sync")
  : null;

/**
 * Dispara evento de sincronização para todas as abas e instâncias ativas
 * @param {string} eventType 
 * @param {object} payload 
 */
export function notifyStateChange(eventType, payload = {}) {
  const eventData = {
    type: eventType,
    payload,
    timestamp: Date.now()
  };

  try {
    if (syncChannel) {
      syncChannel.postMessage(eventData);
    }
  } catch (err) {
    console.warn("Falha no BroadcastChannel:", err);
  }

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("megason_live_sync_signal", JSON.stringify(eventData));
    }
  } catch {
    // ignora restrições de storage privado
  }

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("megason_live_sync", { detail: eventData }));
    }
  } catch {
    // ignora
  }
}

/**
 * Escuta eventos de sincronização em tempo real entre cliente e admin
 * @param {Function} callback 
 * @returns {Function} Função para desinscrever o listener
 */
export function onStateChange(callback) {
  if (typeof window === "undefined") return () => {};

  const handleMessage = (event) => {
    if (event && event.data) {
      callback(event.data);
    }
  };

  const handleStorage = (e) => {
    if (e.key === "megason_live_sync_signal" && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        callback(parsed);
      } catch {
        // ignora
      }
    }
  };

  const handleCustomEvent = (e) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  if (syncChannel) {
    syncChannel.addEventListener("message", handleMessage);
  }
  window.addEventListener("storage", handleStorage);
  window.addEventListener("megason_live_sync", handleCustomEvent);

  return () => {
    if (syncChannel) {
      syncChannel.removeEventListener("message", handleMessage);
    }
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("megason_live_sync", handleCustomEvent);
  };
}

/**
 * Matemática e Lógica de Vigência de Subscrições
 * Calcula rigorosamente as datas de início, aprovação e término:
 * - Se for nova subscrição ou já estiver expirada: inicia no momento da aprovação e dura durationDays.
 * - Se for renovação com dias restantes: preserva os dias restantes e estende a data de término somando durationDays ao término anterior.
 * 
 * @param {object} params
 * @param {string|null} params.existingStartDate
 * @param {string|null} params.existingEndDate
 * @param {number} params.durationDays
 * @param {Date} [params.now]
 * @returns {object} { startDate, endDate, durationDays, isExtended, approvedAt }
 */
export function calculateSubscriptionDates({
  existingStartDate = null,
  existingEndDate = null,
  durationDays = 30,
  now = new Date()
}) {
  const days = Math.max(1, Number(durationDays) || 30);
  const nowMs = now.getTime();
  const existingEndMs = existingEndDate ? new Date(existingEndDate).getTime() : 0;

  let startDate = existingStartDate;
  let endDate = null;
  let isExtended = false;

  // Se a subscrição já tinha um término válido no futuro (faltando dias para expirar)
  if (existingEndMs > nowMs) {
    // Preserva o início histórico
    startDate = existingStartDate || now.toISOString();
    // Aumenta a data de término somando o período contratado à data final atual
    const newEndMs = existingEndMs + (days * 24 * 60 * 60 * 1000);
    endDate = new Date(newEndMs).toISOString();
    isExtended = true;
  } else {
    // Nova ativação ou plano já vencido: vigência inicia no ato da aprovação
    startDate = now.toISOString();
    const newEndMs = nowMs + (days * 24 * 60 * 60 * 1000);
    endDate = new Date(newEndMs).toISOString();
    isExtended = false;
  }

  return {
    startDate,
    endDate,
    durationDays: days,
    isExtended,
    approvedAt: now.toISOString()
  };
}

/**
 * Gera o próximo número sequencial oficial de fatura no formato canónico FT[ANO]AIXXX (ex: FT2026AI028)
 * @returns {Promise<string>}
 */
export async function getNextInvoiceNumber() {
  const currentYear = new Date().getFullYear();
  const counterId = `invoices_${currentYear}`;

  if (isFirebaseConfigured() && db) {
    try {
      const counterRef = doc(db, "counters", counterId);
      const counterSnap = await getDoc(counterRef);
      let nextSeq = 1;

      if (counterSnap.exists()) {
        const data = counterSnap.data();
        nextSeq = (Number(data.lastSequence) || 0) + 1;
      } else {
        // Fallback: busca faturas existentes para determinar a contagem base
        try {
          const invSnap = await getDocs(collection(db, "invoices"));
          let count = 0;
          invSnap.forEach(d => {
            if (d.id.startsWith(`FT${currentYear}AI`)) count++;
          });
          nextSeq = count + 1;
        } catch {
          nextSeq = 1;
        }
      }

      // Atualiza o contador de faturas
      await setDoc(counterRef, {
        year: currentYear,
        lastSequence: nextSeq,
        updatedAt: serverTimestamp()
      }, { merge: true });

      const seqStr = String(nextSeq).padStart(3, "0");
      return `FT${currentYear}AI${seqStr}`;
    } catch (err) {
      console.warn("Erro ao obter contador de fatura no Firestore, usando fallback local:", err);
    }
  }

  // Fallback para modo demonstração / offline
  const storedCounterKey = `megason_invoice_seq_${currentYear}`;
  const stored = parseInt(localStorage.getItem(storedCounterKey) || "0", 10);
  const nextSeq = stored + 1;
  localStorage.setItem(storedCounterKey, String(nextSeq));
  const seqStr = String(nextSeq).padStart(3, "0");
  return `FT${currentYear}AI${seqStr}`;
}

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
 * Obtém os detalhes de uma fatura por ID
 * @param {string} invoiceId 
 * @returns {Promise<object|null>}
 */
export async function getInvoiceById(invoiceId) {
  if (!invoiceId) return null;
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(doc(db, "invoices", invoiceId));
      if (snap.exists()) return snap.data();
    } catch (err) {
      console.warn("Erro ao buscar fatura no Firestore:", err);
    }
  }
  const demoList = getMockData("megason_demo_invoices");
  return demoList.find(i => (i.id === invoiceId || i.invoiceNumber === invoiceId)) || null;
}

/**
 * Cria uma nova subscrição pendente ou associa fatura de renovação/upgrade à subscrição existente
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

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.create({
      userId,
      planId,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerWhatsapp: customerWhatsapp.trim(),
      proofText: proofText.trim(),
      paymentMethod: detectedMethod
    });

    if (res && res.success && res.order) {
      notifyStateChange("order_created", {
        userId,
        subscriptionId: res.order.subscription?.id,
        invoiceId: res.order.invoice?.id,
        customerName: customerName.trim(),
        planName: plan.name
      });
      return {
        subscription: res.order.subscription,
        invoice: res.order.invoice
      };
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

  // Se o Firebase estiver ativo, persiste nas coleções oficiais
  if (isFirebaseConfigured() && db) {
    const invoiceId = await getNextInvoiceNumber();

    // Verifica se o utilizador já tem subscrição anterior
    let existingSub = null;
    try {
      const existingSubs = await getUserSubscriptions(userId);
      if (existingSubs && existingSubs.length > 0) {
        existingSub = existingSubs[0];
      }
    } catch (e) {
      console.warn("Aviso ao verificar subscrição existente:", e);
    }

    const subId = existingSub ? existingSub.id : doc(collection(db, "subscriptions")).id;
    const invRef = doc(db, "invoices", invoiceId);
    const subRef = doc(db, "subscriptions", subId);

    const invoiceData = {
      id: invoiceId,
      invoiceNumber: invoiceId,
      subscriptionId: subId,
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

    let subscriptionData;
    if (existingSub) {
      // Renovação / Mudança de Plano sobre a subscrição existente
      subscriptionData = {
        ...existingSub,
        latestInvoiceId: invoiceId,
        pendingRenewal: {
          invoiceId,
          planId: plan.id,
          planName: plan.name,
          durationDays: plan.durationDays,
          price: plan.price,
          requestedAt: now.toISOString()
        },
        updatedAt: serverTimestamp()
      };
      await updateDoc(subRef, {
        latestInvoiceId: invoiceId,
        pendingRenewal: subscriptionData.pendingRenewal,
        updatedAt: serverTimestamp()
      });
    } else {
      // Primeira subscrição do utilizador
      subscriptionData = {
        id: subId,
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
        approvedAt: null,
        latestInvoiceId: invoiceId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await setDoc(subRef, subscriptionData);
    }

    await setDoc(invRef, invoiceData);

    // Notifica em tempo real que um novo pedido/renovação foi submetido
    notifyStateChange("order_created", {
      userId,
      subscriptionId: subId,
      invoiceId,
      customerName: customerName.trim(),
      planName: plan.name
    });

    return {
      subscription: { ...subscriptionData, createdAt: now.toISOString() },
      invoice: { ...invoiceData, createdAt: now.toISOString() }
    };
  }

  // Modo Demonstração (Persistência Local no localStorage)
  const demoSubs = getMockData("megason_demo_subscriptions");
  let mockExistingSub = demoSubs.find(s => s.userId === userId) || null;
  const mockInvId = await getNextInvoiceNumber();
  const mockSubId = mockExistingSub ? mockExistingSub.id : ("sub_" + Date.now());

  const mockInvoice = {
    id: mockInvId,
    invoiceNumber: mockInvId,
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

  let mockSubscription;
  if (mockExistingSub) {
    mockExistingSub.latestInvoiceId = mockInvId;
    mockExistingSub.pendingRenewal = {
      invoiceId: mockInvId,
      planId: plan.id,
      planName: plan.name,
      durationDays: plan.durationDays,
      price: plan.price,
      requestedAt: now.toISOString()
    };
    mockSubscription = mockExistingSub;
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(demoSubs));
  } else {
    mockSubscription = {
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
      approvedAt: null,
      latestInvoiceId: mockInvId,
      createdAt: now.toISOString(),
      isMock: true
    };
    saveMockData("megason_demo_subscriptions", mockSubscription);
  }

  saveMockData("megason_demo_invoices", mockInvoice);

  notifyStateChange("order_created", {
    userId,
    subscriptionId: mockSubId,
    invoiceId: mockInvId,
    customerName: customerName.trim(),
    planName: plan.name
  });

  return {
    subscription: mockSubscription,
    invoice: mockInvoice
  };
}

/**
 * Consulta todas as subscrições pertencentes a um utilizador (Prioriza as Ativas e busca por userId ou Email)
 * @param {string} userId 
 * @param {string} [userEmail]
 * @returns {Promise<Array>}
 */
export async function getUserSubscriptions(userId, userEmail = null) {
  if (!userId && !userEmail) return [];

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.list({ userId, email: userEmail });
    if (res && res.success && Array.isArray(res.subscriptions)) {
      return res.subscriptions;
    }
  } catch (apiErr) {
    // Silencioso se offline, segue para Firestore/Mock
  }

  const subMap = new Map();

  const sortPriority = (list) => {
    return list.sort((a, b) => {
      // 1. Subscrições ativas vêm primeiro
      if (a.status === "active" && b.status !== "active") return -1;
      if (b.status === "active" && a.status !== "active") return 1;

      // 2. Data de criação decrescente
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  };

  if (isFirebaseConfigured() && db) {
    try {
      if (userId) {
        try {
          const q = query(collection(db, "subscriptions"), where("userId", "==", userId));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => subMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        } catch (e) {
          console.warn("Aviso ao buscar subscrições por userId:", e);
        }
      }

      if (userEmail) {
        try {
          const cleanEmail = userEmail.trim().toLowerCase();
          const qEmail = query(collection(db, "subscriptions"), where("customerEmail", "==", cleanEmail));
          const snapshotEmail = await getDocs(qEmail);
          snapshotEmail.forEach(docSnap => {
            const data = docSnap.data();
            subMap.set(docSnap.id, { id: docSnap.id, ...data });
            if (userId && data.userId !== userId) {
              try { updateDoc(doc(db, "subscriptions", docSnap.id), { userId }); } catch {}
            }
          });
        } catch (e) {
          console.warn("Aviso ao buscar subscrições por email:", e);
        }
      }

      const list = Array.from(subMap.values());
      return sortPriority(list);
    } catch (err) {
      console.warn("Erro ao buscar subscrições remotas:", err);
    }
  }

  // Modo Demonstração
  const demoList = getMockData("megason_demo_subscriptions");
  const filtered = demoList.filter(item => {
    const matchId = userId && item.userId === userId;
    const matchEmail = userEmail && item.customerEmail && item.customerEmail.toLowerCase() === userEmail.toLowerCase();
    return matchId || matchEmail;
  });
  return sortPriority(filtered);
}

/**
 * Consulta todas as faturas pertencentes a um utilizador (Sem dependência de índice composto, busca por userId ou Email)
 * @param {string} userId 
 * @param {string} [userEmail]
 * @returns {Promise<Array>}
 */
export async function getUserInvoices(userId, userEmail = null) {
  if (!userId && !userEmail) return [];

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await invoicesApi.list({ userId, email: userEmail });
    if (res && res.success && Array.isArray(res.invoices)) {
      return res.invoices;
    }
  } catch (apiErr) {
    // Silencioso se offline, segue para Firestore/Mock
  }

  const invoiceMap = new Map();

  const sortInvoices = (list) => {
    return list.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
      return dateB - dateA;
    });
  };

  if (isFirebaseConfigured() && db) {
    try {
      if (userId) {
        try {
          const q = query(collection(db, "invoices"), where("userId", "==", userId));
          const snapshot = await getDocs(q);
          snapshot.forEach(docSnap => invoiceMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() }));
        } catch (e) {
          console.warn("Aviso ao buscar faturas por userId:", e);
        }
      }

      if (userEmail) {
        try {
          const cleanEmail = userEmail.trim().toLowerCase();
          const qEmail = query(collection(db, "invoices"), where("customerEmail", "==", cleanEmail));
          const snapshotEmail = await getDocs(qEmail);
          snapshotEmail.forEach(docSnap => {
            const data = docSnap.data();
            invoiceMap.set(docSnap.id, { id: docSnap.id, ...data });
            if (userId && data.userId !== userId) {
              try { updateDoc(doc(db, "invoices", docSnap.id), { userId }); } catch {}
            }
          });
        } catch (e) {
          console.warn("Aviso ao buscar faturas por email:", e);
        }
      }

      const list = Array.from(invoiceMap.values());
      return sortInvoices(list);
    } catch (err) {
      console.warn("Erro ao buscar faturas remotas:", err);
    }
  }

  // Modo Demonstração
  const demoList = getMockData("megason_demo_invoices");
  const filtered = demoList.filter(item => {
    const matchId = userId && item.userId === userId;
    const matchEmail = userEmail && item.customerEmail && item.customerEmail.toLowerCase() === userEmail.toLowerCase();
    return matchId || matchEmail;
  });
  return sortInvoices(filtered);
}

/**
 * Obtém os detalhes de uma subscrição por ID
 * @param {string} subscriptionId 
 * @returns {Promise<object|null>}
 */
/**
 * Localiza um pedido ou comprovativo recente através do Email ou Número de WhatsApp
 * Usado para permitir ao cliente finalizar/vincular a sua conta caso já tenha submetido comprovativo
 * @param {string} contact - Email ou número de WhatsApp
 * @returns {Promise<object|null>} Retorna { subscription, invoice } ou null
 */
export async function findOrderByContact(contact) {
  if (!contact) return null;
  const cleanContact = contact.trim().toLowerCase();
  const digitsOnly = contact.replace(/\D/g, "");

  if (isFirebaseConfigured() && db) {
    try {
      // 1. Tenta buscar por email nas faturas
      let q = query(
        collection(db, "invoices"),
        where("customerEmail", "==", cleanContact),
        orderBy("createdAt", "desc")
      );
      let snapshot = await getDocs(q);
      
      // 2. Se não encontrou por email, tenta por WhatsApp
      if (snapshot.empty && digitsOnly.length >= 8) {
        q = query(
          collection(db, "invoices"),
          where("customerWhatsapp", ">=", digitsOnly.slice(-9)),
          orderBy("customerWhatsapp"),
          orderBy("createdAt", "desc")
        );
        snapshot = await getDocs(q);
      }

      if (!snapshot.empty) {
        const invoice = snapshot.docs[0].data();
        let subscription = null;
        if (invoice.subscriptionId) {
          const subSnap = await getDoc(doc(db, "subscriptions", invoice.subscriptionId));
          if (subSnap.exists()) subscription = subSnap.data();
        }
        return { invoice, subscription };
      }
    } catch (err) {
      console.warn("Erro ao buscar pedido por contacto no Firestore:", err);
    }
  }

  // Modo Demonstração
  const demoInvoices = getMockData("megason_demo_invoices");
  const invoice = demoInvoices.find(inv => {
    const emailMatch = inv.customerEmail && inv.customerEmail.toLowerCase() === cleanContact;
    const phoneMatch = inv.customerWhatsapp && inv.customerWhatsapp.replace(/\D/g, "").includes(digitsOnly.slice(-8));
    return emailMatch || phoneMatch;
  });

  if (invoice) {
    const demoSubs = getMockData("megason_demo_subscriptions");
    const subscription = demoSubs.find(s => s.id === invoice.subscriptionId) || null;
    return { invoice, subscription };
  }

  return null;
}

/**
 * Criação Administrativa de Cliente com Atribuição Direta de Plano/Pacote
 * Permite ao Administrador cadastrar manualmente um utilizador e liberar acesso imediato
 * @param {object} params
 * @returns {Promise<object>} Retorna { user, subscription, invoice }
 */
export async function adminCreateCustomerWithSubscription({
  fullName,
  email,
  password,
  whatsappNumber,
  province,
  district = "",
  neighborhood = "",
  planId,
  folderName,
  accessCredentials,
  paymentMethod = "M-Pesa",
  markAsPaid = true,
  adminNotes = "",
  adminUid = "admin"
}) {
  if (!fullName || fullName.trim().length === 0) throw new Error("Nome do cliente é obrigatório.");
  if (!email || email.trim().length === 0) throw new Error("Email é obrigatório.");
  if (!password || password.length < 6) throw new Error("A senha inicial deve ter no mínimo 6 caracteres.");
  if (!whatsappNumber || whatsappNumber.trim().length === 0) throw new Error("WhatsApp é obrigatório.");

  const plan = getPlanById(planId);
  if (!plan) throw new Error("Plano selecionado não é válido.");

  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const targetFolder = folderName ? folderName.trim() : `MEGASON - ${fullName.split(" ")[0]}`;
  const targetCreds = accessCredentials ? accessCredentials.trim() : "Instruções de acesso fornecidas pela administração.";

  let userId = "usr_" + Date.now();

  if (isFirebaseConfigured() && db) {
    // 1. Cria utilizador no Auth de forma isolada se possível ou gera ID de cliente
    try {
      const userRef = doc(collection(db, "users"));
      userId = userRef.id;
      const clientCode = generateCustomerCode();

      const profileData = {
        uid: userId,
        clientCode,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        whatsappNumber: whatsappNumber.trim(),
        province: province || "Maputo Cidade",
        district: district.trim(),
        neighborhood: neighborhood.trim(),
        username: email.split("@")[0].toLowerCase(),
        role: "customer",
        isHumanVerified: true,
        createdByAdmin: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(userRef, profileData);

      // 2. Cria subscrição e fatura sequencial canónica FT[ANO]AIXXX
      const subRef = doc(collection(db, "subscriptions"));
      const invoiceId = await getNextInvoiceNumber();
      const invRef = doc(db, "invoices", invoiceId);

      const subData = {
        id: subRef.id,
        userId,
        customerName: fullName.trim(),
        customerEmail: email.trim().toLowerCase(),
        customerWhatsapp: whatsappNumber.trim(),
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        currency: "MZN",
        durationDays: plan.durationDays,
        status: markAsPaid ? "active" : "pending",
        folderName: targetFolder,
        accessCredentials: targetCreds,
        startDate: markAsPaid ? startDate : null,
        endDate: markAsPaid ? endDate : null,
        latestInvoiceId: invoiceId,
        approvedBy: markAsPaid ? adminUid : null,
        approvedAt: markAsPaid ? serverTimestamp() : null,
        adminNotes: adminNotes ? adminNotes.trim() : "Criado manualmente pelo Administrador",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // 3. Cria fatura
      const invData = {
        id: invoiceId,
        invoiceNumber: invoiceId,
        subscriptionId: subRef.id,
        userId,
        customerName: fullName.trim(),
        customerEmail: email.trim().toLowerCase(),
        customerWhatsapp: whatsappNumber.trim(),
        amount: plan.price,
        currency: "MZN",
        planId: plan.id,
        planName: plan.name,
        durationDays: plan.durationDays,
        status: markAsPaid ? "paid" : "pending",
        proofText: `[Registo Administrativo] Venda direta / Atribuição manual pelo Administrador (${paymentMethod}).`,
        paymentMethod: paymentMethod,
        confirmedBy: markAsPaid ? adminUid : null,
        paidAt: markAsPaid ? serverTimestamp() : null,
        adminNotes: adminNotes ? adminNotes.trim() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(subRef, subData);
      await setDoc(invRef, invData);

      return {
        user: { ...profileData, id: userId },
        subscription: subData,
        invoice: invData
      };
    } catch (err) {
      console.error("Falha ao criar cliente no Firestore:", err);
      throw err;
    }
  }

  // Modo Demonstração
  const demoClientCode = generateCustomerCode();
  const demoProfile = {
    uid: userId,
    clientCode: demoClientCode,
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    whatsappNumber: whatsappNumber.trim(),
    province: province || "Maputo Cidade",
    district: district.trim(),
    neighborhood: neighborhood.trim(),
    username: email.split("@")[0].toLowerCase(),
    role: "customer",
    isHumanVerified: true,
    createdByAdmin: true,
    createdAt: now.toISOString(),
    isMock: true
  };

  const demoSubId = "sub_adm_" + Date.now();
  const demoInvId = await getNextInvoiceNumber();

  const demoSub = {
    id: demoSubId,
    userId,
    customerName: fullName.trim(),
    customerEmail: email.trim().toLowerCase(),
    customerWhatsapp: whatsappNumber.trim(),
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    currency: "MZN",
    durationDays: plan.durationDays,
    status: markAsPaid ? "active" : "pending",
    folderName: targetFolder,
    accessCredentials: targetCreds,
    startDate: markAsPaid ? startDate : null,
    endDate: markAsPaid ? endDate : null,
    latestInvoiceId: demoInvId,
    approvedBy: markAsPaid ? adminUid : null,
    approvedAt: markAsPaid ? now.toISOString() : null,
    adminNotes: adminNotes ? adminNotes.trim() : "Criado manualmente pelo Administrador",
    createdAt: now.toISOString(),
    isMock: true
  };

  const demoInv = {
    id: demoInvId,
    subscriptionId: demoSubId,
    userId,
    customerName: fullName.trim(),
    customerEmail: email.trim().toLowerCase(),
    customerWhatsapp: whatsappNumber.trim(),
    amount: plan.price,
    currency: "MZN",
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    status: markAsPaid ? "paid" : "pending",
    proofText: `[Registo Administrativo] Venda direta / Atribuição manual pelo Administrador (${paymentMethod}).`,
    paymentMethod: paymentMethod,
    confirmedBy: markAsPaid ? adminUid : null,
    paidAt: markAsPaid ? now.toISOString() : null,
    adminNotes: adminNotes ? adminNotes.trim() : null,
    createdAt: now.toISOString(),
    isMock: true
  };

  saveMockData("megason_demo_invoices", demoInv);
  saveMockData("megason_demo_subscriptions", demoSub);

  return {
    user: demoProfile,
    subscription: demoSub,
    invoice: demoInv
  };
}

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
  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.list({ status: filterStatus });
    if (res && res.success && Array.isArray(res.subscriptions)) {
      return res.subscriptions;
    }
  } catch (apiErr) {
    // Silencioso se offline, segue para Firestore/Mock
  }

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
  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await invoicesApi.list({ status: filterStatus });
    if (res && res.success && Array.isArray(res.invoices)) {
      return res.invoices;
    }
  } catch (apiErr) {
    // Silencioso se offline, segue para Firestore/Mock
  }

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
 * Aprova o pagamento de uma subscrição pendente ou renovação e atualiza as datas
 * Se a subscrição já tem dias restantes, as datas aumentam estendendo a vigência.
 * 
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

  const targetInvoiceId = invoiceId || sub.latestInvoiceId;
  let targetInvoice = null;
  if (targetInvoiceId) {
    targetInvoice = await getInvoiceById(targetInvoiceId);
  }

  // Define os dias a adicionar com base na fatura que está a ser aprovada
  const durationDaysToAdd = Number(targetInvoice?.durationDays || sub.durationDays || 30);
  const now = new Date();

  // Executa o cálculo rigoroso de datas (extensão de término se houver dias restantes)
  const dates = calculateSubscriptionDates({
    existingStartDate: sub.startDate,
    existingEndDate: sub.endDate,
    durationDays: durationDaysToAdd,
    now
  });

  const resolvedPlanId = targetInvoice?.planId || sub.planId;
  const resolvedPlanName = targetInvoice?.planName || sub.planName;

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.approve(subscriptionId, adminUid || "admin");
    if (res && res.success) {
      notifyStateChange("order_approved", {
        subscriptionId,
        invoiceId: targetInvoiceId,
        userId: sub.userId,
        customerName: sub.customerName,
        endDate: res.subscription?.endDate || dates.endDate,
        isExtended: dates.isExtended
      });
      return true;
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "active",
      folderName: folderName.trim(),
      accessCredentials: accessCredentials.trim(),
      startDate: dates.startDate,
      endDate: dates.endDate,
      durationDays: durationDaysToAdd,
      planId: resolvedPlanId,
      planName: resolvedPlanName,
      approvedBy: adminUid || "admin",
      approvedAt: serverTimestamp(),
      pendingRenewal: null,
      latestInvoiceId: targetInvoiceId || null,
      adminNotes: adminNotes ? adminNotes.trim() : null,
      updatedAt: serverTimestamp()
    });

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

    notifyStateChange("order_approved", {
      subscriptionId,
      invoiceId: targetInvoiceId,
      userId: sub.userId,
      customerName: sub.customerName,
      endDate: dates.endDate,
      isExtended: dates.isExtended
    });

    return true;
  }

  // Modo Demonstração (localStorage)
  const subs = getMockData("megason_demo_subscriptions");
  const subIndex = subs.findIndex(s => s.id === subscriptionId);
  if (subIndex !== -1) {
    subs[subIndex] = {
      ...subs[subIndex],
      status: "active",
      folderName: folderName.trim(),
      accessCredentials: accessCredentials.trim(),
      startDate: dates.startDate,
      endDate: dates.endDate,
      durationDays: durationDaysToAdd,
      planId: resolvedPlanId,
      planName: resolvedPlanName,
      approvedBy: adminUid || "admin_demo",
      approvedAt: now.toISOString(),
      pendingRenewal: null,
      latestInvoiceId: targetInvoiceId || subs[subIndex].latestInvoiceId,
      adminNotes: adminNotes ? adminNotes.trim() : null,
      updatedAt: now.toISOString()
    };
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
  }

  if (targetInvoiceId) {
    const invs = getMockData("megason_demo_invoices");
    const invIndex = invs.findIndex(inv => (inv.id === targetInvoiceId || inv.invoiceNumber === targetInvoiceId));
    if (invIndex !== -1) {
      invs[invIndex] = {
        ...invs[invIndex],
        status: "paid",
        paidAt: now.toISOString(),
        confirmedBy: adminUid || "admin_demo",
        adminNotes: adminNotes ? adminNotes.trim() : null,
        updatedAt: now.toISOString()
      };
      localStorage.setItem("megason_demo_invoices", JSON.stringify(invs));
    }
  }

  notifyStateChange("order_approved", {
    subscriptionId,
    invoiceId: targetInvoiceId,
    userId: sub.userId,
    customerName: sub.customerName,
    endDate: dates.endDate,
    isExtended: dates.isExtended
  });

  return true;
}

/**
 * Escuta em tempo real atualizações da subscrição de um utilizador específico
 * @param {string} userId 
 * @param {Function} onUpdate 
 * @returns {Function} Função para encerrar o listener
 */
export function listenToUserSubscription(userId, onUpdate) {
  if (!userId) return () => {};

  let unsubscribeFirestore = null;

  if (isFirebaseConfigured() && db) {
    try {
      const q = query(
        collection(db, "subscriptions"),
        where("userId", "==", userId)
      );
      unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const list = [];
        snapshot.forEach(docSnap => list.push(docSnap.data()));
        list.sort((a, b) => {
          if (a.status === "active" && b.status !== "active") return -1;
          if (b.status === "active" && a.status !== "active") return 1;
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        onUpdate(list);
      }, (err) => {
        console.warn("Aviso no onSnapshot de subscrições do utilizador:", err);
      });
    } catch (err) {
      console.warn("Falha ao registrar onSnapshot:", err);
    }
  }

  const unsubscribeSync = onStateChange(async (event) => {
    if (event.type === "order_approved" || event.type === "order_created" || event.type === "order_status_changed") {
      try {
        const currentList = await getUserSubscriptions(userId);
        onUpdate(currentList);
      } catch (err) {
        console.warn("Erro ao atualizar via sync local:", err);
      }
    }
  });

  return () => {
    if (unsubscribeFirestore) {
      try { unsubscribeFirestore(); } catch {}
    }
    unsubscribeSync();
  };
}

/**
 * Escuta em tempo real atualizações gerais de subscrições e faturas para o painel Admin
 * @param {Function} onUpdate 
 * @returns {Function} Função para encerrar o listener
 */
export function listenToAdminSubscriptions(onUpdate) {
  let unsubSubs = null;
  let unsubInvs = null;

  if (isFirebaseConfigured() && db) {
    try {
      const qSubs = query(collection(db, "subscriptions"), orderBy("createdAt", "desc"));
      unsubSubs = onSnapshot(qSubs, () => {
        onUpdate();
      }, () => {});

      const qInvs = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
      unsubInvs = onSnapshot(qInvs, () => {
        onUpdate();
      }, () => {});
    } catch (err) {
      console.warn("Falha no listener Firestore do Admin:", err);
    }
  }

  const unsubSync = onStateChange((event) => {
    onUpdate(event);
  });

  return () => {
    if (unsubSubs) {
      try { unsubSubs(); } catch {}
    }
    if (unsubInvs) {
      try { unsubInvs(); } catch {}
    }
    unsubSync();
  };
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

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.suspend(subscriptionId, reason.trim());
    if (res && res.success) {
      notifyStateChange("order_status_changed", { subscriptionId, status: "suspended" });
      return true;
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "suspended",
      suspendedBy: adminUid || "admin",
      suspendedAt: serverTimestamp(),
      suspendReason: reason.trim(),
      updatedAt: serverTimestamp()
    });
    notifyStateChange("order_status_changed", { subscriptionId, status: "suspended" });
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
  notifyStateChange("order_status_changed", { subscriptionId, status: "suspended" });
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

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.reactivate(subscriptionId);
    if (res && res.success) {
      notifyStateChange("order_status_changed", { subscriptionId, status: "active" });
      return true;
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

  if (isFirebaseConfigured() && db) {
    const subRef = doc(db, "subscriptions", subscriptionId);
    await updateDoc(subRef, {
      status: "active",
      reactivatedBy: adminUid || "admin",
      reactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    notifyStateChange("order_status_changed", { subscriptionId, status: "active" });
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
  notifyStateChange("order_status_changed", { subscriptionId, status: "active" });
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

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.cancel(subscriptionId, reason.trim());
    if (res && res.success) {
      notifyStateChange("order_status_changed", { subscriptionId, status: "cancelled" });
      return true;
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

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
    notifyStateChange("order_status_changed", { subscriptionId, status: "cancelled" });
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

  notifyStateChange("order_status_changed", { subscriptionId, status: "cancelled" });
  return true;
}

/**
 * Calcula os indicadores financeiros e operacionais consolidados
 * @returns {Promise<object>}
 */
export async function getFinancialMetrics() {
  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await subscriptionsApi.metrics();
    if (res && res.success && res.metrics) {
      return res.metrics;
    }
  } catch (apiErr) {
    // Silencioso se offline, segue para cálculo local
  }

  const [subscriptions, invoices, customers] = await Promise.all([
    getAllSubscriptions("all"),
    getAllInvoices("all"),
    getAllCustomers()
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
  const totalCustomers = customers ? customers.length : (new Set(subscriptions.map(s => (s.customerEmail || s.userId).toLowerCase()))).size;

  return {
    totalReceived,
    totalBilled,
    activeSubscribers,
    pendingOrders,
    suspendedOrders,
    totalCustomers,
    totalSubscriptions: subscriptions.length,
    totalInvoices: invoices.length
  };
}

/**
 * Consulta a lista consolidada de todos os clientes cadastrados no sistema
 * Agrupa dados cadastrais, subscrição ativa e faturas
 * @returns {Promise<Array>}
 */
export async function getAllCustomers() {
  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await customersApi.list();
    if (res && res.success && Array.isArray(res.customers)) {
      return res.customers;
    }
  } catch (apiErr) {
    // Silencioso se offline, segue para Firestore/Mock
  }

  const customerMap = new Map();

  if (isFirebaseConfigured() && db) {
    try {
      // 1. Busca todos os usuários na coleção 'users'
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        usersSnap.forEach(d => {
          const u = d.data();
          if (u.role !== "admin") {
            const key = (u.email || d.id).toLowerCase();
            customerMap.set(key, {
              id: d.id,
              userId: d.id,
              clientCode: u.clientCode || `AI-${d.id.slice(0, 4).toUpperCase()}`,
              fullName: u.fullName || "Cliente",
              email: u.email || "",
              whatsappNumber: u.whatsappNumber || "",
              province: u.province || "Moçambique",
              district: u.district || "",
              neighborhood: u.neighborhood || "",
              createdAt: u.createdAt || null,
              subscriptions: [],
              invoices: []
            });
          }
        });
      } catch (err) {
        console.warn("Aviso ao ler coleção users:", err);
      }

      // 2. Busca subscrições e correlaciona
      const subs = await getAllSubscriptions("all");
      subs.forEach(s => {
        const key = (s.customerEmail || s.userId || s.id).toLowerCase();
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: s.userId || s.id,
            userId: s.userId || s.id,
            clientCode: s.clientCode || (s.userId && s.userId.startsWith("AI-") ? s.userId : `AI-${s.id.slice(0, 4).toUpperCase()}`),
            fullName: s.customerName || "Cliente",
            email: s.customerEmail || "",
            whatsappNumber: s.customerWhatsapp || "",
            province: "Moçambique",
            createdAt: s.createdAt || null,
            subscriptions: [],
            invoices: []
          });
        }
        customerMap.get(key).subscriptions.push(s);
      });

      // 3. Busca faturas e correlaciona
      const invs = await getAllInvoices("all");
      invs.forEach(inv => {
        const key = (inv.customerEmail || inv.userId || "").toLowerCase();
        if (key && customerMap.has(key)) {
          customerMap.get(key).invoices.push(inv);
        }
      });

      return Array.from(customerMap.values()).map(c => {
        // Encontra subscrição ativa prioritária ou a mais recente
        const activeSub = c.subscriptions.find(s => s.status === "active") || c.subscriptions[0] || null;
        const paidInvoices = c.invoices.filter(i => i.status === "paid");
        const totalPaid = paidInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
        const folder = activeSub?.folderName || c.folderName || "";

        return {
          ...c,
          name: c.fullName || "Cliente",
          whatsapp: c.whatsappNumber || "",
          folderName: folder,
          activeSubscription: activeSub,
          totalSubscriptions: c.subscriptions.length,
          totalInvoices: c.invoices.length,
          invoicesCount: c.invoices.length,
          paidInvoicesCount: paidInvoices.length,
          totalPaid,
          status: activeSub ? activeSub.status : "none"
        };
      });

    } catch (err) {
      console.warn("Erro ao consolidar clientes no Firestore:", err);
    }
  }

  // Modo Demonstração
  const demoUsers = [];
  const demoUserRaw = localStorage.getItem("megason_demo_user");
  if (demoUserRaw) {
    try {
      const u = JSON.parse(demoUserRaw);
      if (u.role !== "admin") demoUsers.push(u);
    } catch {}
  }

  const demoSubs = getMockData("megason_demo_subscriptions");
  const demoInvs = getMockData("megason_demo_invoices");

  demoUsers.forEach(u => {
    const key = (u.email || u.uid).toLowerCase();
    customerMap.set(key, {
      id: u.uid,
      userId: u.uid,
      clientCode: u.clientCode || "AI-DEMO",
      fullName: u.fullName || "Cliente Demo",
      email: u.email || "",
      whatsappNumber: u.whatsappNumber || "",
      province: u.province || "Maputo Cidade",
      createdAt: u.createdAt || null,
      subscriptions: [],
      invoices: []
    });
  });

  demoSubs.forEach(s => {
    const key = (s.customerEmail || s.userId || s.id).toLowerCase();
    if (!customerMap.has(key)) {
      customerMap.set(key, {
        id: s.userId || s.id,
        userId: s.userId || s.id,
        clientCode: s.clientCode || "AI-DEMO",
        fullName: s.customerName || "Cliente",
        email: s.customerEmail || "",
        whatsappNumber: s.customerWhatsapp || "",
        province: "Maputo Cidade",
        createdAt: s.createdAt || null,
        subscriptions: [],
        invoices: []
      });
    }
    customerMap.get(key).subscriptions.push(s);
  });

  demoInvs.forEach(i => {
    const key = (i.customerEmail || i.userId || "").toLowerCase();
    if (key && customerMap.has(key)) {
      customerMap.get(key).invoices.push(i);
    }
  });

  return Array.from(customerMap.values()).map(c => {
    const activeSub = c.subscriptions.find(s => s.status === "active") || c.subscriptions[0] || null;
    const paidInvoices = c.invoices.filter(i => i.status === "paid");
    const totalPaid = paidInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
    const folder = activeSub?.folderName || c.folderName || "";

    return {
      ...c,
      name: c.fullName || "Cliente",
      whatsapp: c.whatsappNumber || "",
      folderName: folder,
      activeSubscription: activeSub,
      totalSubscriptions: c.subscriptions.length,
      totalInvoices: c.invoices.length,
      invoicesCount: c.invoices.length,
      paidInvoicesCount: paidInvoices.length,
      totalPaid,
      status: activeSub ? activeSub.status : "none"
    };
  });
}

/**
 * Atualiza os dados cadastrais e de acesso de um cliente pelo Administrador
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function adminUpdateCustomer({
  userId,
  customerEmail,
  fullName,
  whatsappNumber,
  province,
  folderName,
  accessCredentials,
  adminNotes
}) {
  if (!userId && !customerEmail) throw new Error("ID do cliente ou e-mail é obrigatório.");

  const updates = {
    updatedAt: isFirebaseConfigured() && db ? serverTimestamp() : new Date().toISOString()
  };

  if (fullName && fullName.trim()) updates.fullName = fullName.trim();
  if (whatsappNumber && whatsappNumber.trim()) updates.whatsappNumber = whatsappNumber.trim();
  if (province) updates.province = province;
  if (adminNotes !== undefined) updates.adminNotes = adminNotes.trim();

  // 1. Tenta API Nativa MySQL / PHP no cPanel
  try {
    const res = await customersApi.update({
      userId,
      customerEmail,
      fullName: updates.fullName,
      whatsappNumber: updates.whatsappNumber,
      province: updates.province,
      folderName: folderName ? folderName.trim() : null,
      accessCredentials: accessCredentials ? accessCredentials.trim() : null,
      adminNotes: adminNotes !== undefined ? adminNotes.trim() : null
    });
    if (res && res.success) {
      notifyStateChange("customer_updated", { userId, customerEmail, updates });
      return updates;
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

  if (isFirebaseConfigured() && db) {
    if (userId) {
      try {
        await setDoc(doc(db, "users", userId), updates, { merge: true });
      } catch (e) {
        console.warn("Aviso ao atualizar users:", e);
      }
    }

    try {
      const subUpdates = {};
      if (updates.fullName) subUpdates.customerName = updates.fullName;
      if (updates.whatsappNumber) subUpdates.customerWhatsapp = updates.whatsappNumber;
      if (folderName) subUpdates.folderName = folderName.trim();
      if (accessCredentials) subUpdates.accessCredentials = accessCredentials.trim();
      if (adminNotes !== undefined) subUpdates.adminNotes = adminNotes.trim();

      const qSubs = userId 
        ? query(collection(db, "subscriptions"), where("userId", "==", userId))
        : query(collection(db, "subscriptions"), where("customerEmail", "==", customerEmail.toLowerCase()));
      
      const snap = await getDocs(qSubs);
      snap.forEach(d => {
        updateDoc(doc(db, "subscriptions", d.id), subUpdates).catch(() => {});
      });
    } catch (e) {
      console.warn("Aviso ao sincronizar subscrições:", e);
    }

    try {
      const invUpdates = {};
      if (updates.fullName) invUpdates.customerName = updates.fullName;
      if (updates.whatsappNumber) invUpdates.customerWhatsapp = updates.whatsappNumber;

      const qInvs = userId 
        ? query(collection(db, "invoices"), where("userId", "==", userId))
        : query(collection(db, "invoices"), where("customerEmail", "==", customerEmail.toLowerCase()));
      
      const snapInv = await getDocs(qInvs);
      snapInv.forEach(d => {
        updateDoc(doc(db, "invoices", d.id), invUpdates).catch(() => {});
      });
    } catch (e) {
      console.warn("Aviso ao sincronizar faturas:", e);
    }
  } else {
    const demoUsers = getMockData("megason_demo_user");
    if (demoUsers && (demoUsers.uid === userId || demoUsers.email === customerEmail)) {
      Object.assign(demoUsers, updates);
      localStorage.setItem("megason_demo_user", JSON.stringify(demoUsers));
    }

    const demoSubs = getMockData("megason_demo_subscriptions");
    demoSubs.forEach(s => {
      if (s.userId === userId || (customerEmail && s.customerEmail && s.customerEmail.toLowerCase() === customerEmail.toLowerCase())) {
        if (updates.fullName) s.customerName = updates.fullName;
        if (updates.whatsappNumber) s.customerWhatsapp = updates.whatsappNumber;
        if (folderName) s.folderName = folderName.trim();
        if (accessCredentials) s.accessCredentials = accessCredentials.trim();
        if (adminNotes !== undefined) s.adminNotes = adminNotes.trim();
      }
    });
    localStorage.setItem("megason_demo_subscriptions", JSON.stringify(demoSubs));

    const demoInvs = getMockData("megason_demo_invoices");
    demoInvs.forEach(i => {
      if (i.userId === userId || (customerEmail && i.customerEmail && i.customerEmail.toLowerCase() === customerEmail.toLowerCase())) {
        if (updates.fullName) i.customerName = updates.fullName;
        if (updates.whatsappNumber) i.customerWhatsapp = updates.whatsappNumber;
      }
    });
    localStorage.setItem("megason_demo_invoices", JSON.stringify(demoInvs));
  }

  notifyStateChange("customer_updated", { userId, customerEmail, updates });
  return updates;
}

/**
 * Atribui ou renova diretamente um plano para um cliente existente
 * @param {object} params
 * @returns {Promise<object>} Retorna { subscription, invoice }
 */
export async function adminAssignPlanToCustomer({
  userId,
  customerEmail,
  customerName,
  customerWhatsapp,
  clientCode,
  planId,
  folderName,
  accessCredentials,
  markAsPaid = true,
  adminNotes = "",
  adminUid = "admin"
}) {
  const plan = getPlanById(planId);
  if (!plan) throw new Error("Plano selecionado não é válido.");

  const now = new Date();
  const startDate = now.toISOString();
  const endDate = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();
  const finalFolder = folderName ? folderName.trim() : `MEGASON - ${(customerName || "Cliente").split(" ")[0]}`;
  const finalCreds = accessCredentials ? accessCredentials.trim() : "Instruções de acesso fornecidas pela administração.";

  const invoiceId = await getNextInvoiceNumber();

  const subData = {
    userId: userId || "usr_" + Date.now(),
    clientCode: clientCode || "AI-CLIENTE",
    customerName: customerName || "Cliente",
    customerEmail: (customerEmail || "").toLowerCase(),
    customerWhatsapp: customerWhatsapp || "",
    planId: plan.id,
    planName: plan.name,
    price: plan.price,
    currency: "MZN",
    durationDays: plan.durationDays,
    status: markAsPaid ? "active" : "pending",
    folderName: finalFolder,
    accessCredentials: finalCreds,
    adminNotes: adminNotes.trim(),
    latestInvoiceId: invoiceId,
    startDate: markAsPaid ? startDate : null,
    endDate: markAsPaid ? endDate : null,
    approvedAt: markAsPaid ? startDate : null,
    approvedBy: markAsPaid ? adminUid : null,
    createdAt: startDate,
    updatedAt: startDate
  };

  const invoiceData = {
    id: invoiceId,
    invoiceNumber: invoiceId,
    userId: subData.userId,
    clientCode: subData.clientCode,
    customerName: subData.customerName,
    customerEmail: subData.customerEmail,
    customerWhatsapp: subData.customerWhatsapp,
    amount: plan.price,
    currency: "MZN",
    planId: plan.id,
    planName: plan.name,
    paymentMethod: "M-Pesa",
    status: markAsPaid ? "paid" : "pending",
    createdAt: startDate,
    paidAt: markAsPaid ? startDate : null,
    confirmedBy: markAsPaid ? adminUid : null
  };

  if (isFirebaseConfigured() && db) {
    const subRef = doc(collection(db, "subscriptions"));
    subData.id = subRef.id;
    invoiceData.subscriptionId = subRef.id;

    await setDoc(subRef, { ...subData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    await setDoc(doc(db, "invoices", invoiceId), { ...invoiceData, createdAt: serverTimestamp() });
  } else {
    subData.id = "sub_" + Date.now();
    invoiceData.subscriptionId = subData.id;
    saveMockData("megason_demo_subscriptions", subData);
    saveMockData("megason_demo_invoices", invoiceData);
  }

  notifyStateChange("order_created", { subscriptionId: subData.id, invoiceId });
  return { subscription: subData, invoice: invoiceData };
}

/**
 * Elimina completamente um cliente e tudo o que lhe relaciona em cascata:
 * Documento de utilizador, todas as subscrições e todas as faturas financeiras.
 * @param {object} params { userId, customerEmail }
 * @returns {Promise<boolean>}
 */
export async function deleteCustomerCascade({ userId, customerEmail }) {
  if (!userId && !customerEmail) {
    throw new Error("Identificador do cliente ou e-mail é obrigatório para exclusão.");
  }

  const cleanEmail = customerEmail ? customerEmail.trim().toLowerCase() : null;

  // 1. Tenta API Nativa MySQL / PHP no cPanel com ON DELETE CASCADE
  try {
    const res = await customersApi.delete(userId || cleanEmail);
    if (res && res.success) {
      notifyStateChange("customer_deleted", { userId, customerEmail: cleanEmail });
      return true;
    }
  } catch (apiErr) {
    if (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("404")) {
      throw apiErr;
    }
  }

  if (isFirebaseConfigured() && db) {
    try {
      // 1. Elimina da coleção 'users'
      if (userId) {
        try {
          await deleteDoc(doc(db, "users", userId));
        } catch (e) {
          console.warn("Aviso ao deletar doc em users:", e);
        }
      }

      // 2. Elimina todas as subscrições associadas
      const subDocsToDelete = new Set();
      if (userId) {
        try {
          const qSubUser = query(collection(db, "subscriptions"), where("userId", "==", userId));
          const snapUser = await getDocs(qSubUser);
          snapUser.forEach(d => subDocsToDelete.add(d.id));
        } catch {}
      }
      if (cleanEmail) {
        try {
          const qSubEmail = query(collection(db, "subscriptions"), where("customerEmail", "==", cleanEmail));
          const snapEmail = await getDocs(qSubEmail);
          snapEmail.forEach(d => subDocsToDelete.add(d.id));
        } catch {}
      }

      for (const subId of subDocsToDelete) {
        try {
          await deleteDoc(doc(db, "subscriptions", subId));
        } catch (e) {
          console.warn("Aviso ao deletar subscrição:", e);
        }
      }

      // 3. Elimina todas as faturas associadas
      const invDocsToDelete = new Set();
      if (userId) {
        try {
          const qInvUser = query(collection(db, "invoices"), where("userId", "==", userId));
          const snapUser = await getDocs(qInvUser);
          snapUser.forEach(d => invDocsToDelete.add(d.id));
        } catch {}
      }
      if (cleanEmail) {
        try {
          const qInvEmail = query(collection(db, "invoices"), where("customerEmail", "==", cleanEmail));
          const snapEmail = await getDocs(qInvEmail);
          snapEmail.forEach(d => invDocsToDelete.add(d.id));
        } catch {}
      }

      for (const invId of invDocsToDelete) {
        try {
          await deleteDoc(doc(db, "invoices", invId));
        } catch (e) {
          console.warn("Aviso ao deletar fatura:", e);
        }
      }

    } catch (err) {
      console.error("Falha ao eliminar cliente em cascata no Firestore:", err);
      throw err;
    }
  }

  // Modo Demonstração / Limpeza Local
  try {
    const rawSubs = localStorage.getItem("megason_demo_subscriptions");
    if (rawSubs) {
      const subs = JSON.parse(rawSubs);
      const filteredSubs = subs.filter(s => {
        const matchId = userId && s.userId === userId;
        const matchEmail = cleanEmail && s.customerEmail && s.customerEmail.toLowerCase() === cleanEmail;
        return !matchId && !matchEmail;
      });
      localStorage.setItem("megason_demo_subscriptions", JSON.stringify(filteredSubs));
    }

    const rawInvs = localStorage.getItem("megason_demo_invoices");
    if (rawInvs) {
      const invs = JSON.parse(rawInvs);
      const filteredInvs = invs.filter(i => {
        const matchId = userId && i.userId === userId;
        const matchEmail = cleanEmail && i.customerEmail && i.customerEmail.toLowerCase() === cleanEmail;
        return !matchId && !matchEmail;
      });
      localStorage.setItem("megason_demo_invoices", JSON.stringify(filteredInvs));
    }

    const rawUser = localStorage.getItem("megason_demo_user");
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        if ((userId && u.uid === userId) || (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)) {
          localStorage.removeItem("megason_demo_user");
        }
      } catch {}
    }
  } catch {}

  // Notifica todas as abas e componentes
  notifyStateChange("customer_deleted", { userId, customerEmail: cleanEmail });

  return true;
}

/**
 * Verifica e gera automaticamente a fatura do ciclo seguinte se faltarem <= 7 dias para expirar
 * Garante que o cliente tenha a fatura pronta para pagamento e renovação contínua
 * @param {object} sub 
 * @returns {Promise<object|null>} Retorna a fatura gerada ou null
 */
export async function checkAndGenerateRenewalInvoice(sub) {
  if (!sub || sub.status !== "active" || !sub.endDate) return null;

  const endMs = new Date(sub.endDate).getTime();
  const nowMs = Date.now();
  const daysLeft = Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24));

  // Apenas gera se faltarem 7 dias ou menos
  if (daysLeft > 7) return null;

  // Se já tiver uma fatura de renovação pendente associada, não duplica
  if (sub.pendingRenewal && sub.pendingRenewal.invoiceId) {
    const existing = await getInvoiceById(sub.pendingRenewal.invoiceId);
    if (existing && existing.status === "pending") {
      return existing;
    }
  }

  // Verifica nas faturas recentes do utilizador se já foi gerada fatura pendente nos últimos 15 dias
  const userInvoices = await getUserInvoices(sub.userId);
  const recentPending = userInvoices.find(inv => {
    if (inv.status !== "pending") return false;
    const invDate = inv.createdAt?.toDate ? inv.createdAt.toDate().getTime() : new Date(inv.createdAt || 0).getTime();
    return (nowMs - invDate) < (15 * 24 * 60 * 60 * 1000);
  });
  if (recentPending) return recentPending;

  // Gera nova fatura sequencial canónica FT[ANO]AIXXX para o próximo ciclo
  const plan = getPlanById(sub.planId) || { 
    id: sub.planId, 
    name: sub.planName || "ChatGPT Plus", 
    price: sub.price || 250, 
    durationDays: sub.durationDays || 30 
  };
  const invoiceId = await getNextInvoiceNumber();
  const now = new Date();

  const invoiceData = {
    id: invoiceId,
    invoiceNumber: invoiceId,
    subscriptionId: sub.id,
    userId: sub.userId,
    customerName: sub.customerName || "Cliente",
    customerEmail: sub.customerEmail || "",
    customerWhatsapp: sub.customerWhatsapp || "",
    amount: plan.price,
    currency: "MZN",
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    status: "pending",
    proofText: `[Fatura Pró-Forma Antecipada] Gerada a ${daysLeft} dia(s) do término para garantir renovação contínua de acesso.`,
    paymentMethod: "M-Pesa / E-Mola / Absa",
    isAutomaticRenewal: true,
    adminNotes: null,
    paidAt: null,
    createdAt: isFirebaseConfigured() && db ? serverTimestamp() : now.toISOString(),
    updatedAt: isFirebaseConfigured() && db ? serverTimestamp() : now.toISOString()
  };

  const pendingRenewal = {
    invoiceId,
    planId: plan.id,
    planName: plan.name,
    durationDays: plan.durationDays,
    price: plan.price,
    isAutomatic: true,
    generatedAt: now.toISOString()
  };

  if (isFirebaseConfigured() && db) {
    try {
      await setDoc(doc(db, "invoices", invoiceId), invoiceData);
      await updateDoc(doc(db, "subscriptions", sub.id), {
        latestInvoiceId: invoiceId,
        pendingRenewal,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("Falha ao salvar fatura automática no Firestore:", err);
    }
  } else {
    saveMockData("megason_demo_invoices", invoiceData);
    const subs = getMockData("megason_demo_subscriptions");
    const idx = subs.findIndex(s => s.id === sub.id);
    if (idx !== -1) {
      subs[idx].latestInvoiceId = invoiceId;
      subs[idx].pendingRenewal = pendingRenewal;
      localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
    }
  }

  notifyStateChange("renewal_invoice_generated", {
    subscriptionId: sub.id,
    invoiceId,
    userId: sub.userId,
    customerName: sub.customerName,
    daysLeft
  });

  return { ...invoiceData, createdAt: now.toISOString() };
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
