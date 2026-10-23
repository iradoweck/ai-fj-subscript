/**
 * Authentication Service — MEGASON
 * Desenvolvido por Zedecks IT
 * Gerencia registo com perfil moçambicano, login Email/Senha e Google, sessão e perfil do utilizador
 */

import { 
  auth, 
  db, 
  googleProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  updateProfile,
  updatePassword,
  updateEmail,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from "./firebase.js";

/**
 * Lista oficial das 11 províncias de Moçambique
 */
export const MOZAMBIQUE_PROVINCES = [
  "Maputo Cidade",
  "Maputo Província",
  "Gaza",
  "Inhambane",
  "Sofala",
  "Manica",
  "Tete",
  "Zambézia",
  "Nampula",
  "Cabo Delgado",
  "Niassa"
];

/**
 * Gera um ID canónico e único de cliente no formato MEGASON AI-XXXX (ex: AI-1K7L, AI-H5I8)
 * @returns {string}
 */
export function generateCustomerCode() {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `AI-${code}`;
}

/**
 * Validação e formatação de número moçambicano
 * Aceita: 82/83/84/85/86/87 com ou sem prefixo +258
 * @param {string} phone 
 * @returns {string|null} Retorna o número normalizado ou null se inválido
 */
export function normalizeMozambicanPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  
  // Ex: 258841234567 (12 dígitos)
  if (cleaned.length === 12 && cleaned.startsWith("258")) {
    const operator = cleaned.slice(3, 5);
    if (["82", "83", "84", "85", "86", "87"].includes(operator)) {
      return `+${cleaned}`;
    }
  }

  // Ex: 841234567 (9 dígitos)
  if (cleaned.length === 9) {
    const operator = cleaned.slice(0, 2);
    if (["82", "83", "84", "85", "86", "87"].includes(operator)) {
      return `+258${cleaned}`;
    }
  }

  return null;
}

/**
 * Registra um novo utilizador no Firebase Auth e cria o perfil moçambicano em users/{uid}
 * @param {object} userData
 * @returns {Promise<object>} Perfil do utilizador registado
 */
export async function registerUser({
  fullName,
  email,
  password,
  whatsappNumber,
  province,
  district,
  neighborhood,
  username,
  isHumanVerified
}) {
  if (!isHumanVerified) {
    throw new Error("Confirmação anti-bot obrigatória ('Sou Humano').");
  }

  const normalizedPhone = normalizeMozambicanPhone(whatsappNumber);
  if (!normalizedPhone) {
    throw new Error("Número de WhatsApp moçambicano inválido. Use um número das operadoras Vodacom, Movitel ou Tmcel (ex: 84XXXXXXX).");
  }

  if (!province || !MOZAMBIQUE_PROVINCES.includes(province)) {
    throw new Error("Por favor, selecione uma província válida de Moçambique.");
  }

  // Se o Firebase estiver configurado, usa SDK oficial
  if (isFirebaseConfigured() && auth && db) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Atualiza nome visível no Auth
    await updateProfile(user, { displayName: fullName });

    const customerCode = generateCustomerCode();

    const profileData = {
      uid: user.uid,
      clientCode: customerCode,
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      whatsappNumber: normalizedPhone,
      province,
      district: district ? district.trim() : "",
      neighborhood: neighborhood ? neighborhood.trim() : "",
      username: username ? username.trim().toLowerCase() : email.split("@")[0],
      role: "customer",
      status: "active",
      isHumanVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Cria documento em users/{uid}
    await setDoc(doc(db, "users", user.uid), profileData);
    return profileData;
  }

  // Modo Demonstração (Persistência Local para teste imediato de UI)
  const mockUid = "demo_usr_" + Date.now();
  const mockProfile = {
    uid: mockUid,
    clientCode: generateCustomerCode(),
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    whatsappNumber: normalizedPhone,
    province,
    district: district ? district.trim() : "",
    neighborhood: neighborhood ? neighborhood.trim() : "",
    username: username ? username.trim().toLowerCase() : email.split("@")[0],
    role: "customer",
    isHumanVerified: true,
    createdAt: new Date().toISOString(),
    isMock: true
  };

  localStorage.setItem("megason_demo_user", JSON.stringify(mockProfile));
  return mockProfile;
}

