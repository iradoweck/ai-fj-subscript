# PROMPT MESTRE — MVP de Subscrições da Zedecks IT

> **Objectivo:** orientar a IDE Google Antigravity a desenvolver, por fases e com validação explícita, um MVP pequeno de gestão de subscrições para uma única empresa (serviço de acesso e contas ChatGPT Plus).
>
> **Orçamento de referência:** 8.500 MT. Este valor exige controlo rigoroso do âmbito. Não acrescentar funcionalidades apenas porque parecem úteis.
>
> **Stack obrigatória:** HTML, CSS e JavaScript vanilla + Firebase Authentication + Cloud Firestore + GitHub Pages.
>
> **Domínio de produção:** `ai.admin-megason.com`
>
> **Idioma:** português em toda a interface e documentação.
>
> **Direcção visual:** interface moderna, limpa, responsiva, apenas em light mode, com cores inspiradas na identidade visual oficial do ChatGPT/OpenAI. Usar SVGs para ícones e ilustrações simples; não usar emojis.
>
> **Repositório:** começar do zero, mas inspeccionar primeiro o ambiente e confirmar que não existe código importante a preservar.

---

## 0. Papel e regras de trabalho

Actua como agente principal de engenharia, responsável por coordenar o trabalho e entregar um MVP funcional, seguro, documentado e pequeno.

### Regras obrigatórias

1. Trabalha **fase por fase**. Não implementes toda a aplicação num único passo.
2. Antes de alterar ficheiros, inspecciona o ambiente, o repositório e as ferramentas disponíveis.
3. Usa agentes especializados e Skills **apenas se estiverem realmente disponíveis na instalação do Antigravity** e forem úteis para a tarefa.
4. Não inventes nomes de agentes, Skills, ferramentas, comandos ou capacidades. Se não houver agentes/Skills adequados, executa a tarefa directamente e regista essa limitação.
5. O agente principal mantém a responsabilidade pela arquitectura, integração, revisão e aceitação final de todo o código.
6. Se delegares trabalho, atribui a cada agente uma tarefa pequena, ficheiros ou entregáveis claros e critérios de aceitação. Evita que vários agentes editem os mesmos ficheiros em simultâneo.
7. Não avances para a fase seguinte até cumprires os critérios de aceitação da fase actual. Se uma falha bloquear o progresso, explica-a e corrige-a primeiro.
8. Mantém a solução proporcional a um MVP de 8.500 MT. Não cries abstrações, camadas, dependências ou sistemas de configuração sem necessidade demonstrável.
9. Não introduzas funcionalidades fora do âmbito, mesmo que sejam consideradas boas práticas em sistemas maiores.
10. Não reveles segredos. Nunca coloques chaves privadas, service-account JSON, tokens administrativos ou credenciais no repositório ou no frontend.
11. Não declares testes, builds, publicação ou configurações como concluídos sem os executar e verificar.
12. Não publiques no GitHub nem alteres contas, projectos Firebase ou configurações remotas sem autorização explícita do utilizador.
13. Mantém o código simples, legível, consistente e fácil de manter.
14. Usa nomes de ficheiros, variáveis, funções e colecções consistentes. O texto da interface deve estar em português.
15. Não implementes uma aplicação de facturação fiscal. As facturas deste MVP são documentos internos de cobrança.

### Processo de agentes e Skills

Na fase inicial:

- Descobre quais os agentes, Skills e ferramentas que o Antigravity disponibiliza realmente.
- Consulta as instruções oficiais locais de cada Skill relevante antes de a utilizar.
- Considera, se estiverem disponíveis, tarefas separadas para:
  - arquitectura e planeamento;
  - interface e acessibilidade;
  - Firebase e segurança;
  - testes e revisão.
- Usa agentes paralelos apenas para tarefas que possam decorrer sem conflitos de edição.
- Exige que cada agente devolva: tarefa realizada, ficheiros alterados, decisões tomadas, testes efectuados e limitações.
- O agente principal revê todos os resultados antes de os integrar.
- Não cries Skills ou agentes novos como requisito do projecto.
- Regista no relatório final quais foram usados. Se nenhum estava disponível, declara-o sem inventar alternativas.

---

## 1. Definição do produto

Construir uma pequena aplicação web para a **Zedecks IT** apresentar o serviço de acesso/contas **ChatGPT Plus**, vender subscrições e gerir manualmente os subscritores e os pagamentos.

