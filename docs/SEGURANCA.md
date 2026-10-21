# Política de Segurança e Modelo de Ameaças — MEGASON MVP

> **Sistema:** Gestão de Subscrições ChatGPT Plus (GPT-6 Astra)  
> **Empresa:** MEGASON  
> **Desenvolvedor:** Zedecks IT  
> **Classificação:** Documento Técnico de Segurança (DevSecOps)

---

## 1. Princípios de Segurança e Modelo de Confiança

A arquitetura do MVP foi concebida sob o paradigma **Zero Trust no Cliente**:
- **O navegador do cliente é um ambiente não-confiável:** Nenhuma validação feita apenas no JavaScript do frontend (DOM) é considerada garantia de segurança.
- **Autoridade Centrada no Firestore (`firestore.rules`):** Todas as regras de negócio críticas (quem pode ler, quem pode criar, quem pode aprovar e quais valores monetários são aceites) são forçadas diretamente no banco de dados em nuvem.
- **Nenhum Segredo no Repositório:** A aplicação não armazena chaves privadas, service accounts JSON ou credenciais mestras do ChatGPT Plus no código estático ou no versionamento Git.

---

## 2. Controle de Acesso Baseado em Papéis (RBAC)

O sistema define estritamente três papéis operacionais:

```
[ Visitante Anónimo ] ───> Pode apenas ler planos públicos (/plans e /settings/public).
                                │
[ Cliente (customer) ] ──> Apenas cria faturas e subscrições com status "pending"
                                │  e valores oficiais (300, 550, 800, 1000 MT).
                                │  Lê exclusivamente os seus próprios documentos.
                                │
[ Administrador (admin) ] > Valida comprovativos SMS, aprova pedidos,
                                   atribui pastas ChatGPT Plus e gere finanças.
```

### Matriz de Permissões no Cloud Firestore

| Recurso / Coleção | Visitante | Cliente (`customer`) | Administrador (`admin`) |
| :--- | :---: | :---: | :---: |
| `plans/{planId}` | Leitura | Leitura | Leitura e Escrita |
| `settings/public` | Leitura | Leitura | Leitura e Escrita |
| `users/{userId}` | Nenhuma | Lê e atualiza apenas o próprio perfil (sem alterar `role`) | Leitura e Criação/Edição irrestrita |
| `subscriptions/{id}` | Nenhuma | Cria apenas com `status: "pending"` e lê apenas as suas | Leitura, Aprovação, Suspensão e Reativação |
| `invoices/{id}` | Nenhuma | Cria apenas com `status: "pending"` e anexa `proofText` | Leitura, Confirmação (`status: "paid"`) e Cancelamento |
| Qualquer outra coleção | **Bloqueio total** | **Bloqueio total** | **Bloqueio total** |

---

## 3. Matriz de Vetores de Ataque e Mitigações

### 3.1. Tentativa de Escalada de Privilégios (Privilege Escalation)
- **Vetor:** Utilizador malicioso tenta alterar seu documento `users/{uid}` via console do navegador definindo `role: "admin"`.
- **Mitigação:** A regra do Firestore proíbe explicitamente que utilizadores alterem o campo `role`:
  ```javascript
  request.resource.data.role == resource.data.role
  ```
  A promoção para Administrador só pode ser feita manualmente pelo proprietário na Consola do Firebase ou por outro Administrador autenticado.

### 3.2. Adulteração de Preço no Checkout (Price Tampering)
- **Vetor:** Cliente inspeciona o DOM ou a requisição e altera o valor de 1.000 MT para 1 MT ao submeter o pedido.
- **Mitigação:**
  1. No frontend, o valor é obtido exclusivamente do snapshot canónico do catálogo (`js/services/plans.js`).
  2. No Firestore, a regra de segurança rejeita qualquer subscrição ou fatura cujo preço ou montante não pertença à lista estrita:
     ```javascript
     function isValidPlanPrice(price) {
       return price in [300, 550, 800, 1000];
     }
     ```

### 3.3. Auto-Aprovação de Pagamento (Unauthorized State Transition)
- **Vetor:** Cliente tenta emitir um `updateDoc` marcando a sua própria fatura como `status: "paid"` e subscrição como `status: "active"`.
- **Mitigação:** O utilizador comum tem permissão apenas para atualizar o campo `proofText` enquanto o status for `pending`. Qualquer tentativa de alterar `status`, `amount` ou `paidAt` é sumariamente rejeitada pelo Firestore:
  ```javascript
  request.resource.data.status == resource.data.status &&
  request.resource.data.paidAt == resource.data.paidAt
  ```

### 3.4. Acesso Cruzado a Dados de Outros Utilizadores (IDOR)
- **Vetor:** Utilizador tenta ler subscrições, comprovativos ou números de WhatsApp de outros clientes alterando os IDs nas consultas.
- **Mitigação:** Regra estrita de posse:
  ```javascript
  allow read: if (isAuthenticated() && resource.data.userId == request.auth.uid) || isAdmin();
  ```

### 3.5. Ataques de Injeção em Comprovativo SMS (XSS / Prompt Injection)
- **Vetor:** Inserção de scripts maliciosos (`<script>`, `<img onerror=...>`) no texto do SMS de comprovativo para executar código na sessão do operador.
- **Mitigação:**
  1. O texto do comprovativo é tratado puramente como string (`textContent`) em elementos `<pre>` e `.proof-box` protegidos.
  2. Uso de sanitização nativa, impedindo interpretação de HTML no DOM.

---

## 4. Auditoria da Cadeia de Suprimentos (Supply Chain)

- **Zero Dependências npm no Frontend:** O projeto não utiliza pacotes Node.js, empacotadores Webpack/Vite com centenas de dependências transitivas vulneráveis, nem bibliotecas não-verificadas.
- **SDKs Canónicos Oficiais:** Apenas o SDK modular oficial do Firebase (`https://www.gstatic.com/firebasejs/10.8.0/...`) servido pela infraestrutura global do Google via HTTPS.
- **Sem CDNs de Ícones:** Todos os ícones são SVGs inline incorporados no próprio HTML, eliminando vetores de comprometimento de terceiros (FontAwesome, Unpkg, etc.) e garantindo carregamento instantâneo offline.

---

## 5. Procedimentos de Emergência e Resposta a Incidentes

Em caso de suspeita de comprometimento de conta ou tentativa de fraude:
1. **Suspensão Imediata de Acesso:** O Administrador pode suspender qualquer subscrição pelo painel com 1 clique no botão `Suspender`.
2. **Revogação de Acesso no ChatGPT Plus:** O operador altera a senha mestra da conta ChatGPT Plus e atualiza as credenciais dos clientes legítimos.
3. **Auditoria de Faturas:** O histórico de faturas canceladas preserva a data, o SMS submetido e o utilizador responsável para averiguação policial ou interna.
