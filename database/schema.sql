-- ==============================================================================
-- MEGASON — Plataforma de Gestão de Subscrições ChatGPT Plus
-- Arquitetura de Base de Dados Relacional MySQL / MariaDB (Compatível com cPanel)
-- Desenvolvido por Zedecks IT
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABELA DE UTILIZADORES (users)
-- Armazena clientes e administradores com senhas protegidas por BCRYPT
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(36) NOT NULL,
  `client_code` VARCHAR(10) NOT NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `whatsapp_number` VARCHAR(30) NOT NULL,
  `province` VARCHAR(50) NOT NULL DEFAULT 'Maputo Cidade',
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  `role_title` VARCHAR(100) DEFAULT 'Cliente',
  `folder_name` VARCHAR(100) DEFAULT NULL,
  `access_credentials` TEXT DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`),
  UNIQUE KEY `idx_users_client_code` (`client_code`),
  KEY `idx_users_whatsapp` (`whatsapp_number`),
  KEY `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABELA DE SUBSCRIÇÕES (subscriptions)
-- Controla pedidos, vigência e ativação de pastas dedicadas ChatGPT Plus
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `client_code` VARCHAR(10) NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(150) NOT NULL,
  `customer_whatsapp` VARCHAR(30) NOT NULL,
  `plan_id` VARCHAR(50) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(5) NOT NULL DEFAULT 'MZN',
  `duration_days` INT NOT NULL DEFAULT 30,
  `status` ENUM('pending', 'active', 'suspended', 'cancelled') NOT NULL DEFAULT 'pending',
  `folder_name` VARCHAR(100) DEFAULT NULL,
  `access_credentials` TEXT DEFAULT NULL,
  `admin_notes` TEXT DEFAULT NULL,
  `proof_text` TEXT DEFAULT NULL,
  `latest_invoice_id` VARCHAR(30) DEFAULT NULL,
  `start_date` DATETIME DEFAULT NULL,
  `end_date` DATETIME DEFAULT NULL,
  `approved_at` DATETIME DEFAULT NULL,
  `approved_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subs_user_id` (`user_id`),
  KEY `idx_subs_status` (`status`),
  KEY `idx_subs_end_date` (`end_date`),
  KEY `idx_subs_customer_email` (`customer_email`),
  CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABELA DE FATURAS (invoices)
-- Registo financeiro canónico no formato oficial FT[ANO]AIXXX
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoices` (
  `id` VARCHAR(30) NOT NULL,
  `invoice_number` VARCHAR(30) NOT NULL,
  `subscription_id` VARCHAR(36) DEFAULT NULL,
  `user_id` VARCHAR(36) NOT NULL,
  `client_code` VARCHAR(10) NOT NULL,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(150) NOT NULL,
  `customer_whatsapp` VARCHAR(30) NOT NULL,
  `plan_id` VARCHAR(50) NOT NULL,
  `plan_name` VARCHAR(100) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(5) NOT NULL DEFAULT 'MZN',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'M-Pesa',
  `status` ENUM('pending', 'paid', 'cancelled') NOT NULL DEFAULT 'pending',
  `proof_text` TEXT DEFAULT NULL,
  `confirmed_by` VARCHAR(100) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_at` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_invoices_number` (`invoice_number`),
  KEY `idx_invoices_user_id` (`user_id`),
  KEY `idx_invoices_subscription_id` (`subscription_id`),
  KEY `idx_invoices_status` (`status`),
  KEY `idx_invoices_customer_email` (`customer_email`),
  CONSTRAINT `fk_invoices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABELA DE PLANOS COMERCIAIS (plans)
-- Vitrine dinâmica de pacotes com limites e recursos incluídos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `plans` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `duration_days` INT NOT NULL DEFAULT 30,
  `duration_label` VARCHAR(100) DEFAULT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `badge` VARCHAR(50) DEFAULT NULL,
  `is_featured` TINYINT(1) NOT NULL DEFAULT 0,
  `features` JSON DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABELA DE CONFIGURAÇÕES GERAIS (settings)
