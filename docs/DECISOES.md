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

---

## 3. Mapeamento de Ferramentas, Agentes e Skills do Antigravity

### Skills Relevantes Identificadas no Ambiente:
- `architect-review`: Para validação contínua da coesão arquitetural e simplicidade.
- `security-audit` / `sast-scanning`: Para auditoria de regras de segurança no Firestore e revisão de formulários.
- `clean-code`: Para garantir consistência semântica e clareza no código vanilla.
- `frontend-design`: Para implementação fiel do padrão visual OpenAI/ChatGPT em CSS limpo.

### Limitações Técnicas Detectadas:
1. **Restrição de Memória do Host Local:** O ambiente de execução do terminal apresentou limitação temporária para alocação de novos processos via `fork/exec`. Todas as operações de inspeção, escrita e validação estrutural são coordenadas diretamente via ferramentas nativas de arquivos para garantir confiabilidade.
2. **Ambiente Estático Puro:** Nenhuma lógica de validação privilegiada pode residir no cliente sem ser garantida e travada pelas regras de segurança do Firestore (`firestore.rules`).

---

## 4. Pressupostos e Dados Pendentes do Cliente
Para as fases seguintes de configuração e homologação, será necessário:
1. Criação do projeto no Firebase Console (plano gratuito Spark).
2. Ativação do Authentication (Email/Senha e Google Provider).
3. Obtenção do objeto público de configuração `firebaseConfig` (a ser inserido em `js/config/firebase-config.js`).
4. Definição do email que receberá o primeiro papel de Administrador na consola do Firestore.
