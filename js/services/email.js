/**
 * Email & Messaging Service — MEGASON
 * Desenvolvido por Zedecks IT
 * Integração de envio de faturas e lembretes transacionais via EmailJS e WhatsApp
 */

import { db, isFirebaseConfigured, doc, getDoc } from "./firebase.js";

/**
 * Contas oficiais para pagamento na MEGASON
 */
export const PAYMENT_CHANNELS = {
  mpesa: {
    name: "M-Pesa (Vodacom)",
    number: "842256366",
    holder: "MEGASON"
  },
  emola: {
    name: "E-Mola (Movitel)",
    number: "861557953",
    holder: "MEGASON"
  },
  absa: {
    name: "Absa Bank Moçambique",
    accountNumber: "000207080810102829586",
    nib: "000207080810102829586",
    holder: "MEGASON"
  }
};

/**
 * Obtém as credenciais de e-mail do sistema gravadas pelo administrador
 * @returns {Promise<object>}
 */
export async function getEmailSettings() {
  let settings = {
    emailjsServiceId: "",
    emailjsTemplateId: "",
    emailjsPublicKey: "",
    adminEmail: "comercial@admin-megason.site",
    adminWhatsapp: "842256366"
  };

  try {
    if (isFirebaseConfigured() && db) {
      const snap = await getDoc(doc(db, "settings", "public"));
      if (snap.exists()) {
        const data = snap.data();
        settings = { ...settings, ...data };
      }
    } else {
      const stored = localStorage.getItem("megason_system_settings");
      if (stored) {
        settings = { ...settings, ...JSON.parse(stored) };
      }
    }
  } catch (err) {
    console.warn("Aviso ao carregar configurações de e-mail:", err);
  }

  return settings;
}

/**
 * Formata a mensagem de fatura detalhada com estrutura de fatura comercial para WhatsApp
 * @param {object} params
 * @returns {string}
 */
export function formatWhatsAppInvoiceText({
  customerName,
  customerCode,
  invoiceId,
  amount,
  planName,
  dueDate,
  daysLeft
}) {
  const codeStr = customerCode ? customerCode : "AI-CLIENTE";
  const formattedAmount = `${Number(amount || 0).toLocaleString("pt-MZ")},00 MT`;
  const issueDate = new Date().toLocaleDateString("pt-MZ");

  let statusNote = "Aguardando Pagamento";
  if (daysLeft !== undefined && daysLeft !== null) {
    if (daysLeft <= 0) statusNote = "Vencida / Expirada";
    else if (daysLeft <= 3) statusNote = `Urgente (${daysLeft} dias restantes)`;
    else statusNote = `Renovacao (${daysLeft} dias restantes)`;
  }

  return `*MEGASON INFORMATICA & TECNOLOGIA*
*FATURA COMERCIAL / NOTA DE COBRANCA*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Fatura N.º:* #${invoiceId}
*Cliente:* ${customerName || "Cliente"}
*ID do Cliente:* ${codeStr}
*Data de Emissao:* ${issueDate}
*Data Limite:* ${dueDate || "Apos Recepcao"}
*Estado:* ${statusNote}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*DISCRIMINACAO DO SERVICO*
• *Servico:* Subscricao ChatGPT Plus
• *Pacote:* ${planName || "ChatGPT Plus"}
• *Recursos:* GPT-6 Astra, Pasta Exclusiva e Modelos Avancados
• *Garantia:* Acesso Dedicado MEGASON
━━━━━━━━━━━━━━━━━━━━━━━━━━
*VALOR TOTAL A PAGAR:* *${formattedAmount}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*COORDENADAS PARA PAGAMENTO (MOCAMBIQUE)*
• *M-Pesa (Vodacom):* 842256366 (FRANCISCO)
• *E-Mola (Movitel):* 861557953 (FRANCISCO)
• *Absa Bank:* Conta 0708101028295
  *NIB:* 000207080810102829586
  *Titular:* MEGASON
━━━━━━━━━━━━━━━━━━━━━━━━━━
_Apos efetuar a transferencia, responda a esta mensagem colando o SMS de confirmacao para ativacao ou renovacao imediata._

*MEGASON — Inteligencia Artificial Dedicada*
https://ai.admin-megason.site`;
}

/**
 * Formata o texto do lembrete de fatura para envio pelo WhatsApp
 * @param {object} params
 * @returns {string} URL pronta para o wa.me
 */
export function buildWhatsAppInvoiceUrl({
  customerWhatsapp,
  customerName,
  customerCode,
  invoiceId,
  amount,
  planName,
  dueDate,
  daysLeft
}) {
  const cleanPhone = (customerWhatsapp || "").replace(/\D/g, "");
  const targetPhone = cleanPhone.startsWith("258") ? cleanPhone : `258${cleanPhone.slice(-9)}`;

  const message = formatWhatsAppInvoiceText({
    customerName,
    customerCode,
    invoiceId,
    amount,
    planName,
    dueDate,
    daysLeft
  });

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(message)}`;
}

/**
 * Formata a mensagem de ativação e entrega de credenciais para o WhatsApp
 * @param {object} params
 * @returns {string}
 */
export function formatWhatsAppWelcomeCredentialsText({
  customerName,
  customerCode,
  planName,
  durationDays,
  folderName,
  credentials,
  startDate,
  endDate
}) {
  return `*MEGASON INFORMATICA & TECNOLOGIA*