### Proposta de valor e recursos apresentados
- **Modelos avançados de IA:** Acesso às versões avançadas de IA.
- **Criação de conteúdos:** Textos, artigos, músicas e ideias.
- **Produtividade e aprendizagem:** Resumos, traduções, explicações didácticas.
- **Programação:** Apoio a códigos, depuração e scripts.
- **Criatividade visual:** Geração e edição de imagens.
- **Documentos:** Análise e processamento de ficheiros e dados.
- **Pesquisa:** Pesquisa online rápida e aprofundada.
- **Voz e multissensorial:** Conversas em tempo real por voz.
- **Aviso transparente:** Os recursos e limites dependem da disponibilidade do serviço e podem variar (o uso não é estritamente ilimitado).

### Planos fixos disponíveis (MZN)
- **Plano 30 Dias:** 350 MT
- **Plano 60 Dias:** 690 MT
- **Plano 90 Dias:** 1.025 MT
- **Plano 120 Dias:** 1.300 MT

### Fluxo "Como Funciona"
1. **Escolha e Pagamento:** O cliente escolhe o plano e efectua o pagamento fora da plataforma pelos canais oficiais (M-Pesa, E-Mola ou Absa Bank).
2. **Registo/Checkout:** Cria a sua conta preenchendo os dados de cadastro e submete o comprovativo de pagamento estritamente em formato texto.
3. **Aprovação e Credenciais:** O administrador confere o pagamento, aprova a subscrição e disponibiliza as senhas/dados de acesso da conta.
4. **Utilização:** O cliente acede à sua conta, cria a sua pasta e utiliza as ferramentas.

### Funcionalidades incluídas

#### Público (Landing Page)
- Landing page moderna, limpa e responsiva (apenas light mode, identidade visual ChatGPT/OpenAI).
- Secção de apresentação clara dos recursos e benefícios do ChatGPT Plus.
- Cartões dos 4 planos fixos com preços e periodicidades transparentes.
- Secção explicativa de "Como Funciona" em 4 passos.
- Instruções públicas dos métodos de pagamento e aviso sobre comprovativos em texto.
- Botões de acção direccionando para o checkout/registo.

#### Registo e Autenticação
- Registo completo de utilizador com os campos obrigatórios:
  - **Nome completo**
  - **Número com WhatsApp** (contacto directo)
  - **Localização:** Província, Distrito e Bairro
  - **Nome de utilizador** e **Senha** (Firebase Auth por email/username + senha)
  - **Confirmação "Sou Humano"** (validação/desafio anti-bot simples no cliente)
- Autenticação e sessão via Firebase Authentication.
- Login com Google através do Firebase Authentication (com solicitação dos campos pendentes caso não venham do perfil Google).
- Recuperação de senha por email.
- Terminar sessão (Logout).
- Validação e mensagens de feedback amigáveis em português.

#### Área do Utilizador (Portal do Subscritor)
- Consulta do perfil cadastrado (nome, WhatsApp, localização).
- Consulta da subscrição activa/pendente (plano escolhido, datas de início e expiração, estado actual).
- Consulta de credenciais/instruções de acesso atribuídas após aprovação (pasta e senhas de acesso).
- Histórico de facturas internas com os respectivos estados (`pendente`, `paga`, `cancelada`).
- Instruções detalhadas para pagamento manual e campo para envio do comprovativo em formato TEXTO.
- Restrição estrita: o utilizador comum nunca pode alterar o seu papel (`role`), datas de validade ou marcar facturas como pagas.

#### Administração
- Acesso restrito a administradores autenticados e autorizados.
- Lista completa de subscritores com pesquisa/filtro básico (nome, WhatsApp, plano, estado).
- Detalhes do subscritor, incluindo comprovativo em texto submetido.
- Gestão de subscrições: aprovar pendentes, atribuir credenciais/senhas, suspender ou desactivar utilizadores.
- Gestão de facturas: conferir pagamento e marcar manualmente como paga (registando admin e timestamp).
- Painel com métricas operacionais consolidadas:
  - Total de facturas emitidas;
  - Total de facturas pagas;
  - Total financeiro recebido (baseado em facturas pagas).
- Preservação integral do histórico financeiro mesmo em caso de desactivação de clientes.

#### Facturas Internas
- Identificador único da factura interna.
- Dados: Cliente, plano snapshot, valor (MZN), periodicidade, data de emissão, data de vencimento e estado.
- Estados: `pendente`, `paga`, `cancelada`.
- Consulta transparente na interface sem alegar factura fiscal governamental.

#### Métodos de Pagamento e Recepção
- Instruções de pagamento fixas apresentadas na plataforma:
  - **M-Pesa:** 842256366 – FRANCISCO
  - **E-Mola:** 861557953 – FRANCISCO
  - **Absa Bank:** Conta nº 0708101028295
- **Regra mandatória de comprovativo:** Envio estritamente em **TEXTO** (copiar e colar o SMS/notificação de transacção). Proibido upload de imagens, fotos, vídeos ou PDFs.
- Confirmação 100% manual por parte do administrador.