/**
 * Autentica o utilizador com Email e Senha
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<object>} Perfil do utilizador
 */
export async function loginUser(email, password) {
  if (isFirebaseConfigured() && auth && db) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, "users", credential.user.uid));
    
    if (userDoc.exists()) {
      return userDoc.data();
    }
    
    // Perfil básico de fallback
    return {
      uid: credential.user.uid,
      email: credential.user.email,
      fullName: credential.user.displayName || "Cliente MEGASON",
      role: "customer"
    };
  }

  // Modo Demonstração
  const demo = localStorage.getItem("megason_demo_user");
  if (demo) {
    return JSON.parse(demo);
  }

  // Se for admin de demonstração
  if (email.toLowerCase().includes("admin")) {
    const adminProfile = {
      uid: "demo_admin_01",
      email: email.toLowerCase(),
      fullName: "Administrador MEGASON",
      role: "admin",
      isMock: true
    };
    localStorage.setItem("megason_demo_user", JSON.stringify(adminProfile));
    return adminProfile;
  }

  // Cliente padrão de demonstração
  const defaultProfile = {
    uid: "demo_usr_guest",
    email: email.toLowerCase(),
    fullName: "Cliente Demonstração",
    role: "customer",
    isMock: true
  };
  localStorage.setItem("megason_demo_user", JSON.stringify(defaultProfile));
  return defaultProfile;
}

/**
 * Autentica com Google (Popup)
 * @returns {Promise<object>} Perfil do utilizador
 */
export async function loginWithGoogle() {
  if (isFirebaseConfigured() && auth && db && googleProvider) {
    const credential = await signInWithPopup(auth, googleProvider);
    const user = credential.user;
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      if (!data.clientCode) {
        data.clientCode = generateCustomerCode();
        setDoc(userRef, { clientCode: data.clientCode }, { merge: true }).catch(() => {});
      }
      return data;
    }

    // Primeiro login via Google: cria perfil com dados do Google
    const profileData = {
      uid: user.uid,
      clientCode: generateCustomerCode(),
      fullName: user.displayName || "Cliente MEGASON",
      email: user.email.toLowerCase(),
      whatsappNumber: "",
      province: "Maputo Cidade",
      district: "",
      neighborhood: "",
      username: (user.email.split("@")[0] || "user").toLowerCase(),
      role: "customer",
      isHumanVerified: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(userRef, profileData);
    return profileData;
  }

  // Modo Demonstração
  const googleDemo = {
    uid: "demo_google_" + Date.now(),
    email: "cliente.google@exemplo.com",
    fullName: "Utilizador Google (Demo)",
    role: "customer",
    isMock: true
  };
  localStorage.setItem("megason_demo_user", JSON.stringify(googleDemo));
  return googleDemo;
}

/**
 * Encerra a sessão ativa
 */
export async function logoutUser() {
  if (isFirebaseConfigured() && auth) {
    await signOut(auth);
  }
  localStorage.removeItem("megason_demo_user");
}

/**
 * Envia email de recuperação de senha
 * @param {string} email 
 */
export async function resetPassword(email) {
  if (isFirebaseConfigured() && auth) {
    await sendPasswordResetEmail(auth, email);
    return true;
  }
  // No modo demo simula envio com sucesso
  return true;
}