-- Coordenadas de pagamento moçambicanas e chaves de envio EmailJS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(50) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- SEED DE CONFIGURAÇÃO INICIAL (Dados padrão oficiais da MEGASON)
-- ------------------------------------------------------------------------------

-- Inserção dos 4 Planos Oficiais Padrão
INSERT INTO `plans` (`id`, `name`, `duration_days`, `duration_label`, `price`, `badge`, `is_featured`, `features`, `is_active`) VALUES
('chatgpt-plus-30', '30 Dias (1 Mês)', 30, '30 Dias (1 Mês)', 300.00, NULL, 0, '[
  "Modelos avançados de IA (GPT-6 Astra)",
  "Criação de textos, artigos e ideias",
  "Geração e edição de imagens em alta resolução",
  "Envio e análise de documentos, PDFs e ficheiros",
  "Pesquisa na Internet aprofundada em tempo real",
  "Conversas fluidas por voz",
  "Pasta individual e senhas de acesso"
]', 1),
('chatgpt-plus-90', '90 Dias (3 Meses)', 90, '90 Dias (3 Meses)', 850.00, 'Poupa 50 MT', 1, '[
  "Modelos avançados de IA (GPT-6 Astra)",
  "Criação de textos, artigos e ideias",
  "Geração e edição de imagens em alta resolução",
  "Envio e análise de documentos, PDFs e ficheiros",
  "Pesquisa na Internet aprofundada em tempo real",
  "Conversas fluidas por voz",
  "Pasta individual e senhas de acesso"
]', 1),
('chatgpt-plus-180', '180 Dias (6 Meses)', 180, '180 Dias (6 Meses)', 1650.00, 'Poupa 150 MT', 0, '[
  "Modelos avançados de IA (GPT-6 Astra)",
  "Criação de textos, artigos e ideias",
  "Geração e edição de imagens em alta resolução",
  "Envio e análise de documentos, PDFs e ficheiros",
  "Pesquisa na Internet aprofundada em tempo real",
  "Conversas fluidas por voz",
  "Pasta individual e senhas de acesso"
]', 1),
('chatgpt-plus-365', '365 Dias (1 Ano)', 365, '365 Dias (1 Ano)', 3200.00, 'Poupa 400 MT', 0, '[
  "Modelos avançados de IA (GPT-6 Astra)",
  "Criação de textos, artigos e ideias",
  "Geração e edição de imagens em alta resolução",
  "Envio e análise de documentos, PDFs e ficheiros",
  "Pesquisa na Internet aprofundada em tempo real",
  "Conversas fluidas por voz",
  "Pasta individual e senhas de acesso"
]', 1)
ON DUPLICATE KEY UPDATE `price` = VALUES(`price`), `badge` = VALUES(`badge`);

-- Inserção das Configurações Iniciais da Empresa
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('admin_email', 'comercial@admin-megason.site'),
('admin_whatsapp', '842256366'),
('mpesa_number', '842256366'),
('mpesa_holder', 'FRANCISCO'),
('emola_number', '861557953'),
('emola_holder', 'FRANCISCO'),
('absa_account', '0708101028295'),
('absa_nib', '000207080810102829586'),
('absa_holder', 'MEGASON'),
('emailjs_service_id', ''),
('emailjs_template_id', ''),
('emailjs_public_key', '')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- Inserção do Administrador Geral Padrão
-- E-mail oficial: admin@admin-megason.site | Senha padrão inicial: 123456
INSERT INTO `users` (
  `id`, `client_code`, `full_name`, `email`, `whatsapp_number`, `province`,
  `password_hash`, `role`, `role_title`, `status`
) VALUES (
  'usr_admin_megason',
  'AI-ADMIN',
  'Administrador Geral MEGASON',
  'admin@admin-megason.site',
  '842256366',
  'Maputo Cidade',
  '$2y$10$tMh4E82/OaV1nfgN79p/y.81c6/a5aAekvYf8O3oN7G/WknjAkmwG',
  'admin',
  'Administrador Geral & Operações',
  'active'
) ON DUPLICATE KEY UPDATE `email` = VALUES(`email`), `password_hash` = VALUES(`password_hash`), `full_name` = VALUES(`full_name`);

SET FOREIGN_KEY_CHECKS = 1;
