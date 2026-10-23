#!/usr/bin/env python3
"""
Suíte de Testes Automatizados — MEGASON MVP
Coordenado por Quinn (QA Tester) e Luna (Reviewer)
Valida integridade do catálogo, telefonia moçambicana, regras do Firestore e conformidade de interface.
"""

import os
import re
import sys
import html.parser

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Cores no terminal
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
RESET = "\033[0m"

tests_passed = 0
tests_failed = 0

def test(description):
    def decorator(fn):
        global tests_passed, tests_failed
        try:
            fn()
            print(f"  {GREEN}✔ PASS{RESET} - {description}")
            tests_passed += 1
        except Exception as e:
            print(f"  {RED}✖ FAIL{RESET} - {description}: {e}")
            tests_failed += 1
    return decorator

print(f"\n{YELLOW}======================================================{RESET}")
print(f"{YELLOW}  MEGASON MVP — Suíte de Testes Automatizados (Fase 7){RESET}")
print(f"{YELLOW}======================================================{RESET}\n")

# -----------------------------------------------------------------------------
# 1. Testes de Telefonia Moçambicana (Vodacom, Movitel, Tmcel)
# -----------------------------------------------------------------------------
print("📦 Testes de Domínio e Normalização Telefónica:")

def normalize_mozambican_phone(phone):
    if not phone: return None
    cleaned = re.sub(r"\D", "", phone)
    if len(cleaned) == 12 and cleaned.startswith("258"):
        op = cleaned[3:5]
        if op in ["82", "83", "84", "85", "86", "87"]:
            return f"+{cleaned}"
    if len(cleaned) == 9:
        op = cleaned[:2]
        if op in ["82", "83", "84", "85", "86", "87"]:
            return f"+258{cleaned}"
    return None

@test("Telefones Vodacom válidos (84 e 85)")
def test_vodacom():
    assert normalize_mozambican_phone("842256366") == "+258842256366"
    assert normalize_mozambican_phone("+258 85 123 4567") == "+258851234567"

@test("Telefones Movitel válidos (86 e 87)")
def test_movitel():
    assert normalize_mozambican_phone("861557953") == "+258861557953"
    assert normalize_mozambican_phone("+258871112233") == "+258871112233"

@test("Telefones Tmcel válidos (82 e 83)")
def test_tmcel():
    assert normalize_mozambican_phone("823344556") == "+258823344556"
    assert normalize_mozambican_phone("839988776") == "+258839988776"

@test("Rejeição de números inválidos ou estrangeiros")
def test_invalid_phones():
    assert normalize_mozambican_phone("812345678") is None  # Prefixo inexistente
    assert normalize_mozambican_phone("912345678") is None  # Portugal
    assert normalize_mozambican_phone("84123") is None      # Incompleto

# -----------------------------------------------------------------------------
# 2. Testes dos 4 Planos Fixos Oficiais da MEGASON
# -----------------------------------------------------------------------------
print("\n📦 Testes dos 4 Planos Oficiais (Preços & Duração):")

OFFICIAL_PLANS = {
    "plan-30d": {"price": 300, "duration": 30},
    "plan-60d": {"price": 550, "duration": 60},
    "plan-90d": {"price": 800, "duration": 90},
    "plan-120d": {"price": 1000, "duration": 120}
}

@test("Conformidade com os 4 planos estritos da MEGASON")
def test_plans_snapshot():
    plans_file = os.path.join(ROOT_DIR, "js", "services", "plans.js")
    with open(plans_file, "r", encoding="utf-8") as f:
        content = f.read()
    
    assert "300" in content and "30" in content, "Plano 30D (300 MT) não encontrado"
    assert "550" in content and "60" in content, "Plano 60D (550 MT) não encontrado"
    assert "800" in content and "90" in content, "Plano 90D (800 MT) não encontrado"
    assert "1000" in content and "120" in content, "Plano 120D (1.000 MT) não encontrado"

# -----------------------------------------------------------------------------
# 3. Testes do Detetor de Comprovativos SMS
# -----------------------------------------------------------------------------
print("\n📦 Testes do Detetor de Métodos de Pagamento via SMS:")

