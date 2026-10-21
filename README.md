# MEGASON — Plataforma de Subscrições ChatGPT Plus (GPT-6 Astra)

> **Empresa Titular do Serviço:** MEGASON  
> **Desenvolvimento & Propriedade do Código:** Zedecks IT  
> **Domínio de Produção:** `https://ai.admin-megason.com`  
> **Alojamento:** GitHub Pages (Site Estático)  
> **Orçamento:** 8.500 MT (Âmbito Estrito de MVP)

---

## 1. Visão Geral do Produto

Aplicação web estática moderna, leve e responsiva desenvolvida para a **MEGASON** comercializar acessos com pastas dedicadas e isoladas ao **ChatGPT Plus** em Moçambique.

O sistema opera com verificação e aprovação 100% manual por parte do operador da MEGASON, eliminando intermediários de pagamento dispendiosos e adaptando-se aos meios de pagamento móveis locais (M-Pesa e E-Mola) e bancários (Absa Bank).

### 1.1. Planos Oficiais de Subscrição (Moeda: MZN)
> **Regra de Negócio Mandatória:** Todos os quatro pacotes oferecem exatamente os mesmos recursos avançados de Inteligência Artificial (GPT-4o/GPT-6, geração de imagens, análise de documentos, conversas por voz e pasta exclusiva). O que varia é estritamente o período de duração e o valor monetário.

| Plano | Preço Oficial | Duração | Vantagem Comercial |
| :--- | :---: | :---: | :--- |
| **Plano 30 Dias** | **300 MT** | 30 Dias | Acesso mensal de entrada |
| **Plano 60 Dias** | **550 MT** | 60 Dias | Poupança de 50 MT |
| **Plano 90 Dias** | **800 MT** | 90 Dias | Poupança de 100 MT |
| **Plano 120 Dias** | **1.000 MT** | 120 Dias | **Mais Popular:** Poupança de 200 MT |

### 1.2. Canais Oficiais de Pagamento em Moçambique
- **M-Pesa:** `842256366` – FRANCISCO
- **E-Mola:** `861557953` – FRANCISCO
- **Absa Bank Moçambique:** Conta `0708101028295`
- **Regra de Comprovativo:** O cliente submete a confirmação exclusivamente em formato de **TEXTO PURO** (copiando e colando a mensagem SMS da carteira móvel ou comprovativo bancário). É proibido o upload de imagens, PDFs ou vídeos, mantendo a infraestrutura leve e sem custos de armazenamento.

---

## 2. Arquitetura e Stack Tecnológica

Seguindo estritamente a filosofia de engenharia limpa e o teto orçamentário do projeto, a solução dispensa frameworks pesados ou servidores Node.js/Python em produção:

- **Frontend:** HTML5 semântico, CSS3 modular puro com Design Tokens (paleta oficial Light Mode ChatGPT/OpenAI) e JavaScript Vanilla nativo (ES Modules).
- **Ícones e Ilustrações:** Vetores SVG puros inline (zero chamadas de rede para bibliotecas externas de ícones).
- **Autenticação:** Firebase Authentication (Email/Senha e Google Identity).
- **Banco de Dados:** Cloud Firestore com regras de segurança ativas no servidor (`firestore.rules`).
- **Hospedagem:** GitHub Pages servindo ficheiros estáticos com CNAME apontado para `ai.admin-megason.com`.
- **Modo Demonstração Integrado:** Permite testar todo o fluxo da loja e do painel administrativo mesmo sem conexão ativa ao Firebase.

---

## 3. Estrutura de Diretórios do Repositório

```
ai-fj-subscript/
├── CNAME                         # Domínio personalizado (ai.admin-megason.com)
├── index.html                    # Loja pública e landing page com checkout
├── admin.html                    # Painel administrativo protegido por RBAC
├── 404.html                      # Roteamento estático para GitHub Pages
├── firestore.rules               # Regras de segurança Zero Trust do Firestore
├── firestore.indexes.json        # Índices compostos para consultas
├── css/
│   ├── tokens.css                # Paleta de cores, tipografia e espaçamentos
│   ├── base.css                  # Reset CSS, estilos de formulários e botões
│   ├── layout.css                # Grid, containers e navbar responsiva
│   └── components.css            # Cards de planos, tabelas, modais e KPIs
├── js/
│   ├── app.js                    # Controlador da loja pública e checkout
│   ├── admin.js                  # Controlador do painel administrativo
│   ├── config/
│   │   ├── firebase-config.js            # Configuração pública ativa
│   │   └── firebase-config.example.js    # Modelo de configuração sem segredos
│   ├── services/
│   │   ├── firebase.js           # Inicialização segura do SDK Firebase v10
│   │   ├── auth.js               # Registo moçambicano, login e RBAC
│   │   ├── plans.js              # Catálogo canónico imutável dos 4 planos
│   │   └── subscriptions.js      # Pedidos, faturas e operações administrativas
│   └── utils/
│       └── icons.js              # Biblioteca de ícones SVG inline
├── scripts/
│   └── run_tests.py              # Suíte de testes automatizados locais
└── docs/
    ├── PLANO.md                  # Roteiro de execução por fases
    ├── DECISOES.md               # Registos de Decisão de Arquitetura (ADRs)
    ├── MODELO-DADOS.md           # Esquema detalhado das coleções Firestore
    ├── SEGURANCA.md              # Modelo de ameaças e políticas DevSecOps
    ├── TESTES.md                 # Matriz de casos de teste e homologação
    ├── MANUAL-ADMIN.md           # Guia de operação para a equipa MEGASON
    └── PUBLICACAO.md             # Guia de deploy no GitHub Pages e DNS
```

---

## 4. Como Executar Localmente

Como a aplicação é composta por arquivos estáticos puros, não há necessidade de `npm install` ou build prévio:

### Opção 1: Servidor Python Nativo (Recomendado)
No terminal, a partir da raiz do projeto:
```bash
python3 -m http.server 1080
```
Em seguida, aceda a:
- Loja Pública: `http://localhost:1080/index.html`
- Painel Administrativo: `http://localhost:1080/admin.html`

### Opção 2: VS Code Live Server / Extensões de Navegador
Abra a pasta do projeto no VS Code e inicie com a extensão *Live Server*.

---

## 5. Como Executar os Testes Automatizados

O projeto inclui uma suíte automatizada de 13 testes cobrindo validações de números moçambicanos, regras de segurança do Firestore, ausência de emojis e conformidade de layout:

```bash
python3 scripts/run_tests.py
```

---

## 6. Configuração do Firebase para Produção

1. Copie o arquivo `js/config/firebase-config.example.js` para `js/config/firebase-config.js`.
2. Insira as chaves públicas obtidas no Console do Firebase (Project Settings → General → Web Apps).
3. Efetue o deploy das regras de segurança:
   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```
4. Promova a primeira conta de administrador alterando o campo `role` de `"customer"` para `"admin"` na coleção `users` do Firestore. Consulte o [`docs/MANUAL-ADMIN.md`](docs/MANUAL-ADMIN.md) para detalhes.

---

## 7. Créditos e Propriedade Intelectual

- **Marca, Serviço e Operação Comercial:** MEGASON.
- **Desenvolvimento de Software, Engenharia e Código-Fonte:** Zedecks IT.
- **Crédito Oficial Obrigatório:** `Dev. By Zedeck's IT.` no rodapé de todas as interfaces.
