# Registo de Decisões Arquitecturais (ADR) — MVP Subscrições MEGASON

## 1. Contexto e Restrições de Negócio
- **Sistema & Cliente:** MEGASON (comercialização e operação das subscrições).
- **Desenvolvedora & Titularidade do Código:** Zedecks IT.
- **Orçamento:** 8.500 MT.
- **Modelo:** Venda e partilha manual de acessos/pastas ChatGPT Plus para utilizadores finais da MEGASON.
- **Ambiente de Produção:** GitHub Pages no domínio personalizado `ai.admin-megason.com`.

---

## 2. Decisões Arquitecturais

### ADR 001: Arquitectura 100% Estática no Frontend (Vanilla JS)
- **Decisão:** Não utilizar frameworks de compilação como React, Vue, Angular, Svelte ou Next.js, nem runtime Node.js como backend. Adotar HTML5 semântico, CSS moderno estruturado em tokens e JavaScript Vanilla com módulos ES nativos (`import`/`export`).
- **Justificação:** Redução total de custos de infraestrutura de servidor, conformidade com o GitHub Pages e orçamento de 8.500 MT, garantindo carregamento instantâneo, manutenibilidade direta e ausência de dependências frágeis no longo prazo.
- **Alternativas Rejeitadas:** React/Next.js (aumentaria drasticamente a complexidade de deploy, builds e custos de hospedagem desnecessários).

### ADR 002: Backend-as-a-Service com Firebase (Auth + Firestore)
- **Decisão:** Utilizar o Firebase Authentication para gerir identidade e sessões de utilizadores, e o Cloud Firestore como banco de dados NoSQL transacional.
- **Justificação:** Permite operações seguras diretamente a partir do cliente estático, delegando segurança às **Firestore Security Rules**. O tier gratuito do Firebase Spark cobre perfeitamente o volume inicial deste MVP sem custos de servidor.
- **Alternativas Rejeitadas:** Criar uma API REST própria em Node.js/Express ou Python (inviável no teto de 8.500 MT e exigiria um servidor sempre ativo com manutenção e custos mensais).

### ADR 003: Comprovativo de Pagamento Exclusivamente em Texto
- **Decisão:** Descartar qualquer upload de arquivos de imagem/PDF para comprovativos. O utilizador submete o comprovativo copiando e colando a mensagem SMS (ex.: M-Pesa / E-Mola) ou código da transação diretamente num campo de texto.
- **Justificação:** Elimina a necessidade do Firebase Storage, simplifica a conferência pelo administrador e previne custos adicionais e riscos de segurança associados a upload de ficheiros maliciosos.
- **Alternativas Rejeitadas:** Firebase Storage com upload de imagens (aumentaria a complexidade do cliente, consumo de largura de banda e custos).

### ADR 004: Confirmação e Atribuição de Acesso 100% Manual
- **Decisão:** Não integrar gateways ou webhooks de pagamento automático. O cliente envia o comprovativo em texto, a fatura permanece como `pending`, e o administrador autenticado confere a receção dos fundos, marca a fatura como `paid` e preenche as credenciais/pasta de acesso na subscrição.
- **Justificação:** Respeito integral ao escopo do MVP, sem taxas de intermediação de terceiros ou necessidade de credenciamento bancário formal.

### ADR 005: Identidade Visual e Estilo (Light Mode ChatGPT/OpenAI)
- **Decisão:** Interface estritamente em Light Mode, com cores e tipografia limpa inspiradas na estética moderna do ChatGPT/OpenAI (tons neutros, cinzas sutis e verde discreto). Ícones exclusivamente em SVG inline. Proibição expressa de emojis como ícones da interface.
- **Justificação:** Garante uma experiência visual profissional, corporativa e sem distrações visuais ou inconsistências de renderização entre diferentes sistemas operacionais.

### ADR 006: Identidade da Marca (MEGASON) e Titularidade de Desenvolvimento (Zedecks IT)
- **Decisão:** O nome oficial do produto e da plataforma é **MEGASON**. A marca comercial e o serviço pertencem à MEGASON. A **Zedecks IT** atua exclusivamente como desenvolvedora do software e detentora dos direitos autorais sobre a arquitetura e código-fonte da aplicação.
- **Justificação:** Garantir separação clara entre a marca do cliente perante os seus utilizadores finais e a empresa de tecnologia responsável pelo fornecimento e evolução do código.
- **Impacto:** Todas as interfaces voltadas ao público (títulos, cabeçalhos, chamadas promocionais e suporte) refletem a MEGASON. As indicações de rodapé, metadados e documentação técnica identificam formalmente a Zedecks IT como desenvolvedora e mantenedora.

### ADR 007: Gestão de Identidade Moçambicana e RBAC Seguro no Cliente
- **Decisão:** O cadastro de utilizadores exige campos contextuais de Moçambique: as 11 províncias canónicas em select, validação de números de WhatsApp com operadoras nacionais (Vodacom 84/85, Movitel 86/87, Tmcel 82/83) e verificação anti-bot explícita. O papel `role: "customer"` é forçado na criação de qualquer conta pelo cliente; a promoção para `admin` só pode ser realizada diretamente na consola do Cloud Firestore ou por outro administrador autenticado via regras de segurança.
- **Justificação:** Previne fraudes, garante que os acessos ao ChatGPT Plus sejam entregues no canal móvel correto (WhatsApp) e impede ataques de auto-elevação de privilégios.

