# Guia de Publicação e Configuração de Infraestrutura — MEGASON

> **Aplicação:** Subscrições ChatGPT Plus (GPT-6 Astra)  
> **Domínio de Produção:** `https://ai.admin-megason.com`  
> **Alojamento:** GitHub Pages  
> **Serviços Backend:** Firebase Authentication & Cloud Firestore  
> **Responsável de DevOps:** Dep (DevOps / Entrega)

---

## 1. Publicação no GitHub Pages

A aplicação foi desenvolvida como um site estático puro (Static Site), o que permite alojamento gratuito, de alta disponibilidade e com certificado SSL gerado automaticamente pelo GitHub.

### 1.1. Ativação do GitHub Pages
1. No repositório do GitHub, aceda a **Settings** (Definições) → aba lateral **Pages**.
2. Na secção **Build and deployment**:
   - **Source:** Selecione `Deploy from a branch`.
   - **Branch:** Selecione a branch de produção (`main`) e pasta `/ (root)`.
   - Clique em **Save**.

### 1.2. Configuração do Domínio Personalizado
1. O ficheiro `CNAME` já está criado na raiz do repositório contendo exatamente:
   ```
   ai.admin-megason.com
   ```
2. Na página de definições do GitHub Pages, confirme que o campo **Custom domain** apresenta `ai.admin-megason.com`.
3. Marque a caixa de verificação **Enforce HTTPS** (o certificado SSL é emitido automaticamente pelo Let's Encrypt através do GitHub após a propagação dos registos de DNS).

---

## 2. Configuração de DNS (Zona de Domínio MEGASON)

No painel do provedor de domínio onde o domínio `admin-megason.com` está registado (ex: Cloudflare, GoDaddy, Namecheap ou registrador local moçambicano), configure o seguinte registo:

| Tipo | Nome / Host | Destino / Valor | TTL |
| :---: | :---: | :---: | :---: |
| **CNAME** | `ai` | `<utilizador-ou-org-github>.github.io` | 3600 (ou Automático) |

*Nota: Substitua `<utilizador-ou-org-github>` pelo nome do utilizador ou organização do GitHub onde o repositório está alojado.*

---

## 3. Configuração do Firebase Console

### 3.1. Criação do Projeto
1. Aceda à [Consola do Firebase](https://console.firebase.google.com/) e crie um novo projeto (ex: `megason-chatgpt-plus`).
2. Desative o Google Analytics se desejar simplificar ao máximo a implantação.

### 3.2. Configuração do Firebase Authentication
1. No menu lateral, aceda a **Build** → **Authentication** → clique em **Get Started**.
2. Na aba **Sign-in method**, ative:
   - **Email/Password:** Marque "Enable" no primeiro interruptor (Email/Password).
   - **Google (Opcional):** Marque "Enable", insira o email de suporte e guarde.
3. Na aba **Settings** do Authentication → secção **Authorized domains**:
   - Adicione o domínio personalizado: `ai.admin-megason.com`
   - Certifique-se de que `localhost` também está presente para desenvolvimento.

### 3.3. Configuração do Cloud Firestore
1. No menu lateral, aceda a **Build** → **Firestore Database** → clique em **Create database**.
2. Selecione a localização mais próxima de Moçambique (ex: `europe-west1` ou `southafrica-central1` se disponível).
3. Selecione o modo de segurança inicial **Start in production mode**.
4. Para aplicar as regras de segurança definitivas e os índices compostos, utilize o Firebase CLI:
   ```bash
   firebase login
   firebase use <id-do-projeto-firebase>
   firebase deploy --only firestore:rules,firestore:indexes
   ```
   *Ou copie o conteúdo de `firestore.rules` diretamente na aba "Rules" do Cloud Firestore na consola web.*

### 3.4. Extração das Chaves de Configuração Pública
1. Nas definições do projeto (**Project settings** ⚙️) → aba **General** → secção **Your apps**.
2. Clique no ícone Web (`</>`) e registe a aplicação (ex: `MEGASON Web App`).
3. Copie o objeto `firebaseConfig` e cole no ficheiro [`js/config/firebase-config.js`](../js/config/firebase-config.js):
   ```javascript
   export const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "megason-chatgpt-plus.firebaseapp.com",
     projectId: "megason-chatgpt-plus",
     storageBucket: "megason-chatgpt-plus.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

---

## 4. Promoção do Primeiro Administrador

Como o sistema impede a auto-promoção de utilizadores por regras de segurança:
1. Registe a primeira conta na aplicação pública com o email institucional da MEGASON (ex: `admin@admin-megason.com`).
2. Aceda à Consola do Firebase → **Firestore Database** → coleção `users`.
3. Localize o documento correspondente ao UID do utilizador criado.
4. Altere o campo `role` de `"customer"` para `"admin"`.
5. Pronto! Esse utilizador já tem acesso irrestrito ao painel em `https://ai.admin-megason.com/admin.html`.

---

## 5. Checklist de Verificação Pré-Lançamento

- [x] Arquivo `CNAME` configurado na raiz com `ai.admin-megason.com`.
- [x] Regras de segurança `firestore.rules` aplicadas e testadas com Zero Trust.
- [x] Testes automatizados executados (`python3 scripts/run_tests.py` - 13/13 aprovados).
- [x] Light Mode consistente em todas as telas (sem botão de dark mode).
- [x] Ausência total de emojis na interface (apenas ícones vetoriais SVG).
- [x] Crédito oficial da Zedecks IT posicionado discretamente no rodapé (`Dev. By Zedeck's IT.`).
- [x] Responsividade mobile testada em ecrãs verticais e horizontais (320px a 1440px).