---

## 2. Fora do âmbito — não implementar

Não implementar, salvo alteração expressamente aprovada pelo utilizador:

- Integrações automáticas de pagamento.
- Upload de comprovativos.
- Envio de emails transaccionais próprios para boas-vindas, aprovação, suspensão ou vencimento.
- SMS ou WhatsApp.
- Renovação e cobrança automáticas.
- Geração de PDF.
- Facturação fiscal ou integração com software de contabilidade.
- Gestão de várias empresas/tenants.
- Vários papéis administrativos ou permissões personalizadas.
- Convites, equipas, afiliados, cupões ou descontos.
- Aplicações Android/iOS.
- Chat, notificações em tempo real, gráficos avançados ou relatórios exportáveis.
- Internacionalização e múltiplos idiomas.
- Dark mode ou alternância de temas.
- Animações pesadas, bibliotecas visuais extensas ou dependências desnecessárias.
- Funcionalidades de IA.
- Backend tradicional ou servidor próprio, a menos que seja indispensável para corrigir uma limitação de segurança e essa mudança seja explicada e aprovada.

**Nota sobre emails:** o Firebase Authentication pode enviar emails de verificação ou recuperação de senha conforme a configuração do projecto. Isso não equivale a implementar um sistema de emails personalizados para todos os eventos.

---

## 3. Stack e restrições técnicas

- HTML semântico.
- CSS moderno, responsivo e organizado.
- JavaScript vanilla, com módulos ES.
- Firebase Authentication.
- Cloud Firestore.
- GitHub Pages para alojamento estático.
- Firebase SDK modular, importado de forma consistente.
- Git para controlo de versões.
- Não usar React, Vue, Angular, TypeScript, Node.js como backend, frameworks CSS completos ou bibliotecas grandes.
- Ferramentas locais de desenvolvimento podem ser usadas para testes, mas a aplicação publicada deve funcionar como site estático no GitHub Pages.

Antes de seleccionar versões de SDK ou configurar funcionalidades, consulta a documentação oficial actual do Firebase e do GitHub Pages, se a IDE tiver acesso à documentação/web. Não inventes APIs nem uses métodos descontinuados.

### Configuração

- Criar um ficheiro de configuração de exemplo, como `firebase-config.example.js`, sem segredos.
- A configuração pública do Firebase pode ser fornecida ao frontend; isso **não substitui** as regras de segurança.
- Não incluir chaves de service account, tokens privados ou credenciais administrativas no cliente.
- Não colocar dados de clientes reais no repositório.
- Documentar como configurar o projecto Firebase, os domínios autorizados (incluindo `ai.admin-megason.com`), o provider Google e as regras do Firestore.
- Configurar o GitHub Pages para o domínio personalizado `ai.admin-megason.com` (gerando `CNAME` na raiz).
- Não afirmar que a publicação foi feita se apenas tiver sido configurada localmente.

---

# PLANO DE EXECUÇÃO POR FASES

## Fase 0 — Inspecção e descoberta

### Objectivo
Preparar o trabalho sem escrever a aplicação prematuramente.

### Tarefas
1. Inspeccionar o directório de trabalho e confirmar que é apropriado começar um repositório novo.
2. Verificar Git, ferramentas disponíveis, ambiente de execução e acesso à documentação.
3. Descobrir agentes e Skills reais do Antigravity.
4. Consultar as Skills relevantes antes de as utilizar.
5. Identificar limitações da IDE ou de execução que possam afectar o projecto.
6. Registar pressupostos e dados que o cliente ainda precisa fornecer.

### Entregáveis
- `docs/PLANO.md`
- `docs/DECISOES.md`
- Lista de agentes/Skills disponíveis e os seleccionados.

### Critérios de aceitação
- O escopo está compreendido e escrito.
- A stack está confirmada.
- Os recursos da IDE não foram inventados.
- Nenhum ficheiro do utilizador foi apagado ou sobrescrito.
- Nenhuma alteração remota foi feita.

**Parar e apresentar o resultado da fase antes de implementar.**

---

## Fase 1 — Requisitos, fluxos e arquitectura mínima

### Objectivo
Transformar o âmbito acordado num plano de implementação pequeno e verificável.

### Tarefas
1. Definir os fluxos de visitante, utilizador e administrador.
2. Definir os estados de subscrição e factura.
3. Definir o modelo mínimo de dados com os campos de contacto e localização moçambicana.
4. Definir os limites de acesso de cada papel.
5. Identificar as operações que não podem ser executadas com segurança apenas no navegador.
6. Definir os critérios de aceitação de cada módulo.
7. Confirmar o comportamento quando uma subscrição é suspensa ou removida.
8. Definir como a primeira conta de administrador será criada com segurança.

