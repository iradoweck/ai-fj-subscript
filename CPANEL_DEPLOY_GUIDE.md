# Guia Oficial de Instalação e Hospedagem no cPanel (PHP 8.x + MySQL)
**Plataforma MEGASON — Subscrições ChatGPT Plus**  
*Desenvolvido com excelência por Zedecks IT*

---

## 1. Visão Geral da Arquitetura
A plataforma foi migrada com sucesso para a arquitetura nativa da Web:
- **Frontend:** HTML5 semântico, CSS Modular com Design Tokens (Light Mode nativo) e Vanilla JavaScript (ES Modules).
- **Backend:** API REST em **PHP 8.0+** utilizando **PDO** (com declarações preparadas contra SQL Injection) e cabeçalhos CORS padronizados.
- **Base de Dados:** **MySQL 8.x / MariaDB 10.4+** com motor InnoDB, transações ACID e integridade referencial com **`ON DELETE CASCADE`**.

---

## 2. Requisitos da Hospedagem cPanel
- **Versão do PHP:** 8.0, 8.1, 8.2 ou 8.3.
- **Extensões PHP obrigatórias:**
  - `pdo_mysql` (Conexão nativa com MySQL)
  - `json` (Leitura e emissão de respostas da API)
  - `mbstring` (Manipulação de strings em UTF-8)
  - `openssl` (Geração de tokens criptográficos e UUIDs)
- **Apache:** Suporte a arquivos `.htaccess` (`mod_rewrite` e `mod_headers` recomendados).

---

## 3. Passo a Passo de Instalação

### Passo 1: Criar a Base de Dados e Utilizador no cPanel
1. Acesse o painel **cPanel** da sua hospedagem.
2. Na seção **Bases de Dados** (Databases), clique em **Assistente de Base de Dados MySQL** (MySQL Database Wizard).
3. **Nome da Base de Dados:** Digite um nome (ex.: `cpaneluser_megason`) e clique em *Próximo Passo*.
4. **Criar Utilizador:**
   - Nome de utilizador: `cpaneluser_dbuser`
   - Palavra-passe: Gere uma senha forte (guarde-a para usar no arquivo de conexão).
   - Clique em *Criar Utilizador*.
5. **Atribuir Privilégios:**
   - Marque a caixa de seleção **TODOS OS PRIVILÉGIOS** (ALL PRIVILEGES).
   - Clique em *Fazer Alterações*.

---

### Passo 2: Importar a Estrutura no phpMyAdmin
1. No cPanel, retorne à tela inicial e clique em **phpMyAdmin**.
2. No menu à esquerda do phpMyAdmin, clique sobre o nome da base de dados que acabou de criar (`cpaneluser_megason`).
3. No menu superior, clique na aba **Importar** (Import).
4. No campo **Ficheiro a importar**, clique em **Escolher Ficheiro** e selecione o arquivo:
   ```
   database/schema.sql
   ```
5. Role até o final da página e clique em **Importar** (ou **Executar**).
6. Todas as 5 tabelas relacionais serão criadas instantaneamente:
   - `users`: Utilizadores, clientes e administradores com código `AI-XXXX`.
   - `subscriptions`: Pedidos e vigências calculadas rigorosamente.
   - `invoices`: Faturas canónicas sequenciais `FT[ANO]AIXXX`.
   - `plans`: Pacotes comerciais (os 4 planos oficiais já vêm pré-cadastrados).
   - `settings`: Coordenadas bancárias e chaves de envio.

---

### Passo 3: Configurar a Conexão PHP com a Base de Dados
Abra o arquivo `api/config/db.php` e preencha as credenciais criadas no Passo 1:

```php
// api/config/db.php
define('DB_HOST', 'localhost'); // Geralmente 'localhost' no cPanel
define('DB_PORT', '3306');
define('DB_NAME', 'cpaneluser_megason'); // Substitua pelo nome completo gerado pelo cPanel
define('DB_USER', 'cpaneluser_dbuser');  // Substitua pelo utilizador criado
define('DB_PASS', 'SuaSenhaSeguraAqui');  // Substitua pela senha criada
```

> [!NOTE]
> Se a sua hospedagem permitir variáveis de ambiente (`.env`), o arquivo já está preparado para ler via `getenv('DB_NAME')`, etc.

---

### Passo 4: Enviar os Arquivos para a Hospedagem (File Manager ou FTP)
1. No cPanel, abra o **Gestor de Ficheiros** (File Manager).
2. Navegue até ao diretório público:
   - Se for o domínio principal: pasta `public_html/`
   - Se for um subdomínio (ex: `chatgpt.seusite.co.mz`): pasta do subdomínio.
3. Envie a pasta do projeto (ou compacte em `.zip` e use a opção **Extrair** do cPanel).
4. A estrutura dentro de `public_html/` deve ficar exatamente assim:
   ```text
   public_html/
   ├── admin/
   │   └── index.html
   ├── api/
   │   ├── config/
   │   │   ├── .htaccess
   │   │   ├── cors.php
   │   │   └── db.php
   │   ├── auth.php
   │   ├── customers.php
   │   ├── invoices.php
   │   ├── plans.php
   │   ├── settings.php
   │   └── subscriptions.php
   ├── css/
   │   ├── base.css
   │   ├── components.css
   │   ├── layout.css
   │   └── tokens.css
   ├── database/
   │   └── schema.sql
   ├── js/
   │   ├── admin.js
   │   ├── app.js
   │   └── services/
   │       ├── api.js
   │       ├── auth.js
   │       ├── email.js
   │       ├── firebase.js
   │       ├── plans.js
   │       └── subscriptions.js
   ├── favicon.svg
   ├── index.html
   └── CPANEL_DEPLOY_GUIDE.md
   ```

---

## 4. Acesso Inicial e Credenciais Padrão

Após o deploy, a sua aplicação estará imediatamente disponível no seu domínio:

### Acesso do Cliente
- **URL:** `https://seudominio.co.mz/`

### Acesso Administrativo
- **URL:** `https://seudominio.co.mz/admin/` (ou `http://localhost:1080/admin/` localmente)
- **Email Padrão:** `admin@admin-megason.site`
- **Senha Inicial Padrão:** `123456`

> [!IMPORTANT]
> Assim que realizar o primeiro login no painel administrativo, acesse a aba **Configurações** na barra lateral e:
> 1. Altere a senha padrão na seção **Segurança: Alterar Senha de Acesso**.
> 2. Valide as coordenadas de pagamento M-Pesa, E-Mola e Absa Bank na seção **Dados da Empresa & Pagamentos**.

---

## 5. Auditoria de Segurança e Proteção de Dados
- **Proteção do arquivo de banco:** O diretório `api/config/.htaccess` bloqueia qualquer tentativa de download ou visualização do arquivo `db.php` via navegador.
- **Consultas Seguras:** 100% dos comandos SQL utilizam `PDO::prepare()` com parâmetros tipados, impedindo injeções de SQL.
- **Armazenamento de Senhas:** Senhas são protegidas com `password_hash(..., PASSWORD_BCRYPT)`.
- **Integridade Referencial:** A exclusão de um cliente aciona automaticamente a remoção em cascata (`ON DELETE CASCADE`) de todas as subscrições e faturas associadas, mantendo a integridade relacional do MySQL.
