# Plano de Execução do MVP — Subscrições MEGASON

> **Status Geral do Projeto:** Fases 0 a 8 concluídas / Pronta para Fase 9 (GitHub Pages e Entrega Final)  
> **Sistema / Cliente:** MEGASON  
> **Desenvolvedora & Propriedade do Código:** Zedecks IT  
> **Orçamento:** 8.500 MT (Âmbito estrito)  
> **Domínio de Produção:** `ai.admin-megason.site`  
> **Stack:** HTML5, CSS3, JavaScript Vanilla (ES Modules), Firebase Authentication, Cloud Firestore, GitHub Pages.

---

## 1. Visão Geral do Produto e Regras de Negócio

Aplicação web estática para a **MEGASON** apresentar e comercializar subscrições de acesso e contas **ChatGPT Plus**, com conferência e aprovação 100% manual por parte do administrador. O desenvolvimento e a posse do código-fonte pertencem à **Zedecks IT**.

### 1.1. Planos Fixos (Moeda: MZN)
> **Regra de Negócio:** Todos os pacotes possuem exatamente os mesmos recursos de IA (GPT-4o, imagens, análise de documentos, voz e pasta dedicada). O que muda é estritamente o valor e o tempo de uso.

| Plano | Preço | Duração | Validação no Checkout |
| :--- | :--- | :--- | :--- |
| **Plano 30 Dias** | 300 MT | 30 Dias | Preço e duração validados por snapshot confiável |
| **Plano 60 Dias** | 550 MT | 60 Dias | Preço e duração validados por snapshot confiável |
| **Plano 90 Dias** | 800 MT | 90 Dias | Preço e duração validados por snapshot confiável |
| **Plano 120 Dias** | 1.000 MT | 120 Dias | Preço e duração validados por snapshot confiável |

### 1.2. Métodos Oficiais de Pagamento
- **M-Pesa:** `842256366 – FRANCISCO`
- **E-Mola:** `861557953 – FRANCISCO`
- **Absa Bank:** `Conta 0708101028295`
- **Regra Mandatória de Comprovativo:** O cliente deve submeter o comprovativo exclusivamente em formato **TEXTO** (copiando e colando a mensagem SMS da carteira móvel ou comprovante bancário). Upload de imagens, PDFs ou vídeos é proibido e fora do escopo.

### 1.3. Dados Cadastrais do Utilizador
- Nome completo (`fullName`)
- Número de telefone com WhatsApp (`whatsappNumber`)
- Província (`province`)
- Distrito (`district`)
- Bairro (`neighborhood`)
- Nome de utilizador (`username`) e Senha (via Firebase Auth)
- Verificação anti-bot ("Sou Humano")

---

## 2. Roteiro de Execução por Fases

| Fase | Título | Objetivo | Status |
| :---: | :--- | :--- | :---: |
| **0** | **Inspecção e Descoberta** | Mapear o ambiente, validar stack, registrar restrições e criar base de documentação. | **Concluída** |
| **1** | **Requisitos e Arquitectura Mínima** | Detalhar esquemas de dados, estados, transições e processos de segurança/admin. | **Concluída** |
| **2** | **Fundação e Identidade Visual** | Criar base HTML/CSS modular (Light Mode ChatGPT/OpenAI), SVGs e módulo Firebase de exemplo. | **Concluída** |
| **3** | **Landing Page e Planos Fixos** | Apresentar recursos da IA, "Como Funciona" em 4 passos, seleção de planos e CTA. | **Concluída** |
| **4** | **Firebase Authentication** | Registo com campos Moçambique, login Email/Senha e Google, recuperação de senha. | **Concluída** |
| **5** | **Checkout, Subscrição e Fatura** | Fluxo de checkout com captura de comprovativo em texto, fatura interna pendente. | **Concluída** |
| **6** | **Painel Administrativo** | Consulta de subscritores, validação de comprovativo em texto, aprovação e entrega de senhas/pasta. | **Concluída** |
| **7** | **Segurança e Testes Essenciais** | Regras definitivas do Firestore (RBAC estrito), testes de limites e integridade. | **Concluída** |
| **8** | **Documentação Final** | Guias de configuração, manual de administração e relatórios operacionais. | **Concluída** |
| **9** | **GitHub Pages e Entrega** | Configuração do domínio `ai.admin-megason.site` (CNAME), deploy e checklist final. | **Concluída** |

---

## 3. Critérios de Aceitação Gerais
- **Zero Frameworks Pesados:** Apenas JavaScript Vanilla puro com ES Modules.
- **Segurança Nativa no Firestore:** Nenhuma confiança em regras apenas no cliente (DOM).
- **Sem Segredos Expostos:** Chaves privadas ou credenciais administrativas nunca residem no repositório.
- **Light Mode Estrito:** Sem botões de alternância de tema ou dark mode.
- **Sem Emojis na Interface:** Utilização exclusiva de ícones em SVG limpos e profissionais.
- **Validação Passo a Passo:** Cada fase deve ser validada e aprovada pelo utilizador antes do início da seguinte.