### Modelo de dados mínimo sugerido

#### `users/{uid}`
- `uid`: ID único do Firebase Auth
- `fullName`: Nome completo do cliente
- `username`: Nome de utilizador
- `email`: Endereço de email
- `whatsappNumber`: Contacto telefónico com WhatsApp
- `province`: Província (Moçambique)
- `district`: Distrito
- `neighborhood`: Bairro
- `isHumanVerified`: Booleano confirmando verificação humana no cadastro
- `role`: `user` ou `admin`
- `status`: `active` ou `disabled`
- `createdAt`: Timestamp de criação

O papel `admin` não pode ser definido livremente pelo formulário ou pelo cliente. A criação inicial do administrador deve usar um processo controlado, documentado e que não deixe uma função de promoção aberta no frontend. Se for necessária configuração manual pela consola Firebase ou uma ferramenta administrativa privilegiada, documenta-a.

#### `plans/{planId}`
- `name`: Nome do plano (ex.: "30 Dias", "60 Dias", "90 Dias", "120 Dias")
- `description`: Recursos incluídos do ChatGPT Plus
- `price`: 350, 690, 1025 ou 1300
- `currency`: `MZN`
- `durationDays`: 30, 60, 90 ou 120
- `active`: Booleano (`true`)

Os planos são fixos (30 dias = 350 MT, 60 dias = 690 MT, 90 dias = 1.025 MT, 120 dias = 1.300 MT) e inseridos por configuração inicial. Não criar CRUD/editor de planos no painel.

#### `subscriptions/{subscriptionId}`
- `userId`: Referência ao utilizador
- `planId`: Referência ao plano
- `planNameSnapshot`: Nome do plano no momento da subscrição
- `priceSnapshot`: Preço no momento da subscrição
- `durationDaysSnapshot`: Duração em dias
- `status`: `pending`, `active`, `suspended`, `expired`, `cancelled`
- `accessCredentials`: Objecto opcional com dados de acesso entregues pelo admin (`folderName`, `notes`, `updatedAt`)
- `createdAt`: Data de registo
- `startAt`: Início do acesso concedido
- `expiresAt`: Data limite calculada
- `approvedAt`: Data de aprovação pelo admin
- `approvedBy`: UID do administrador

#### `invoices/{invoiceId}`
- `userId`: Referência ao utilizador
- `subscriptionId`: Referência à subscrição
- `invoiceNumber`: Código amigável único (ex.: `INV-2026-0001`)
- `description`: Descrição do serviço
- `amount`: Valor correspondente ao plano (MZN)
- `currency`: `MZN`
- `proofText`: Comprovativo de pagamento em formato TEXTO colado pelo cliente (ex.: SMS M-Pesa/E-Mola ou extrato Absa)
- `issuedAt`: Data de emissão
- `dueAt`: Data limite
- `status`: `pending`, `paid`, `cancelled`
- `paidAt`: Data da validação do pagamento
- `paidBy`: UID do administrador responsável pela conferência

#### `settings/public`
Apenas os dados necessários para apresentar as instruções de pagamento e dados públicos da empresa:
- `businessName`: "Zedecks IT"
- `domain`: "ai.admin-megason.com"
- `paymentMethods`:
  - M-Pesa: `842256366 – FRANCISCO`
  - E-Mola: `861557953 – FRANCISCO`
  - Absa Bank: `Conta 0708101028295`
- `proofRules`: "Envie apenas comprovativos em formato TEXTO. É proibido enviar fotos, vídeos ou documentos."

As instruções públicas não podem conter credenciais ou informação privada.

### Regras de negócio
- Um utilizador só consulta o próprio perfil, subscrições e facturas.
- O administrador autorizado consulta e gere os registos de todos os utilizadores.
- O utilizador não altera `role`, `status` administrativo, `paidAt`, `paidBy` ou o estado de aprovação.
- O preço e o nome do plano são copiados para a subscrição/factura como snapshot, para não mudar o histórico quando a configuração do plano é alterada.
- O administrador não pode marcar uma factura como paga sem uma operação administrativa autorizada.
- A remoção de um subscritor desactiva o acesso e preserva o histórico financeiro.
- Não apagar facturas pagas como consequência de suspender ou desactivar um utilizador.
- Não confiar em totais calculados no browser para conceder permissões ou confirmar pagamentos.

### Critérios de aceitação
- O modelo de dados é pequeno e documentado.
- Cada regra de negócio tem uma forma de ser validada.
- Não há requisitos contraditórios.
- O processo seguro para configurar o administrador está definido.