### ADR 008: Restrição de Criação de Contas ao Funil de Comprovativo e Criação Administrativa
- **Decisão:** O utilizador final não pode criar contas avulsas livremente na aplicação sem selecionar um plano e anexar o comprovativo SMS de pagamento. O modal de autenticação pública disponibiliza apenas Login e Recuperação de Senha, além de uma consulta de correspondência (*match*) por WhatsApp ou Email para permitir que clientes que já efetuaram uma transferência prévia finalizem a sua senha. Adicionalmente, o Administrador passa a ter a faculdade exclusiva de cadastrar novos clientes manualmente pelo Painel Administrativo, atribuindo planos com liberação imediata de pastas e credenciais.
- **Justificação:** Elimina cadastros ociosos e spam de contas sem intenção de compra, blinda o funil de conversão transacional e confere à equipa da MEGASON a flexibilidade operacional de registar clientes atendidos presencialmente ou por canais diretos (WhatsApp).

---

## 3. Mapeamento de Ferramentas, Agentes e Skills do Antigravity

Em alinhamento com a diretriz de orquestração simultânea (`/agent-orchestrator` e `agent-squad`), o projeto opera sob coordenação deliberada de agentes especializados e skills dedicadas a cada dimensão do MVP:

### 3.1. Esquadrão Especializado de Agentes (The Squad):
| Agente | Papel | Fase de Atuação | Responsabilidade no MVP MEGASON |
| :--- | :--- | :--- | :--- |
| **Rex** | **Analista** | Requisitos & Negócio | Mapeamento das regras de Moçambique (11 províncias, M-Pesa, E-Mola, Absa), plano 30/60/90/120d e fatura interna de cobrança. |
| **Alex** | **Estrategista** | Planeamento | Estruturação do funil de conversão (Passo 1 ao 3), restrição de cadastro ao comprovativo e roteiro por fases. |
| **Aria** | **Arquiteta** | Arquitetura | Modelo de dados Cloud Firestore (`users`, `subscriptions`, `invoices`), isolamento RBAC e regras de segurança sem backend Node/Python. |
| **Mason** | **Construtor** | Implementação | Frontend Vanilla JS modular (ES Modules), CSS3 puro (tokens OpenAI/ChatGPT) e componentes de interface sem frameworks pesados. |
| **Luna** | **Revisora** | Code Review | Auditoria estrita de Clean Code, eliminação de código órfão, ausência de dependências npm/CDN desnecessárias e integridade de tags. |
| **Quinn** | **QA Tester** | Testes & Segurança | Auditoria contra injeção e adulteração de valores, validação de fluxo de SMS em texto e testes de guarda de rotas administrativas. |
| **Max** | **Otimizador** | UX & Responsividade | **Guardião da Responsividade Mobile-First:** Touch targets mínimos de 44px, grids fluidos (`form-grid-2`), adaptabilidade em telas de 320px–480px e zero overflow horizontal. |
| **Dep** | **DevOps** | Entrega & Publicação | Configuração do GitHub Pages estático, domínio personalizado `ai.admin-megason.com` (CNAME) e integridade de deploy. |

### 3.2. Skills Ativas e Validadas via `agent-orchestrator`:
- **`agent-orchestrator`**: Meta-skill central de varredura de capacidades, registry management e coordenação de fluxo de dados.
- **`mobile-design`**: Filosofia Touch-First, Battery-Conscious e Platform-Respectful para garantir que o sistema não assuma padrões de desktop em dispositivos móveis.
- **`ux-audit`**: Verificação das heurísticas de usabilidade, prevenção de erros e clareza no envio de comprovativos.
- **`ui-a11y`**: Acessibilidade visual (contraste light mode, foco de inputs e rotulagem acessível de formulários).
- **`security-audit`**: Auditoria do modelo de ameaças no Firestore para garantir que regras de autorização não dependam apenas do navegador.
- **`clean-code`**: Código autodocumentado, nomes semânticos em inglês e comentários explicativos objetivos em PT-BR.

### 3.3. Limitações Técnicas Detectadas e Mitigadas:
1. **Restrição de Memória do Host Local:** O ambiente de execução do terminal WSL2 apresentou limitação de fork. Mitigada através do isolamento de storage em `/tmp/orchestrator_data` e execução direta para preservar a estabilidade da IDE.
2. **Ambiente Estático Puro:** Nenhuma operação privilegiada confia no cliente; toda regra é garantida e travada pelas regras de segurança do Firestore (`firestore.rules`).

---

## 4. Pressupostos e Dados Pendentes do Cliente
Para as fases seguintes de configuração e homologação, será necessário:
1. Criação do projeto no Firebase Console (plano gratuito Spark).
2. Ativação do Authentication (Email/Senha e Google Provider).
3. Obtenção do objeto público de configuração `firebaseConfig` (a ser inserido em `js/config/firebase-config.js`).
4. Definição do email que receberá o primeiro papel de Administrador na consola do Firestore.
