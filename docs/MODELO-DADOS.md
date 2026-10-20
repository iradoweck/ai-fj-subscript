# Modelo de Dados, Estados e Regras de Negócio — MEGASON MVP
> Desenvolvido por Zedecks IT

> **Documento de Especificação Técnica:** Fase 1  
> **Banco de Dados:** Cloud Firestore (NoSQL Document Store)  
> **Moeda Oficial:** Metical de Moçambique (`MZN`)

---

## 1. Esquema de Colecções no Cloud Firestore

### 1.1. Colecção `users/{uid}`
Armazena os perfis cadastrais dos utilizadores. O ID do documento é estritamente o `uid` gerado pelo Firebase Authentication.

| Campo | Tipo | Obrigatório | Descrição / Restrição |
| :--- | :--- | :---: | :--- |
| `uid` | `string` | Sim | Identificador único emitido pelo Firebase Auth. |
| `fullName` | `string` | Sim | Nome completo do utilizador. |
| `username` | `string` | Sim | Nome de utilizador para identificação rápida. |
| `email` | `string` | Sim | Endereço de email registado. |
| `whatsappNumber` | `string` | Sim | Número de telefone com WhatsApp (contacto principal). |
| `province` | `string` | Sim | Província de residência (ex.: Maputo Cidade, Gaza, Sofala, Nampula, etc.). |
| `district` | `string` | Sim | Distrito de residência. |
| `neighborhood` | `string` | Sim | Bairro de residência. |
| `isHumanVerified` | `boolean` | Sim | Confirmação da verificação humana ("Sou Humano"). |
| `role` | `string` | Sim | Papel no sistema: `'user'` (padrão) ou `'admin'`. **Imutável pelo cliente.** |
| `status` | `string` | Sim | Estado da conta: `'active'` (padrão) ou `'disabled'`. |
| `createdAt` | `timestamp` | Sim | Data e hora de criação do registo. |
| `updatedAt` | `timestamp` | Sim | Data da última actualização do perfil. |

> **Regra de Segurança Crítica:** O formulário de registo e os utilizadores autenticados apenas podem escrever `role: 'user'` e `status: 'active'`. A elevação para `admin` é restrita à consola Firebase.

---

### 1.2. Colecção `plans/{planId}`
Registo estático dos planos comerciais oferecidos para o serviço ChatGPT Plus.
> **Regra Mandatória:** Todos os planos contêm rigorosamente os mesmos recursos de inteligência artificial (modelos avançados, criação de texto/código, imagens, análise de documentos, voz e pasta individual). O diferencial é apenas o valor cobrado e a duração em dias.

| Document ID | `name` | `price` | `currency` | `durationDays` | `active` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `plan-30d` | Plano 30 Dias | `300` | `MZN` | `30` | `true` |
| `plan-60d` | Plano 60 Dias | `550` | `MZN` | `60` | `true` |
| `plan-90d` | Plano 90 Dias | `800` | `MZN` | `90` | `true` |
| `plan-120d` | Plano 120 Dias | `1000` | `MZN` | `120` | `true` |

Campos adicionais no documento:
- `description` (`string`): Resumo das funcionalidades (modelos de IA, imagens, análise, voz).
- `createdAt` (`timestamp`): Data de inserção inicial.

---

### 1.3. Colecção `subscriptions/{subscriptionId}`
Representa a subscrição contratada pelo cliente.

| Campo | Tipo | Obrigatório | Descrição / Restrição |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Sim | ID único da subscrição. |
| `userId` | `string` | Sim | UID do utilizador titular da subscrição. |
| `planId` | `string` | Sim | Identificador do plano contratado (`plan-30d`, etc.). |
| `planNameSnapshot` | `string` | Sim | Nome do plano no momento da subscrição. |
| `priceSnapshot` | `number` | Sim | Preço oficial do plano no momento da compra (MZN). |
| `durationDaysSnapshot` | `number` | Sim | Duração em dias contratada. |
| `status` | `string` | Sim | `'pending'`, `'active'`, `'suspended'`, `'expired'`, `'cancelled'`. |
| `accessCredentials` | `map` | Não | Dados de acesso (ex.: `{ folderName: string, notes: string }`). |
| `createdAt` | `timestamp` | Sim | Momento em que o pedido de subscrição foi criado. |
| `startAt` | `timestamp` | Não | Data em que a subscrição foi ativada após validação do pagamento. |
| `expiresAt` | `timestamp` | Não | Data de expiração (`startAt + durationDays`). |
| `approvedAt` | `timestamp` | Não | Data em que o administrador aprovou. |
| `approvedBy` | `string` | Não | UID do administrador que efetuou a aprovação. |

---

### 1.4. Colecção `invoices/{invoiceId}`
Facturas internas para controlo e registo de cobrança (sem valor fiscal oficial).