**Parar e validar o plano antes de escrever funcionalidades.**

---

## Fase 2 — Fundação do repositório e identidade visual

### Objectivo
Criar uma base estática mínima, organizada e pronta para Firebase.

### Tarefas
1. Inicializar Git e a estrutura de pastas.
2. Criar `index.html`.
3. Criar folhas de estilo e módulos JavaScript.
4. Definir tokens CSS para cores, espaçamento, tipografia, bordas e estados.
5. Usar uma paleta inspirada nas cores oficiais do ChatGPT/OpenAI, sem sugerir afiliação oficial nem copiar logótipos.
6. Implementar apenas light mode.
7. Usar ícones SVG, preferencialmente inline ou ficheiros locais; não usar emojis como ícones.
8. Criar layout responsivo para telemóvel e desktop.
9. Criar estados reutilizáveis de carregamento, erro, vazio e sucesso.
10. Criar uma configuração de Firebase de exemplo.

### Estrutura sugerida

```text
/
├── index.html
├── 404.html
├── assets/
│   ├── icons/
│   └── images/
├── css/
│   ├── tokens.css
│   ├── base.css
│   ├── layout.css
│   └── components.css
├── js/
│   ├── app.js
│   ├── config/
│   │   └── firebase-config.example.js
│   ├── services/
│   │   ├── firebase.js
│   │   ├── auth.js
│   │   ├── subscriptions.js
│   │   └── invoices.js
│   ├── ui/
│   └── utils/
├── firestore.rules
├── firestore.indexes.json
├── README.md
└── docs/
    ├── PLANO.md
    ├── DECISOES.md
    ├── MODELO-DADOS.md
    ├── SEGURANCA.md
    ├── TESTES.md
    ├── PUBLICACAO.md
    └── MANUAL-ADMIN.md
```

Ajusta a estrutura se uma versão mais pequena for claramente melhor. Não cries ficheiros vazios ou pastas sem utilidade.

### Critérios de aceitação
- A página inicial abre localmente.
- O layout adapta-se a ecrãs pequenos.
- A paleta é consistente e apenas light mode está implementado.
- Ícones visuais usam SVG, sem emojis.
- Não existem dependências desnecessárias.
- A configuração de exemplo não contém segredos.

---

## Fase 3 — Landing page e planos fixos

### Objectivo
Implementar a experiência pública com a proposta de valor do ChatGPT Plus, os 4 planos fixos e o fluxo de selecção.

### Tarefas
1. Construir a landing page com:
   - cabeçalho simples com navegação e botão de login/acesso;
   - secção principal (*hero*) com proposta de valor clara;
   - grelha de recursos e benefícios práticos (IA avançada, criação de textos, programação, imagens, análise de documentos, conversas por voz);
   - secção "Como Funciona" em 4 passos didácticos;
   - cartões dos 4 planos fixos (30 dias / 350 MT, 60 dias / 690 MT, 90 dias / 1.025 MT, 120 dias / 1.300 MT);
   - nota de transparência sobre limites e disponibilidade de uso;
   - instruções claras sobre métodos de pagamento oficiais e regra de comprovativo exclusivo em texto;
   - chamadas à acção (CTA) direccionando para o checkout;
   - rodapé com informações da Zedecks IT.
2. Apresentar estritamente os planos definidos pelo cliente, sem inventar valores.
3. Ao escolher um plano, preservar o identificador e validar os dados de confiança no checkout sem confiar no valor manipulável pelo navegador.
4. Apresentar os métodos de pagamento (M-Pesa, E-Mola, Absa Bank) com destaque para a exigência de comprovativo em texto.

### Critérios de aceitação
- A landing page funciona e é responsiva em smartphones e desktops.
- Os 4 planos oficiais estão descritos com precisão (350 MT, 690 MT, 1.025 MT e 1.300 MT).
- A secção de recursos e o fluxo "Como Funciona" correspondem à oferta do cliente.
- A selecção de plano conduz ao ecrã de checkout/registo preservando o plano escolhido.
- Não existem funcionalidades fora de âmbito.

---

## Fase 4 — Firebase Authentication

### Objectivo
Permitir criação de conta, login por email/senha e Google.

### Tarefas
1. Configurar Firebase Authentication com a SDK modular.
2. Implementar registo por email e senha.
3. Implementar login por email e senha.
4. Implementar login com Google.
5. Implementar logout.
6. Implementar recuperação de senha.
7. Manter o estado de autenticação actualizado.
8. Tratar erros com mensagens em português, sem expor detalhes internos sensíveis.
9. Criar ou actualizar o perfil em `users/{uid}` sem permitir que o utilizador se torne administrador.
10. Após login Google, recolher o nome em falta quando necessário.
11. Documentar a activação do provider Google e os domínios autorizados na consola Firebase.

