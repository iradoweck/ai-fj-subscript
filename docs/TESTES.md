# Guia de Testes Essenciais e Validação — MEGASON MVP

> **Aplicação:** Subscrições ChatGPT Plus (GPT-6 Astra)  
> **Empresa:** MEGASON  
> **Desenvolvido por:** Zedecks IT  
> **Responsável de QA:** Quinn (QA Tester) & Max (UX & Responsividade)

---

## 1. Matriz de Casos de Teste Funcionais e de Segurança

| ID | Cenário de Teste | Ação Executada | Resultado Esperado | Status |
| :---: | :--- | :--- | :--- | :---: |
| **TC-01** | **Navegação de Visitante** | Aceder à raiz `/index.html` sem sessão iniciada. | Visualizar proposta de valor, recursos, "Como Funciona", 4 planos em MZN e dados de pagamento. | **Aprovado** |
| **TC-02** | **Bloqueio de Cadastro Avulso** | Clicar em "Entrar" no topo da página. | Exibir modal de Login com aviso instrutivo de que a conta é criada no checkout com comprovativo. | **Aprovado** |
| **TC-03** | **Ativação por Match** | Inserir WhatsApp/Email na opção de comprovativo existente. | Localizar fatura correspondente e permitir definir senha para ativar conta. Se inexistente, bloquear. | **Aprovado** |
| **TC-04** | **Validação de Telefone MZ** | Inserir números móveis moçambicanos (Vodacom, Movitel, Tmcel). | Aceitar 84/85, 86/87, 82/83 com ou sem +258. Rejeitar números estrangeiros ou operadoras inválidas. | **Aprovado** |
| **TC-05** | **Integridade de Preço** | Submeter pedido de subscrição e fatura. | O preço gerado deve ser estritamente 300, 550, 800 ou 1.000 MT. Rejeitar qualquer valor manipulado. | **Aprovado** |
| **TC-06** | **Comprovativo em Texto Puro** | Colar SMS de transferência no Passo 2 do checkout. | Gravar o texto do SMS na fatura interna com status inicial `pending`. Upload de mídia desativado. | **Aprovado** |
| **TC-07** | **Acesso ao Painel Admin (Não Autorizado)** | Utilizador comum (`customer`) ou anónimo tenta abrir `/admin`. | O sistema bloqueia com tela de "Acesso Negado". Nenhum dado financeiro ou de cliente é exposto. | **Aprovado** |
| **TC-08** | **Acesso ao Painel Admin (Autorizado)** | Administrador com `role: "admin"` acede a `/admin`. | Painel liberado com KPIs financeiros consolidados, lista de subscrições e faturas. | **Aprovado** |
| **TC-09** | **Aprovação de Pagamento** | Admin confere SMS, clica em "Aprovar" e preenche pasta/credenciais. | Subscrição torna-se `active` com cálculo de término; fatura marcada como `paid`. | **Aprovado** |
| **TC-10** | **Cadastramento Direto pelo Admin** | Admin clica em "+ Novo Cliente & Plano" e cadastra cliente. | Cria utilizador, plano ativo e fatura paga, gerando mensagem pronta para o WhatsApp. | **Aprovado** |
| **TC-11** | **Suspensão e Reativação** | Admin suspende uma conta ativa e posteriormente reativa. | Status atualizado para `suspended` com motivo gravado; histórico financeiro 100% preservado. | **Aprovado** |
| **TC-12** | **Responsividade Mobile (320px–640px)** | Redimensionar a janela para telas móveis e testar formulários e modais. | Modais respeitam a altura da tela (`max-height: 90vh`), cabeçalho e rodapé fixos com scroll vertical suave. | **Aprovado** |
| **TC-13** | **Auditoria de Emojis e Créditos** | Varrer o código-fonte contra emojis na UI e verificar créditos de rodapé. | Zero emojis na interface (SVGs puros). Marca MEGASON preservada; crédito discreto: `Dev. By Zedeck's IT.`. | **Aprovado** |

---

## 2. Execução Automatizada da Suíte de Testes

Os testes automatizados podem ser executados no ambiente local através do comando:

```bash
python3 scripts/run_tests.py
```

O script valida programaticamente as funções de domínio, a sintaxe das regras do Cloud Firestore e a integridade de todas as páginas da aplicação.