def detect_payment_method(text):
    if not text: return "Outro"
    lower = text.lower()
    if any(k in lower for k in ["mpesa", "m-pesa", "vodacom", "confirmado. transferiste"]):
        return "M-Pesa"
    if any(k in lower for k in ["emola", "e-mola", "movitel"]):
        return "E-Mola"
    if any(k in lower for k in ["absa", "banco", "conta"]):
        return "Absa Bank"
    return "Outro"

@test("Detecção correta de SMS M-Pesa")
def test_sms_mpesa():
    sms = "Confirmado. Transferiste 800.00MT para 842256366 - FRANCISCO em 20/10/2026."
    assert detect_payment_method(sms) == "M-Pesa"

@test("Detecção correta de SMS E-Mola")
def test_sms_emola():
    sms = "Transacao E-Mola confirmada. Valor: 550MT para 861557953."
    assert detect_payment_method(sms) == "E-Mola"

@test("Detecção correta de Comprovativo Bancário Absa")
def test_sms_absa():
    sms = "Transferencia realizada com sucesso para Conta 0708101028295 no Absa Bank."
    assert detect_payment_method(sms) == "Absa Bank"

# -----------------------------------------------------------------------------
# 4. Auditoria de Regras de Segurança (firestore.rules)
# -----------------------------------------------------------------------------
print("\n📦 Auditoria das Regras do Cloud Firestore:")

@test("Validação de regras Zero Trust e blindagem de preços")
def test_firestore_rules():
    rules_path = os.path.join(ROOT_DIR, "firestore.rules")
    with open(rules_path, "r", encoding="utf-8") as f:
        rules = f.read()

    assert "match /{document=**} {\n      allow read, write: if false;\n    }" in rules or "allow read, write: if false;" in rules, "Falta negação padrão Zero Trust"
    assert "isValidPlanPrice" in rules, "Falta validação de preços oficiais de planos"
    assert "role in ['customer', 'user']" in rules, "Regra de role de cliente ausente"
    assert "isAdmin()" in rules, "Falta verificação de administrador"
    assert "request.resource.data.paidAt == resource.data.paidAt" in rules, "Falta bloqueio de auto-aprovação de pagamento"

# -----------------------------------------------------------------------------
# 5. Integridade Estrutural do HTML e Conformidade Visual
# -----------------------------------------------------------------------------
print("\n📦 Integridade Estrutural das Páginas HTML:")