### Critérios de aceitação
- Registo e login por email funcionam com Firebase configurado.
- Login Google funciona quando o provider e o domínio estão configurados.
- Recuperação de senha funciona.
- Logout limpa o estado da sessão.
- Um utilizador comum não consegue elevar os próprios privilégios.
- Os estados de carregamento e erros são visíveis e compreensíveis.

Se as credenciais Firebase ainda não existirem, implementar a integração sem inventar valores e fornecer instruções exactas de configuração. Distinguir claramente testes realizados com credenciais reais de testes que ficaram pendentes.

---

## Fase 5 — Checkout, subscrição e factura inicial

### Objectivo
Criar uma subscrição pendente e uma factura interna quando o utilizador conclui o checkout.

### Tarefas
1. Exigir autenticação antes de criar a subscrição.
2. Validar que o plano existe e está activo.
3. Usar preço e periodicidade do plano guardado, não os valores enviados pelo navegador.
4. Criar a subscrição com estado `pending`.
5. Criar uma factura associada à subscrição.
6. Evitar duplicação acidental de facturas por cliques repetidos ou recarregamento da página.
7. Mostrar ao utilizador um resumo do plano, preço, periodicidade, estado e instruções de pagamento.
8. Mostrar a factura na área do utilizador.
9. Não afirmar que o pagamento foi recebido.
10. Não implementar renovação automática ou geração recorrente em segundo plano.

### Factura mínima
- Identificador único ou número legível.
- Nome do cliente.
- Descrição do plano.
- Valor e moeda.
- Data de emissão.
- Data de vencimento, se a regra for definida pelo cliente.
- Estado de pagamento.
- Instruções de pagamento.

Não criar um gerador de PDF nem uma factura fiscal. A interface de consulta simples é suficiente.

### Critérios de aceitação
- Um utilizador autenticado consegue escolher um plano e criar a subscrição.
- A factura corresponde ao preço real do plano.
- O utilizador só consegue consultar os próprios registos.
- Repetir uma acção não cria facturas duplicadas sem controlo.
- A factura começa como pendente.
- Não existe qualquer fluxo de pagamento automático.

---

## Fase 6 — Painel administrativo

### Objectivo
Permitir à empresa gerir os subscritores e confirmar pagamentos manualmente.

### Tarefas
1. Criar uma página administrativa separada ou uma área protegida dentro da aplicação.
2. Exigir autenticação e verificar o papel administrativo.
3. Listar subscritores com os campos essenciais:
   - nome/email;
   - plano;
   - estado da subscrição;
   - vencimento;
   - estado da factura.
4. Permitir abrir o detalhe de um subscritor.
5. Permitir aprovar uma subscrição pendente.
6. Permitir suspender uma subscrição activa.
7. Permitir desactivar o acesso do subscritor, preservando os registos.
8. Listar facturas.
9. Permitir marcar uma factura pendente como paga.
10. Guardar data e administrador responsável pela confirmação.
11. Apresentar os totais básicos de facturação e recebimentos.
12. Mostrar estados vazios e erros de forma clara.
13. Pedir confirmação antes de suspender ou desactivar uma conta.
14. Impedir operações inválidas, como confirmar uma factura já cancelada.

### Segurança crítica
As regras do Firestore não podem depender da ideia de que esconder botões na interface é suficiente. A autorização deve ser aplicada no Firestore e, quando uma operação privilegiada exigir autoridade que as regras não conseguem verificar de forma segura, usar um mecanismo confiável apropriado ou redesenhar o fluxo para não depender dessa operação.

Não disponibilizar uma função pública que permita ao utilizador definir `role: "admin"`. Não inserir segredos administrativos no JavaScript. Não usar uma chave de service account no frontend.

A primeira conta de administrador deve ser configurada por um procedimento controlado, documentado e executado pelo proprietário do projecto. Não deixar um mecanismo de promoção aberto após a configuração inicial.

### Regras de negócio a respeitar
- Aprovar uma subscrição não deve falsificar o pagamento.
- Marcar uma factura como paga deve registar quem confirmou e quando.
- A suspensão não deve apagar facturas nem pagamentos.
- Desactivar uma conta deve preservar o histórico financeiro.
- O total recebido deve considerar apenas facturas marcadas como pagas.
- O total facturado deve excluir facturas canceladas ou identificá-las separadamente.
- O sistema não deve apresentar receita prevista como receita recebida.
- As alterações administrativas devem ser autorizadas e validadas.

