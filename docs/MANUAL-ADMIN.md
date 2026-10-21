# Manual Operacional do Painel Administrativo — MEGASON

> **Aplicação:** Subscrições ChatGPT Plus (GPT-6 Astra)  
> **Empresa Titular:** MEGASON  
> **Desenvolvido por:** Zedecks IT  
> **Acesso Web:** `https://ai.admin-megason.com/admin.html` (ou local `admin.html`)

---

## 1. Visão Geral e Segurança de Acesso

O **Painel Administrativo da MEGASON** é a central de controlo operacional para verificação manual de transferências financeiras (M-Pesa, E-Mola e Absa Bank) e disponibilização de acessos e pastas exclusivas do ChatGPT Plus.

### Regras de Acesso e RBAC
- **Acesso Restrito:** Apenas utilizadores com o atributo `role: "admin"` no documento `users/{uid}` do Cloud Firestore conseguem visualizar dados e executar operações no painel.
- **Proteção Automática (Route Guard):** Visitantes anónimos ou clientes com `role: "customer"` que tentem aceder ao `/admin.html` deparam-se imediatamente com a tela de bloqueio e são impedidos de consultar dados confidenciais ou métricas financeiras.
- **Segurança Nativa:** Toda a segurança é reforçada a nível do Cloud Firestore (`firestore.rules`). Tentativas de manipulação de parâmetros no navegador são bloqueadas diretamente pelo banco de dados.

---

## 2. Fluxo Operacional: Do Pedido à Liberação da Pasta

```
[Cliente no Site] ──> Escolhe Plano (30, 60, 90 ou 120 dias)
         │
         ├──> Faz Transferência (M-Pesa, E-Mola ou Absa)
         │
         └──> Submete SMS do Comprovativo + Cadastro
                      │
                      ▼
[Fila do Painel Admin] ──> Alerta no KPI "Aguardando Análise"
         │
         ├──> 1. Operador clica em "SMS" e confere no telemóvel/banco da empresa
         │
         ├──> 2. Se o valor e remetente coincidirem:
         │         - Cria pasta dedicada no ChatGPT Plus com o nome do cliente
         │         - Clica no botão "Aprovar"
         │         - Insere o nome da pasta e as instruções de acesso
         │
         └──> 3. Subscrição fica "Ativa" e Fatura marcada como "Paga"
               (Cliente vê imediatamente os dados no seu modal "Minha Subscrição")
```

---

## 3. Gestão de Subscrições e Ações Disponíveis

Na aba **"Subscrições & Pedidos"**, o operador tem à disposição:

| Ação | Quando Utilizar | Efeito no Sistema |
| :--- | :--- | :--- |
| **SMS (Ver Detalhes)** | Sempre que um novo pedido chegar com status `Pendente`. | Abre o modal com o texto exato do SMS de transferência enviado pelo cliente, nome, email e WhatsApp. |
| **Aprovar & Ativar** | Após confirmação do crédito na conta ou carteira da MEGASON. | Ativa o acesso, calcula data de início e término (`startDate` e `endDate`), marca fatura como `Paga` e entrega a pasta ao cliente. |
| **Suspender** | Em casos de incumprimento, uso indevido ou pedido de pausa. | Desativa temporariamente o acesso do cliente, exigindo o preenchimento do motivo. O histórico financeiro é 100% preservado. |
| **Reativar** | Quando a situação da conta suspensa for regularizada. | Devolve o status `Ativa` à subscrição. |
| **Recusar / Rejeitar (✕)** | Comprovativo falso, SMS inexistente no extrato ou valor incorreto. | Marca o pedido e a fatura vinculada como `Cancelada`, registando o motivo para fins de auditoria. |

### 3.1. Cadastramento Direto de Cliente pelo Administrador (+ Novo Cliente & Plano)
Para clientes atendidos diretamente no balcão ou via WhatsApp que efetuam o pagamento por outros meios ou necessitam de atendimento assistido:
1. Clique no botão **`+ Novo Cliente & Plano`** no topo do painel.
2. Preencha os dados do cliente: Nome, Email, WhatsApp e Província.
3. Clique em **`Gerar`** para obter uma senha temporária segura ou digite uma senha específica.
4. Selecione o plano adquirido (30, 60, 90 ou 120 dias) e o meio de pagamento (M-Pesa, E-Mola, Absa ou Dinheiro).
5. O sistema sugere automaticamente o nome da pasta (ex: `MEGASON - [Nome]`). Preencha as credenciais e orientações de acesso.
6. Mantenha a opção *"Ativar subscrição e marcar fatura como PAGA imediatamente"* selecionada.
7. Ao submeter, o sistema cria o cliente, a subscrição e a fatura, e abre uma janela com a **mensagem pronta formatada para o WhatsApp** com todas as instruções para copiar em 1 clique e enviar ao cliente.

---

## 4. Indicadores Financeiros e Auditoria

O painel consolida automaticamente os seguintes indicadores em tempo real:

1. **Receita Confirmada (MT):** Somatório estrito de faturas que foram conferidas e marcadas como pagas (`status: "paid"`). Não computa valores não confirmados.
2. **Total Faturado (MT):** Somatório de faturas emitidas e ativas no sistema, excluindo pedidos rejeitados/cancelados.
3. **Subscritores Ativos:** Número total de clientes com contas em dia e pastas liberadas no momento.
4. **Aguardando Análise:** Total de pedidos pendentes na fila aguardando conferência do operador.

Na aba **"Faturas & Auditoria"**, é possível consultar a listagem de todas as faturas geradas, método de pagamento detetado, data de emissão e identificador do operador responsável pela confirmação.

---

## 5. Pesquisa e Filtros Rápidos

- **Barra de Busca:** Digite o Nome do cliente, Número de WhatsApp (ex: `84XXXXXXX`), Email, ID da Subscrição ou Nome da Pasta para filtragem instantânea em tela.
- **Filtro de Status:** Permite alternar a visualização entre `Pendentes` (para focar na fila de trabalho), `Ativas`, `Suspensas` ou `Canceladas`.

---

## 6. Procedimento de Criação do Primeiro Administrador

Para configurar a primeira conta de administrador com segurança:
1. O administrador deve registar-se normalmente na aplicação com o seu email institucional (ex: `admin@admin-megason.com`).
2. No Console do Firebase (aba **Firestore Database**), aceder à coleção `users`.
3. Localizar o documento correspondente ao UID do administrador.
4. Alterar o campo `role` de `"customer"` para `"admin"`.
5. Recarregar a página `/admin.html`. O sistema concederá acesso imediato e permanente às ferramentas de gestão.

> [!IMPORTANT]
> Nunca partilhe credenciais de administrador em grupos públicos. Mantenha os números de contacto dos clientes em sigilo conforme a Lei de Proteção de Dados.