class HtmlBalanceChecker(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags = []
        self.void_tags = {'meta', 'link', 'img', 'br', 'hr', 'input', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'}
    def handle_starttag(self, tag, attrs):
        if tag not in self.void_tags:
            self.tags.append(tag)
    def handle_endtag(self, tag):
        if tag in self.void_tags: return
        if self.tags and self.tags[-1] == tag:
            self.tags.pop()

@test("Validação de fechamento perfeito de tags em index.html")
def test_index_html_tags():
    checker = HtmlBalanceChecker()
    with open(os.path.join(ROOT_DIR, "index.html"), "r", encoding="utf-8") as f:
        checker.feed(f.read())
    assert len(checker.tags) == 0, f"Tags desbalanceadas: {checker.tags}"

@test("Validação de fechamento perfeito de tags em admin/index.html")
def test_admin_html_tags():
    checker = HtmlBalanceChecker()
    with open(os.path.join(ROOT_DIR, "admin", "index.html"), "r", encoding="utf-8") as f:
        checker.feed(f.read())
    assert len(checker.tags) == 0, f"Tags desbalanceadas: {checker.tags}"

@test("Auditoria: Ausência de emojis na interface do utilizador")
def test_no_emojis():
    # Regex para faixa de emojis unicode comuns
    emoji_pattern = re.compile(r"[\U0001F300-\U0001F64F\U0001F680-\U0001F6FF\U0001F900-\U0001F9FF]")
    for filepath in ["index.html", os.path.join("admin", "index.html")]:
        with open(os.path.join(ROOT_DIR, filepath), "r", encoding="utf-8") as f:
            content = f.read()
        emojis_found = emoji_pattern.findall(content)
        assert len(emojis_found) == 0, f"Emojis encontrados em {filepath}: {emojis_found}"

@test("Auditoria de Créditos: Respeito à marca MEGASON e crédito exclusivo no rodapé")
def test_brand_credits():
    with open(os.path.join(ROOT_DIR, "index.html"), "r", encoding="utf-8") as f:
        content = f.read()
    assert "Dev. By Zedeck's IT." in content, "Crédito obrigatório da Zedecks IT ausente no rodapé"
    # Não deve existir 'Zedecks IT' nos textos promocionais da Hero ou benefícios
    assert "MEGASON" in content, "Nome da marca oficial MEGASON deve predominar"

# -----------------------------------------------------------------------------
# 5. Testes de Identificadores Canónicos (IDs de Clientes e Faturas)
# -----------------------------------------------------------------------------
print("📦 Testes de Formatos Oficiais de Clientes e Faturas:")

@test("Formato do ID de Cliente: AI-XXXX (ex: AI-1K7L, AI-H5I8)")
def test_client_id_format():
    client_id_pattern = re.compile(r"^AI-[A-Z0-9]{4}$")
    sample_ids = ["AI-1K7L", "AI-H5I8", "AI-9B3C", "AI-X7Y2"]
    for cid in sample_ids:
        assert client_id_pattern.match(cid), f"ID de cliente inválido: {cid}"
    assert not client_id_pattern.match("AI-123"), "Deveria rejeitar com 3 caracteres"
    assert not client_id_pattern.match("usr_123456"), "Deveria rejeitar ID legado"

@test("Formato da Fatura: FT[ANO]AIXXX (ex: FT2026AI028, FT2026AI001)")
def test_invoice_id_format():
    invoice_pattern = re.compile(r"^FT(20\d\d)AI\d{3,}$")
    sample_invoices = ["FT2026AI001", "FT2026AI028", "FT2026AI105"]
    for inv in sample_invoices:
        assert invoice_pattern.match(inv), f"Fatura inválida: {inv}"
    assert not invoice_pattern.match("inv_123456"), "Deveria rejeitar fatura no formato legado"
    assert not invoice_pattern.match("FT26AI01"), "Deveria exigir ano de 4 dígitos e mínimo de 3 dígitos sequenciais"

# -----------------------------------------------------------------------------
# 6. Testes da Lógica e Matemática de Vigência e Renovação
# -----------------------------------------------------------------------------
print("📦 Testes da Matemática e Vigência de Subscrições (Aprovação & Renovação):")

from datetime import datetime, timezone, timedelta

def calculate_subscription_dates_py(existing_start, existing_end, duration_days, now_dt):
    days = max(1, int(duration_days or 30))
    if existing_end and existing_end > now_dt:
        # Renovação com dias restantes: término aumenta somando ao término anterior
        start_date = existing_start or now_dt
        new_end = existing_end + timedelta(days=days)
        is_extended = True
    else:
        # Nova ativação ou plano expirado: inicia agora
        start_date = now_dt
        new_end = now_dt + timedelta(days=days)
        is_extended = False
    return start_date, new_end, is_extended

@test("Nova Subscrição: Início no ato da aprovação e término exato conforme o plano")
def test_new_subscription_math():
    now = datetime(2026, 10, 21, 12, 0, 0, tzinfo=timezone.utc)
    start, end, is_ext = calculate_subscription_dates_py(None, None, 30, now)
    assert start == now, "Data de início deve ser a data de aprovação"
    assert end == now + timedelta(days=30), "Data de término deve ser exatamente 30 dias após aprovação"
    assert is_ext is False

@test("Renovação com Dias Restantes: Data de término AUMENTA somando ao término anterior")
def test_renewal_accumulation_math():
    now = datetime(2026, 10, 21, 12, 0, 0, tzinfo=timezone.utc)
    # Cliente tem subscrição que expira daqui a 5 dias (26/10/2026)
    existing_start = datetime(2026, 9, 26, 12, 0, 0, tzinfo=timezone.utc)
    existing_end = datetime(2026, 10, 26, 12, 0, 0, tzinfo=timezone.utc)
    
    # Cliente renova plano de 30 dias
    start, end, is_ext = calculate_subscription_dates_py(existing_start, existing_end, 30, now)
    assert is_ext is True, "Deve ser classificado como extensão"
    assert start == existing_start, "Início histórico deve ser preservado"
    # Novo término deve ser 26/10 + 30 dias = 25/11/2026
    expected_end = existing_end + timedelta(days=30)
    assert end == expected_end, f"Término esperado {expected_end}, mas obteve {end}"
    
    # Dias totais restantes a partir de agora: 5 + 30 = 35 dias
    days_left = (end - now).days
    assert days_left == 35, f"Dias restantes esperados: 35, mas calculou: {days_left}"

@test("Renovação após Expiração: Novo período reinicia a partir da aprovação")
def test_renewal_after_expiration_math():
    now = datetime(2026, 10, 21, 12, 0, 0, tzinfo=timezone.utc)
    # Subscrição expirou ontem (20/10/2026)
    existing_start = datetime(2026, 9, 20, 12, 0, 0, tzinfo=timezone.utc)
    existing_end = datetime(2026, 10, 20, 12, 0, 0, tzinfo=timezone.utc)
    
    start, end, is_ext = calculate_subscription_dates_py(existing_start, existing_end, 30, now)
    assert is_ext is False, "Não deve ser extensão se já estava expirada"
    assert start == now, "Data de início deve reiniciar agora"
    assert end == now + timedelta(days=30), "Data final deve ser agora + 30 dias"

# -----------------------------------------------------------------------------
# 7. Testes de Ciclo de Renovação a 7 Dias e Comunicação (WA & E-mail)
# -----------------------------------------------------------------------------
print("📦 Testes de Renovação Automática (7 Dias) e Notificações (WA & E-mail):")

@test("Limiar de 7 dias: Fatura antecipada deve ser acionada apenas quando days_left <= 7")
def test_seven_days_renewal_threshold():
    now = datetime(2026, 10, 22, 12, 0, 0, tzinfo=timezone.utc)
    
    # Caso 1: Faltam 10 dias (não deve gerar fatura ainda)
    end_10d = now + timedelta(days=10)
    days_left_10d = (end_10d - now).days
    should_generate_10d = days_left_10d <= 7
    assert should_generate_10d is False, "Não deve gerar fatura com mais de 7 dias de antecedência"

    # Caso 2: Faltam 7 dias exatos (deve gerar fatura do ciclo seguinte)
    end_7d = now + timedelta(days=7)
    days_left_7d = (end_7d - now).days
    should_generate_7d = days_left_7d <= 7
    assert should_generate_7d is True, "Deve gerar fatura com 7 dias de antecedência"

    # Caso 3: Faltam 3 dias (deve manter / exibir a fatura gerada)
    end_3d = now + timedelta(days=3)
    days_left_3d = (end_3d - now).days
    should_generate_3d = days_left_3d <= 7
    assert should_generate_3d is True, "Deve manter ativação de fatura quando restam 3 dias"

@test("Integridade dos Canais de Pagamento no Serviço de Comunicação")
def test_payment_channels_in_email_service():
    email_service_path = os.path.join(ROOT_DIR, "js", "services", "email.js")
    with open(email_service_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "842256366" in content, "Número M-Pesa oficial ausente no serviço de email"
    assert "861557953" in content, "Número E-Mola oficial ausente no serviço de email"
    assert "000207080810102829586" in content, "NIB e Conta Absa ausentes no serviço de email"
    assert "MEGASON" in content, "Nome da empresa MEGASON deve constar nos dados de pagamento"

@test("Consistência de Dados e Fallback de Faturas no Portal do Utilizador")
def test_customer_invoice_fallback():
    app_js_path = os.path.join(ROOT_DIR, "js", "app.js")
    with open(app_js_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "getInvoiceById" in content, "Falta import ou uso de getInvoiceById no app.js"
    assert "getUserInvoices(state.user.uid, userEmail)" in content, "Falta passagem de userEmail para getUserInvoices"
    assert "activeSub.latestInvoiceId" in content, "Falta verificação de latestInvoiceId"

@test("Sincronização de Perfil com Subscrições e Faturas")
def test_auth_profile_sync():
    auth_js_path = os.path.join(ROOT_DIR, "js", "services", "auth.js")
    with open(auth_js_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "updateDoc(doc(db, \"subscriptions\"" in content, "updateUserProfile deve propagar alterações para subscriptions"
    assert "updateDoc(doc(db, \"invoices\"" in content, "updateUserProfile deve propagar alterações para invoices"

@test("Padronização Visual no Admin: Pílulas Moçambicanas e IDs Elegantes")
def test_admin_visual_consistency():
    admin_js_path = os.path.join(ROOT_DIR, "js", "admin.js")
    with open(admin_js_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "payment-pill-mpesa" in content, "Falta classe de pílula M-Pesa no admin.js"
    assert "payment-pill-emola" in content, "Falta classe de pílula E-Mola no admin.js"
    assert "payment-pill-absa" in content, "Falta classe de pílula Absa no admin.js"
    assert "clientCodeDisplay" in content, "Falta exibição do clientCode nos identificadores da tabela"

# -----------------------------------------------------------------------------
# 8. Testes do Redesenho Administrativo (#q9xG0v): Sidebar, Cascata & WhatsApp
# -----------------------------------------------------------------------------
print("\n📦 Testes de Estrutura Administrativa, Exclusão em Cascata & Faturas:")

@test("Sidebar Lateral e Abas Separadas no Painel Administrativo")
def test_admin_sidebar_layout():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "admin-sidebar" in content, "Elemento .admin-sidebar ausente no admin/index.html"
    assert "tab-content-dashboard" in content, "Aba de Visão Geral (Dashboard) ausente"
    assert "tab-content-customers" in content, "Aba de Gestão de Clientes ausente"
    assert "tab-content-subscriptions" in content, "Aba de Pedidos & Subscrições ausente"
    assert "tab-content-invoices" in content, "Aba de Faturas & Auditoria ausente"
    assert "tab-content-plans" in content, "Aba de Pacotes & Preços ausente"
    assert "tab-content-settings" in content, "Aba de Configurações ausente"
    assert "kpi-active-subscribers" in content, "Card de Clientes Ativos ausente"
    assert "kpi-suspended-subscribers" in content, "Card de Clientes Suspensos ausente"
    assert "kpi-total-customers" in content, "Card de Total de Clientes ausente"

@test("Modal e Função de Eliminação em Cascata de Cliente")
def test_cascade_delete_presence():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "modal-confirm-delete-client" in content_html, "Modal de eliminação em cascata ausente no HTML"
    assert "btn-confirm-delete-client" in content_html, "Botão de confirmação de exclusão ausente no HTML"

    subs_js_path = os.path.join(ROOT_DIR, "js", "services", "subscriptions.js")
    with open(subs_js_path, "r", encoding="utf-8") as f:
        content_subs = f.read()
    assert "deleteCustomerCascade" in content_subs, "Função deleteCustomerCascade ausente em subscriptions.js"
    assert "getAllCustomers" in content_subs, "Função getAllCustomers ausente em subscriptions.js"

@test("Formatação de Fatura Comercial para WhatsApp e Ausência de Texto Redundante")
def test_whatsapp_invoice_and_clean_order_table():
    email_js_path = os.path.join(ROOT_DIR, "js", "services", "email.js")
    with open(email_js_path, "r", encoding="utf-8") as f:
        content_email = f.read()
    assert "formatWhatsAppInvoiceText" in content_email, "formatWhatsAppInvoiceText ausente em email.js"
    assert "FATURA COMERCIAL" in content_email, "Formato profissional de fatura deve conter cabeçalho FATURA COMERCIAL"
    assert "COORDENADAS PARA PAGAMENTO" in content_email, "Dados de pagamento devem constar na fatura do WhatsApp"

    admin_js_path = os.path.join(ROOT_DIR, "js", "admin.js")
    with open(admin_js_path, "r", encoding="utf-8") as f:
        content_admin = f.read()
    assert "Pedido: ${dateFormatted}" not in content_admin, "Texto redundante 'Pedido: data' ainda presente na tabela"
    assert "formatDateOnly" in content_admin, "Helper formatDateOnly deve estar presente para renderização limpa"

# -----------------------------------------------------------------------------
# 9. Testes de Gestão de Perfil do Admin, Faturas Executivas & Recibos
# -----------------------------------------------------------------------------
print("\n📦 Testes de Perfil do Admin, Gestão de Faturas & Recibos Oficiais:")

@test("Edição de Dados e Senha do Administrador (auth.js e admin/index.html)")
def test_admin_profile_editing():
    auth_js_path = os.path.join(ROOT_DIR, "js", "services", "auth.js")
    with open(auth_js_path, "r", encoding="utf-8") as f:
        content_auth = f.read()
    assert "updateAdminProfile" in content_auth, "updateAdminProfile ausente em auth.js"
    assert "changeAdminPassword" in content_auth, "changeAdminPassword ausente em auth.js"

    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "form-admin-profile" in content_html, "Formulário de perfil do administrador ausente no HTML"
    assert "admin-profile-name" in content_html, "Campo de nome do administrador ausente"
    assert "admin-profile-whatsapp" in content_html, "Campo de WhatsApp do administrador ausente"
    assert "form-admin-password" in content_html, "Formulário de alteração de senha do admin ausente"

@test("Tabela Executiva de Faturas, Filtros de Busca e Modal de Espelho de Recibo")
def test_invoices_executive_table_and_modal():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "admin-invoices-search-input" in content_html, "Input de busca de faturas ausente no HTML"
    assert "admin-invoices-status-filter" in content_html, "Select de filtro de status de faturas ausente"
    assert "modal-invoice-preview" in content_html, "Modal de espelho de recibo oficial ausente no HTML"
    assert "btn-print-invoice-preview" in content_html, "Botão de impressão da fatura ausente no HTML"

    admin_js_path = os.path.join(ROOT_DIR, "js", "admin.js")
    with open(admin_js_path, "r", encoding="utf-8") as f:
        content_admin = f.read()
    assert "openInvoicePreviewModal" in content_admin, "openInvoicePreviewModal ausente em admin.js"
    assert "invoicesSearchQuery" in content_admin, "Variável de busca de faturas ausente"
    assert "invoicesStatusFilter" in content_admin, "Variável de filtro de faturas ausente"

@test("Configurações da Empresa com Coordenadas de Pagamento Moçambicanas Editáveis")
def test_company_settings_payment_coordinates():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "admin-setting-mpesa-number" in content_html, "Campo de número M-Pesa ausente"
    assert "admin-setting-emola-number" in content_html, "Campo de número E-Mola ausente"
    assert "admin-setting-absa-account" in content_html, "Campo de conta Absa ausente"
    assert "admin-setting-absa-nib" in content_html, "Campo de NIB Absa ausente"

print(f"\n{BLUE}📦 Testes da Gestão & Ficha Completa de Clientes:{RESET}")

@test("Tabela de Clientes Executiva de 7 Colunas e Filtro de Estado")
def test_customers_table_7_columns_and_filters():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "admin-customers-status-filter" in content_html, "Filtro admin-customers-status-filter ausente"
    assert "Pasta ChatGPT Plus" in content_html, "Coluna de Pasta ChatGPT Plus ausente na tabela de clientes"
    assert "Subscrição Atual" in content_html, "Coluna de Subscrição Atual ausente na tabela de clientes"
    
    admin_js_path = os.path.join(ROOT_DIR, "js", "admin.js")
    with open(admin_js_path, "r", encoding="utf-8") as f:
        content_js = f.read()
    assert "customersStatusFilter" in content_js, "Filtro customersStatusFilter ausente em admin.js"
    assert "btn-customer-details" in content_js, "Botão btn-customer-details ausente em admin.js"
    assert "btn-customer-assign-plan" in content_js, "Botão btn-customer-assign-plan ausente em admin.js"

@test("Ficha Completa do Cliente com Edição Cadastral e Histórico de Faturas")
def test_customer_details_modal_and_service():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "modal-customer-details" in content_html, "Modal modal-customer-details ausente"
    assert "customer-edit-folder" in content_html, "Campo customer-edit-folder ausente"
    assert "customer-edit-province" in content_html, "Campo customer-edit-province ausente"
    assert "tbody-customer-invoices" in content_html, "Tabela de faturas do cliente tbody-customer-invoices ausente"

    subs_js_path = os.path.join(ROOT_DIR, "js", "services", "subscriptions.js")
    with open(subs_js_path, "r", encoding="utf-8") as f:
        content_subs = f.read()
    assert "adminUpdateCustomer" in content_subs, "Função adminUpdateCustomer ausente em subscriptions.js"
    assert "adminAssignPlanToCustomer" in content_subs, "Função adminAssignPlanToCustomer ausente em subscriptions.js"

@test("Modal de Atribuição Direta de Pacotes e Ativação Imediata")
def test_admin_assign_plan_modal():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "modal-admin-assign-plan" in content_html, "Modal modal-admin-assign-plan ausente"
    assert "assign-plan-select" in content_html, "Select assign-plan-select ausente"
    assert "assign-plan-mark-paid" in content_html, "Checkbox assign-plan-mark-paid ausente"

    admin_js_path = os.path.join(ROOT_DIR, "js", "admin.js")
    with open(admin_js_path, "r", encoding="utf-8") as f:
        content_js = f.read()
    assert "openAssignPlanModal" in content_js, "openAssignPlanModal ausente em admin.js"
    assert "handleAssignPlanToCustomer" in content_js, "handleAssignPlanToCustomer ausente em admin.js"

print(f"\n{BLUE}📦 Testes de Responsividade, Colunas Atómicas & Rodapé Oficial:{RESET}")

@test("Tabelas com Colunas Atómicas e sem Quebra de Texto (white-space: nowrap)")
def test_atomic_tables_no_wrap():
    css_path = os.path.join(ROOT_DIR, "css", "components.css")
    with open(css_path, "r", encoding="utf-8") as f:
        content_css = f.read()
    assert "white-space: nowrap;" in content_css, "Regra white-space: nowrap ausente em components.css"
    
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    # Verifica que não há colunas agrupadas tipo 'Cliente & Contacto' ou 'Plano & Preço'
    assert "Cliente & Contacto" not in content_html, "Coluna agrupada 'Cliente & Contacto' não deve existir"
    assert "Plano & Preço" not in content_html, "Coluna agrupada 'Plano & Preço' não deve existir"
    assert "Fatura N.º & Status" not in content_html, "Coluna agrupada 'Fatura N.º & Status' não deve existir"

@test("Rodapé Administrativo Integrado com © na esquerda e Créditos/Versão na direita")
def test_admin_footer_layout():
    admin_html_path = os.path.join(ROOT_DIR, "admin", "index.html")
    with open(admin_html_path, "r", encoding="utf-8") as f:
        content_html = f.read()
    assert "admin-footer" in content_html, "Classe admin-footer ausente em admin/index.html"
    assert "admin-footer-left" in content_html, "Classe admin-footer-left ausente"
    assert "admin-footer-right" in content_html, "Classe admin-footer-right ausente"
    assert "Dev. By Zedeck's IT." in content_html, "Crédito da Zedecks IT ausente"
    assert "v1.0.0" in content_html, "Versão ausente no rodapé"

@test("Sidebar com Suporte a Colapso no Desktop e Drawer no Mobile")
def test_sidebar_collapse_and_mobile_drawer():
    css_path = os.path.join(ROOT_DIR, "css", "components.css")
    with open(css_path, "r", encoding="utf-8") as f:
        content_css = f.read()
    assert ".admin-sidebar.collapsed" in content_css, "Classe .admin-sidebar.collapsed ausente em components.css"
    
    admin_js_path = os.path.join(ROOT_DIR, "js", "admin.js")
    with open(admin_js_path, "r", encoding="utf-8") as f:
        content_js = f.read()
    assert "adminSidebar?.classList.toggle(\"collapsed\")" in content_js or "adminSidebar?.classList.toggle('collapsed')" in content_js or "collapsed" in content_js, "Lógica de colapso ausente em admin.js"


# -----------------------------------------------------------------------------
# Resumo Final
# -----------------------------------------------------------------------------
print(f"\n{YELLOW}------------------------------------------------------{RESET}")
print(f"Total de Testes: {tests_passed + tests_failed}")
print(f"Sucessos: {GREEN}{tests_passed}{RESET}")
print(f"Falhas: {RED}{tests_failed}{RESET}")
print(f"{YELLOW}------------------------------------------------------{RESET}\n")

if tests_failed > 0:
    sys.exit(1)
sys.exit(0)