| Campo | Tipo | Obrigatório | Descrição / Restrição |
| :--- | :--- | :---: | :--- |
| `id` | `string` | Sim | ID único da factura. |
| `userId` | `string` | Sim | UID do cliente associado. |
| `subscriptionId` | `string` | Sim | ID da subscrição à qual esta factura pertence. |
| `invoiceNumber` | `string` | Sim | Identificador amigável (ex.: `INV-2026-0001`). |
| `description` | `string` | Sim | Descrição do serviço prestado (ex.: "ChatGPT Plus - 30 Dias"). |
| `amount` | `number` | Sim | Valor cobrado em Meticais (MZN). |
| `currency` | `string` | Sim | Moeda fixada em `'MZN'`. |
| `proofText` | `string` | Não | Comprovativo colado pelo cliente exclusivamente em **TEXTO**. |
| `status` | `string` | Sim | Estado: `'pending'`, `'paid'` ou `'cancelled'`. |
| `issuedAt` | `timestamp` | Sim | Data de emissão da factura. |
| `dueAt` | `timestamp` | Sim | Data de vencimento da factura. |
| `paidAt` | `timestamp` | Não | Data da confirmação manual do pagamento. |
| `paidBy` | `string` | Não | UID do administrador que confirmou o pagamento. |

---

### 1.5. Documento Público `settings/public`
Contém as configurações públicas da MEGASON acessíveis a visitantes e utilizadores:

```json
{
  "businessName": "MEGASON",
  "domain": "ai.admin-megason.com",
  "paymentMethods": {
    "mpesa": { "title": "M-Pesa", "account": "842256366 – FRANCISCO" },
    "emola": { "title": "E-Mola", "account": "861557953 – FRANCISCO" },
    "absa": { "title": "Absa Bank", "account": "Conta 0708101028295" }
  },
  "proofInstructions": "Envie apenas comprovativos em formato TEXTO (copie e cole a notificação SMS ou código). Não são permitidas fotos, imagens ou PDFs."
}
```

---

## 2. Máquina de Estados e Transições

### 2.1. Estados da Subscrição
```
 [Cliente submete pedido] 
           │
           ▼
     ┌───────────┐
     │  pending  │ (Aguardando conferência do pagamento)
     └─────┬─────┘
           │ (Admin valida fatura e aprova)
           ▼
     ┌───────────┐       (Admin suspende)       ┌─────────────┐
     │  active   │ ───────────────────────────> │  suspended  │
     └─────┬─────┘ <─────────────────────────── └─────────────┘
           │             (Admin reativa)
           │ (Data atual > expiresAt)
           ▼
     ┌───────────┐
     │  expired  │
     └───────────┘
```
- **Cancelamento:** Uma subscrição em `pending` pode transitar para `cancelled` se a factura associada for rejeitada ou cancelada.
- **Histórico Preservado:** A desativação ou suspensão de um cliente nunca remove nem modifica o histórico de faturas e subscrições anteriores.

### 2.2. Estados da Factura
```
 [Subscrição criada] ───>  pending  (Aguardando receção de fundos)
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
                paid                  cancelled
     (Admin confirma fundos)     (Rejeição ou desistência)
```
- **Imutabilidade do Utilizador:** O cliente nunca tem autorização para marcar a sua própria factura como `paid`.

---

## 3. Gestão e Criação Segura da Primeira Conta de Administrador

Para evitar a introdução de falhas de segurança no frontend:
1. **Registo Normal:** O administrador cria uma conta regular utilizando a interface com o seu endereço de email.
2. **Definição de Papel Privilegiado:** O proprietário acede à Consola do Firebase:
   - Navega até `Cloud Firestore` > Colecção `users`.
   - Localiza o documento correspondente ao seu `uid`.
   - Altera o campo `role` de `"user"` para `"admin"`.
3. **Validação nas Regras do Firestore:**
   - As regras de segurança verificam o documento `users/$(request.auth.uid)`:
     ```
     function isAdmin() {
       return request.auth != null && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
     }
     ```
4. **Sem Portas Traseiras:** Não existe qualquer função no código JavaScript ou parâmetro de URL que permita auto-promoção.

---

## 4. Limites de Operação no Navegador e Segurança

| Operação | Permitida no Navegador? | Mecanismo de Garantia |
| :--- | :---: | :--- |
| Criar conta e perfil inicial | Sim | Validação no cliente + Regras do Firestore forçando `role == 'user'`. |
| Criar subscrição e fatura | Sim | Preços obtidos a partir dos dados do plano e gravados como snapshot. |
| Colar comprovativo em texto | Sim | Cliente atualiza apenas o campo `proofText` da sua própria fatura `pending`. |
| Marcar fatura como paga | **Não (Apenas Admin)** | Regra de escrita no Firestore rejeita alterações no campo `status` ou `paidAt` por utilizadores comuns. |
| Atribuir pasta/senhas | **Não (Apenas Admin)** | Regra de escrita no Firestore restringe atualização de `accessCredentials` a administradores. |
| Suspender ou desativar utilizador | **Não (Apenas Admin)** | Exige `isAdmin() == true` nas regras de segurança do Firestore. |