/**
 * Recupera o perfil completo de um utilizador pelo UID
 * @param {string} uid 
 * @returns {Promise<object|null>}
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  if (isFirebaseConfigured() && db) {
    const userRef = doc(db, "users", uid);
    const snapshot = await getDoc(userRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (!data.clientCode) {
        data.clientCode = generateCustomerCode();
        setDoc(userRef, { clientCode: data.clientCode }, { merge: true }).catch(() => {});
      }
      return data;
    }
  }

  const demo = localStorage.getItem("megason_demo_user");
  if (demo) {
    const parsed = JSON.parse(demo);
    if (parsed.uid === uid) {
      if (!parsed.clientCode) {
        parsed.clientCode = generateCustomerCode();
        localStorage.setItem("megason_demo_user", JSON.stringify(parsed));
      }
      return parsed;
    }
  }

  return null;
}

/**
 * Observa alterações de autenticação e chama o callback com estado completo
 * @param {function} callback ({ user, profile, isAdmin })
 * @returns {function} Unsubscribe function
 */
export function subscribeToAuthChanges(callback) {
  if (isFirebaseConfigured() && auth) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        let profile = await getUserProfile(firebaseUser.uid);
        if (!profile) {
          profile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            fullName: firebaseUser.displayName || "Cliente MEGASON",
            role: "customer"
          };
        }
        callback({
          user: firebaseUser,
          profile,
          isAdmin: profile.role === "admin"
        });
      } else {
        callback({ user: null, profile: null, isAdmin: false });
      }
    });
  }

  // Modo Demonstração: verifica localStorage
  const demo = localStorage.getItem("megason_demo_user");
  if (demo) {
    const profile = JSON.parse(demo);
    callback({
      user: { uid: profile.uid, email: profile.email },
      profile,
      isAdmin: profile.role === "admin"
    });
  } else {
    callback({ user: null, profile: null, isAdmin: false });
  }

  return () => {};
}

/**
 * Atualiza os dados de perfil do cliente autenticado
 * @param {string} uid 
 * @param {object} param1 
 * @returns {Promise<object>}
 */
export async function updateUserProfile(uid, { fullName, whatsappNumber, province }) {
  if (!uid) throw new Error("ID do utilizador é obrigatório.");

  const normalizedPhone = normalizeMozambicanPhone(whatsappNumber);
  if (!normalizedPhone) {
    throw new Error("Número de WhatsApp moçambicano inválido. Use um número das operadoras Vodacom, Movitel ou Tmcel (ex: 84XXXXXXX).");
  }
  if (province && !MOZAMBIQUE_PROVINCES.includes(province)) {
    throw new Error("Por favor, selecione uma província válida de Moçambique.");
  }

  const updates = {
    updatedAt: isFirebaseConfigured() && db ? serverTimestamp() : new Date().toISOString()
  };
  if (fullName && fullName.trim()) updates.fullName = fullName.trim();
  if (normalizedPhone) updates.whatsappNumber = normalizedPhone;
  if (province) updates.province = province;

  if (isFirebaseConfigured() && db) {
    await updateDoc(doc(db, "users", uid), updates);

    // Propaga as alterações de nome e whatsapp para subscrições e faturas correspondentes
    try {
      const syncData = {};
      if (updates.fullName) syncData.customerName = updates.fullName;
      if (updates.whatsappNumber) syncData.customerWhatsapp = updates.whatsappNumber;

      if (Object.keys(syncData).length > 0) {
        // Atualiza subscrições do utilizador
        const subSnap = await getDocs(query(collection(db, "subscriptions"), where("userId", "==", uid)));
        subSnap.forEach(d => {
          updateDoc(doc(db, "subscriptions", d.id), syncData).catch(() => {});
        });

        // Atualiza faturas do utilizador
        const invSnap = await getDocs(query(collection(db, "invoices"), where("userId", "==", uid)));
        invSnap.forEach(d => {
          updateDoc(doc(db, "invoices", d.id), syncData).catch(() => {});
        });
      }
    } catch (syncErr) {
      console.warn("Aviso ao propagar dados atualizados do perfil:", syncErr);
    }

    return updates;
  }

  // Modo Demonstração
  const stored = localStorage.getItem("megason_demo_user");
  if (stored) {
    const user = JSON.parse(stored);
    Object.assign(user, updates);
    localStorage.setItem("megason_demo_user", JSON.stringify(user));
  }

  // Sincroniza mocks de subscrições e faturas no modo demo
  try {
    const rawSubs = localStorage.getItem("megason_demo_subscriptions");
    if (rawSubs) {
      const subs = JSON.parse(rawSubs);
      subs.forEach(s => {
        if (s.userId === uid) {
          if (updates.fullName) s.customerName = updates.fullName;
          if (updates.whatsappNumber) s.customerWhatsapp = updates.whatsappNumber;
        }
      });
      localStorage.setItem("megason_demo_subscriptions", JSON.stringify(subs));
    }

    const rawInvs = localStorage.getItem("megason_demo_invoices");
    if (rawInvs) {
      const invs = JSON.parse(rawInvs);
      invs.forEach(i => {
        if (i.userId === uid) {
          if (updates.fullName) i.customerName = updates.fullName;
          if (updates.whatsappNumber) i.customerWhatsapp = updates.whatsappNumber;
        }
      });
      localStorage.setItem("megason_demo_invoices", JSON.stringify(invs));
    }
  } catch {}

  return updates;
}