### Critérios de aceitação
- Utilizadores normais não acedem aos dados ou operações administrativas.
- O administrador consegue consultar e gerir os subscritores.
- Pagamentos só são confirmados por operação administrativa autorizada.
- Totais básicos correspondem aos dados armazenados.
- As operações administrativas inválidas são rejeitadas.
- O histórico financeiro mantém-se depois de suspensão ou desactivação.

---

## Fase 7 — Regras de segurança e testes essenciais

### Objectivo
Validar os fluxos e evitar exposição de dados ou permissões indevidas.

### Tarefas
1. Rever as regras completas do Firestore.
2. Negar acesso por omissão quando não existir uma regra explícita.
3. Testar acesso de um utilizador aos dados de outro utilizador.
4. Testar tentativa de modificar o papel para `admin`.
5. Testar tentativa de marcar a própria factura como paga.
6. Testar operações administrativas sem permissão.
7. Testar registo, login, Google (se configurado), logout e recuperação de senha.
8. Testar criação de subscrição e factura.
9. Testar aprovação, suspensão e desactivação.
10. Testar cálculo dos totais financeiros.
11. Testar estados de carregamento, erro e listas vazias.
12. Testar o layout em ecrã pequeno.
13. Corrigir erros críticos antes de publicar.

Usa Firebase Emulator Suite se estiver disponível e for viável no ambiente. Se não estiver disponível, documenta os testes alternativos e as limitações; não declares testes de segurança automatizados como realizados sem os executar.

### Critérios de aceitação
- Não há falhas críticas conhecidas nas permissões.
- O acesso cruzado entre utilizadores é bloqueado.
- O utilizador não consegue alterar campos administrativos.
- As operações administrativas exigem autorização.
- Os fluxos principais foram testados.
- As falhas não resolvidas estão documentadas.

**Não publicar se houver uma falha crítica conhecida na autorização ou no acesso a dados.**

---

## Fase 8 — Documentação final

### Objectivo
Permitir que o proprietário configure, compreenda e mantenha o MVP.

Criar e manter documentação curta e prática:

#### `README.md`
- O que é a aplicação.
- Funcionalidades incluídas.
- Stack.
- Estrutura de pastas.
- Requisitos locais.
- Como executar localmente.
- Como configurar Firebase.
- Como publicar no GitHub Pages.

#### `docs/PLANO.md`
- Fases e estado de cada fase.
- Critérios de aceitação.
- Limitações conhecidas.

#### `docs/DECISOES.md`
- Decisões arquitecturais essenciais.
- Razões para manter o MVP simples.
- Alternativas rejeitadas quando relevantes.

#### `docs/MODELO-DADOS.md`
- Colecções e campos.
- Relações entre utilizadores, planos, subscrições e facturas.
- Estados e transições.

#### `docs/SEGURANCA.md`
- Modelo de permissões.
- Regras do Firestore.
- Configuração do administrador.
- Limites do frontend estático.
- Segredos que nunca devem ser publicados.

#### `docs/TESTES.md`
- Testes executados.
- Resultado de cada teste.
- Testes não executados e motivo.
- Limitações e problemas conhecidos.

#### `docs/PUBLICACAO.md`
- Criar/configurar projecto Firebase.
- Activar Authentication por email/senha e Google.
- Configurar domínios autorizados.
- Configurar Firestore e regras.
- Inserir os planos fixos.
- Configurar instruções de pagamento.
- Configurar a primeira conta de administrador.
- Configurar GitHub Pages e o caminho base.
- Checklist pós-publicação.

#### `docs/MANUAL-ADMIN.md`
- Entrar no painel.
- Consultar subscritores.
- Aprovar e suspender.
- Marcar facturas como pagas.
- Interpretar os totais.
- Desactivar um subscritor preservando o histórico.

Não documentar funcionalidades que não existem como se já estivessem implementadas.

### Critérios de aceitação
- A documentação corresponde ao código real.
- As instruções são suficientemente claras para um programador configurar o projecto.
- A configuração administrativa está descrita sem divulgar segredos.
- As limitações do MVP estão explícitas.

---

## Fase 9 — GitHub Pages e entrega

### Objectivo
Preparar a aplicação para publicação estática no domínio `ai.admin-megason.com` e entregar um resultado verificável.

### Tarefas
1. Configurar o ficheiro `CNAME` na raiz do projecto contendo `ai.admin-megason.com`.
2. Confirmar que todos os caminhos e assets relativos funcionam no domínio personalizado sem quebras.
3. Confirmar que não existe dependência de rotas de servidor ou APIs não estáticas.
4. Confirmar que os ficheiros públicos não contêm credenciais nem segredos.
5. Validar que `ai.admin-megason.com` está nos domínios autorizados do Firebase Authentication.
6. Rever as regras de segurança do Firestore.
7. Executar novamente os testes essenciais de ponta a ponta.
8. Preparar o repositório para deploy no GitHub Pages.
9. Não publicar nem alterar recursos remotos sem autorização explícita do utilizador.
10. Preparar um relatório final honesto e detalhado.

