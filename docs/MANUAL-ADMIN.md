# Manual Operacional da Central de Gestão — MEGASON

> **Aplicação:** Gestão de Subscrições e Pastas ChatGPT Plus (GPT-6 Astra)  
> **Empresa Titular do Serviço:** MEGASON  
> **Desenvolvido por:** Zedecks IT  
> **Acesso Web:** `https://ai.admin-megason.site/admin` (ou localmente `/admin`)

---

## 1. Visão Geral e Segurança de Acesso

A **Central de Gestão MEGASON** é a plataforma operacional privativa para conferência de transferências financeiras moçambicanas (M-Pesa, E-Mola e Absa Bank), ativação de subscrições e entrega de pastas exclusivas do ChatGPT Plus.

### Regras de Acesso e Controlo de Permissões
- **Acesso Restrito:** Apenas utilizadores credenciados com privilégios de Administrador conseguem visualizar métricas de faturamento, dados de clientes e aceder às ferramentas de gestão.
- **Proteção Automática de Rota (Route Guard):** Qualquer tentativa de acesso anónimo ou de clientes comuns ao endereço `/admin` é bloqueada imediatamente por uma barreira de segurança, impedindo a exibição de dados confidenciais ou valores financeiros.
- **Segurança Nativa em Nuvem:** Todas as permissões são validadas diretamente nos servidores centrais da nuvem MEGASON. Tentativas de adulteração de preços ou permissões através do navegador são rejeitadas automaticamente.

---

## 2. Meios Oficiais de Pagamento Suportados

Para conferência e correspondência nos extratos, os canais autorizados da MEGASON são:

| Canal | Operadora / Banco | Identificador Oficial | Cor de Referência |
| :--- | :--- | :--- | :---: |
| **M-Pesa** | Vodacom Moçambique | **842256366** – FRANCISCO | 🔴 Vermelho |
| **E-Mola** | Movitel Moçambique | **861557953** – FRANCISCO | 🟠 Laranja |
| **Absa Bank** | Absa Bank Moçambique | **Conta:** `0708101028295`<br>**NIB:** `000207080810102829586` | 🔴 Vermelho |

---

## 3. Fluxo Operacional: Do Pedido à Liberação da Pasta

```
[Cliente na Plataforma] ──> Seleciona Plano (30, 60, 90 ou 120 dias)
          │
          ├──> Efetua Transferência (M-Pesa, E-Mola ou Absa)
          │
          └──> Submete SMS do Comprovativo (via Web ou WhatsApp Oficial)
                       │
                       ▼
[Fila da Central Admin] ──> Alerta no Painel em "Aguardando Análise"
          │
          ├──> 1. O Operador clica em "SMS" e confere o crédito no extrato da empresa
          │
          ├──> 2. Se o valor e o remetente coincidirem:
          │         - Cria a pasta dedicada no ChatGPT Plus em nome do cliente
          │         - Clica no botão "Aprovar"
          │         - Insere o nome da pasta e as orientações de login
          │
          └──> 3. Subscrição fica "Ativa" e Fatura marcada como "Paga"
                (O Cliente recebe os dados no WhatsApp e na sua Área de Subscrição)
```

---

## 4. Gestão de Subscrições e Ações Disponíveis

Na aba **"Subscrições & Pedidos"**, o operador tem à disposição:

| Ação | Quando Utilizar | Efeito no Sistema |
| :--- | :--- | :--- |
| **SMS (Ver Detalhes)** | Sempre que um novo pedido chegar com status `Pendente`. | Abre a janela com o texto completo do SMS de transferência, nome, email e WhatsApp do cliente. |
| **Aprovar & Ativar** | Após confirmação do crédito no extrato bancário ou carteira móvel da MEGASON. | Ativa o acesso, calcula automaticamente a data de início e término, marca a fatura como `Paga` e entrega os dados da pasta. |
| **Suspender** | Em caso de incumprimento, uso indevido ou pedido de pausa pelo cliente. | Desativa temporariamente o acesso, registando o motivo. O histórico financeiro é integralmente preservado. |
| **Reativar** | Quando a situação da conta suspensa for regularizada. | Devolve o status `Ativa` à subscrição imediatamente. |
| **Recusar / Rejeitar (✕)** | Comprovativo falso, SMS inexistente no extrato ou valor incorreto. | Marca o pedido e a fatura como `Cancelada`, arquivando o motivo para auditoria. |

---

## 5. Cadastro Assistido (+ Novo Cliente & Plano)

Para clientes atendidos diretamente no balcão da MEGASON ou através do WhatsApp oficial:
1. Clique no botão **`+ Novo Cliente & Plano`** no topo da Central.
2. Preencha os dados do cliente: Nome Completo, Email, WhatsApp e Província.
3. Clique em **`Gerar`** para criar uma senha inicial segura (ou digite uma senha definida com o cliente).
4. Selecione o plano contratado (30, 60, 90 ou 120 dias) e o meio de pagamento utilizado.
5. O sistema sugere automaticamente o formato de pasta: `MEGASON - [Nome]`. Insira as credenciais de acesso ao ChatGPT Plus.
6. Mantenha a opção *"Ativar subscrição e marcar fatura como PAGA imediatamente"* marcada.
7. Ao submeter, o sistema registra o cliente, a subscrição e a fatura na nuvem, e gera instantaneamente a **mensagem formatada pronta para envio no WhatsApp** para copiar em 1 clique.

---

## 6. Indicadores Financeiros e Auditoria em Tempo Real

A Central MEGASON consolida automaticamente:

1. **Receita Confirmada (MT):** Somatório estrito de faturas que foram conferidas e aprovadas pelo operador (`status: "paid"`).
2. **Total Faturado (MT):** Somatório de faturas emitidas e ativas no sistema, desconsiderando pedidos cancelados.
3. **Subscritores Ativos:** Contagem exata de clientes com subscrição em vigor e pastas liberadas no momento.
4. **Aguardando Análise:** Total de pedidos pendentes na fila aguardando conferência do operador.

Na aba **"Faturas & Auditoria"**, é possível auditar cada cobrança, forma de pagamento, data/hora e o operador responsável.

---

## 7. Pesquisa e Filtros Operacionais

- **Barra de Pesquisa:** Digite o Nome do cliente, Telemóvel/WhatsApp (ex: `84XXXXXXX`), Email, ID da Subscrição ou Nome da Pasta para filtragem instantânea em tela.
- **Filtro de Status:** Permite alternar rapidamente para a lista de `Pendentes` (para focar na fila prioritária de liberação), `Ativas`, `Suspensas` ou `Canceladas`.

---

## 8. Procedimento de Ativação de Administradores

Para conceder permissão de Administrador a um colaborador da MEGASON com máxima segurança:
1. O colaborador deve registar-se na plataforma com o seu email corporativo.
2. O Administrador-Mestre acede ao painel de controlo de acessos central e localiza o registo do utilizador.
3. Altera a função de acesso de `"customer"` (cliente) para `"admin"` (administrador).
4. Ao recarregar a página `/admin`, o novo administrador terá acesso completo e irrestrito a todas as ferramentas operacionais.

> [!IMPORTANT]
> Mantenha as senhas administrativas em sigilo. Nunca partilhe dados pessoais ou números de contacto de clientes fora dos canais oficiais da MEGASON.