*CONFIRMACAO DE ACESSO — CHATGPT PLUS*
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Cliente:* ${customerName || "Cliente"}
*ID do Cliente:* ${customerCode || "AI-CLIENTE"}
*Plano:* ${planName || "ChatGPT Plus"} (${durationDays || 30} Dias)
*Vigencia:* ${startDate || "Hoje"} ate ${endDate || "Data acordada"}
*Estado:* Activo
━━━━━━━━━━━━━━━━━━━━━━━━━━
*DADOS DA SUA CONTA EXCLUSIVA*
• *Pasta Dedicada:* ${folderName || "MEGASON"}
• *Instrucoes & Credenciais de Acesso:*
${credentials || "Consulte na sua area de cliente."}
━━━━━━━━━━━━━━━━━━━━━━━━━━
*Portal do Cliente:* https://ai.admin-megason.site
_Guarde estas credenciais em local seguro. Utilize sempre a sua pasta atribuida para manter as suas conversas isoladas e confidenciais._

*Suporte Tecnico MEGASON*`;
}

/**
 * Formata o corpo do e-mail da fatura para texto legível
 * @param {object} params
 * @returns {string}
 */
export function formatInvoiceEmailText({
  customerName,
  customerCode,
  invoiceId,
  amount,
  planName,
  dueDate,
  daysLeft
}) {
  return `Prezado(a) ${customerName || "Cliente"},\n\n` +
    `Esperamos que este e-mail o encontre bem.\n\n` +
    `Informamos que a sua subscrição de acesso ao ChatGPT Plus (Conta MEGASON) está próxima do término.\n` +
    `Emitimos antecipadamente a sua fatura de renovação para que possa continuar a utilizar as ferramentas sem qualquer interrupção.\n\n` +
    `DETALHES DA FATURA:\n` +
    `--------------------------------------------------\n` +
    `Fatura Nº: #${invoiceId}\n` +
    `Cliente: ${customerName} ${customerCode ? `(ID: ${customerCode})` : ""}\n` +
    `Plano: ${planName || "ChatGPT Plus"}\n` +
    `Valor a Pagar: ${amount} MT\n` +
    `Data Limite de Pagamento: ${dueDate || "Conforme período"}\n` +
    `--------------------------------------------------\n\n` +
    `DADOS PARA TRANSFERÊNCIA:\n` +
    `- M-Pesa (Vodacom): 842256366 (MEGASON)\n` +
    `- E-Mola (Movitel): 861557953 (MEGASON)\n` +
    `- Absa Bank Moçambique:\n` +
    `  Conta: 000207080810102829586\n` +
    `  NIB: 000207080810102829586\n` +
    `  Titular: MEGASON\n\n` +
    `Após a transferência, aceda ao seu painel em https://ai.admin-megason.site e anexe o comprovativo SMS para confirmação automática.\n\n` +
    `Atenciosamente,\n` +
    `MEGASON — Inteligência Artificial Dedicada`;
}

/**
 * Envia e-mail de fatura para o cliente (via EmailJS ou com fallback mailto)
 * @param {object} params
 * @returns {Promise<object>} { success: boolean, method: "emailjs"|"mailto", mailtoUrl?: string }
 */
export async function sendInvoiceEmail({
  customerEmail,
  customerName,
  customerCode,
  invoiceId,
  amount,
  planName,
  dueDate,
  daysLeft
}) {
  if (!customerEmail || !customerEmail.includes("@")) {
    throw new Error("Endereço de e-mail do cliente inválido ou não informado.");
  }

  const settings = await getEmailSettings();
  const bodyText = formatInvoiceEmailText({
    customerName,
    customerCode,
    invoiceId,
    amount,
    planName,
    dueDate,
    daysLeft
  });

  const subject = `Fatura de Renovação #${invoiceId} — ChatGPT Plus MEGASON`;

  // 1. Tenta envio direto via EmailJS REST API se configurado
  if (settings.emailjsServiceId && settings.emailjsTemplateId && settings.emailjsPublicKey) {
    try {
      const payload = {
        service_id: settings.emailjsServiceId,
        template_id: settings.emailjsTemplateId,
        user_id: settings.emailjsPublicKey,
        template_params: {
          to_email: customerEmail,
          to_name: customerName,
          invoice_id: invoiceId,
          plan_name: planName,
          amount: `${amount} MT`,
          due_date: dueDate,
          message_body: bodyText,
          mpesa_info: "842256366 (MEGASON)",
          emola_info: "861557953 (MEGASON)",
          absa_info: "Conta 000207080810102829586 | NIB 000207080810102829586"
        }
      };

      const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        return { success: true, method: "emailjs" };
      } else {
        const errorText = await response.text();
        console.warn("Resposta não-OK do EmailJS:", errorText);
      }
    } catch (err) {
      console.warn("Falha na chamada EmailJS, acionando fallback mailto:", err);
    }
  }

  // 2. Fallback: URL mailto pronta para envio pelo cliente padrão de e-mail
  const mailtoUrl = `mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;

  return {
    success: true,
    method: "mailto",
    mailtoUrl,
    bodyText,
    subject
  };
}