### Critérios de aceitação
- A aplicação pode ser servida como site estático no GitHub Pages.
- O ficheiro `CNAME` com `ai.admin-megason.com` está configurado.
- Os caminhos e assets funcionam perfeitamente.
- A configuração de Firebase está documentada para o domínio de produção.
- As regras de segurança foram verificadas.
- Os testes e as limitações estão registados.
- A publicação é descrita correctamente como concluída ou pendente.

---

# 4. Regras de desenho visual

- Usar um visual moderno, minimalista e profissional.
- Utilizar uma paleta inspirada na identidade cromática do ChatGPT/OpenAI, com tons claros, neutros e verdes discretos.
- Não utilizar logótipos oficiais sem autorização nem sugerir que o produto é oficialmente associado à OpenAI.
- Implementar apenas **light mode**.
- Não criar botão de alternância de tema nem estilos dark.
- Usar SVGs para ícones, indicadores e ilustrações simples.
- Não usar emojis.
- Garantir contraste, foco visível, labels nos formulários e navegação por teclado.
- Garantir boa apresentação em telemóveis.
- Usar animações discretas apenas quando melhorarem a compreensão.
- Evitar efeitos pesados, fundos complexos, glassmorphism excessivo e dependências desnecessárias.
- Não gastar tempo a construir um sistema de design completo: definir apenas os tokens e componentes realmente usados.

---

# 5. Controlo de âmbito e qualidade

Antes de adicionar qualquer funcionalidade, pergunta:

1. Está explicitamente incluída no âmbito?
2. É necessária para completar um fluxo principal?
3. Pode ser resolvida com uma implementação mais simples?
4. Aumenta significativamente o risco, o prazo ou o custo?
5. Foi pedida e aprovada pelo utilizador?

Se não for necessária, não a implementes.

Não adicionar funcionalidades sob nomes como “melhoria”, “preparação para o futuro” ou “boa prática” sem necessidade concreta.

Não refactorizar módulos estáveis sem motivo. Não reescrever código funcional só para alterar estilo pessoal. Não instalar dependências sem explicar a razão e confirmar que não existe alternativa simples.

Se surgir um requisito que torne o orçamento ou a arquitectura inviável, interrompe a implementação dessa parte, explica o problema e propõe a alternativa mínima antes de continuar.

---

# 6. Protocolo de execução por fase

No final de **cada fase**, apresenta ao utilizador um relatório curto com:

- Fase concluída.
- Ficheiros criados ou alterados.
- Agentes e Skills efectivamente utilizados.
- Testes executados e resultados.
- Critérios de aceitação cumpridos e pendentes.
- Problemas ou decisões que exigem intervenção do utilizador.
- Confirmação explícita de que não foram adicionadas funcionalidades fora do âmbito.

Não marques uma fase como concluída apenas porque o código foi escrito. Verifica o resultado.

Pára no final de cada fase e aguarda validação do utilizador antes de avançar, excepto se o utilizador tiver autorizado expressamente a execução contínua de todas as fases. Mesmo com execução contínua autorizada, respeita os critérios de aceitação entre fases.

---

# 7. Relatório final obrigatório

Quando todas as fases autorizadas estiverem concluídas, apresenta:

1. Resumo do MVP entregue.
2. Funcionalidades implementadas.
3. Funcionalidades excluídas deliberadamente.
4. Arquitectura e estrutura do projecto.
5. Configuração Firebase necessária ou concluída.
6. Estado da autenticação Google.
7. Estado das regras de segurança.
8. Estado do GitHub Pages: preparado, publicado ou pendente.
9. Testes realmente executados e respectivos resultados.
10. Agentes e Skills realmente usados.
11. Documentação criada.
12. Limitações conhecidas e próximos passos recomendados.
13. Lista exacta de acções ainda necessárias por parte do proprietário.

Não afirmar que algo foi publicado, testado ou configurado remotamente se não tiver sido verificado.

---

# 8. Instrução inicial para o agente

**Começa apenas pela Fase 0.**

Inspecciona o ambiente, confirma o estado do repositório e descobre os agentes e Skills realmente disponíveis no Antigravity. Não comeces a construir a aplicação nesta primeira resposta.

Apresenta o resultado da inspecção, os riscos relevantes, os pressupostos e o plano da Fase 1. Aguarda validação antes de avançar.

O objectivo é entregar um MVP pequeno, utilizável, seguro e documentado, adequado ao orçamento de 8.500 MT — não uma plataforma empresarial completa.