/**
 * Atualiza os dados de perfil pessoal do Administrador
 * @param {string} uid
 * @param {object} param1 { fullName, whatsappNumber, roleTitle }
 * @returns {Promise<object>}
 */
export async function updateAdminProfile(uid, { fullName, whatsappNumber, roleTitle }) {
  if (!uid) throw new Error("ID do administrador é obrigatório.");

  const updates = {
    updatedAt: isFirebaseConfigured() && db ? serverTimestamp() : new Date().toISOString()
  };

  if (fullName && fullName.trim()) updates.fullName = fullName.trim();
  if (roleTitle && roleTitle.trim()) updates.roleTitle = roleTitle.trim();

  if (whatsappNumber) {
    const normalized = normalizeMozambicanPhone(whatsappNumber);
    if (!normalized) {
      throw new Error("Número de WhatsApp moçambicano inválido. Use 9 dígitos (ex: 84XXXXXXX).");
    }
    updates.whatsappNumber = normalized;
  }

  if (isFirebaseConfigured() && auth && auth.currentUser) {
    try {
      if (updates.fullName) {
        await updateProfile(auth.currentUser, { displayName: updates.fullName });
      }
    } catch (e) {
      console.warn("Aviso ao atualizar displayName do admin no Auth:", e);
    }

    if (db) {
      await setDoc(doc(db, "users", uid), {
        ...updates,
        role: "admin"
      }, { merge: true });
    }
  }

  // Atualiza estado local / modo demo
  const stored = localStorage.getItem("megason_demo_user");
  if (stored) {
    try {
      const u = JSON.parse(stored);
      Object.assign(u, updates);
      localStorage.setItem("megason_demo_user", JSON.stringify(u));
    } catch {}
  }

  // Armazena perfil persistente do admin localmente
  const adminProfile = {
    uid,
    fullName: updates.fullName || "Admin MEGASON",
    whatsappNumber: updates.whatsappNumber || "842256366",
    roleTitle: updates.roleTitle || "Administrador Geral & Operações",
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem("megason_admin_profile", JSON.stringify(adminProfile));

  return updates;
}

/**
 * Altera a senha do administrador
 * @param {string} newPassword
 * @returns {Promise<void>}
 */
export async function changeAdminPassword(newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
  }

  if (isFirebaseConfigured() && auth && auth.currentUser) {
    await updatePassword(auth.currentUser, newPassword);
  } else {
    // Modo demonstração
    const stored = localStorage.getItem("megason_demo_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        u.password = newPassword;
        localStorage.setItem("megason_demo_user", JSON.stringify(u));
      } catch {}
    }
  }
}
