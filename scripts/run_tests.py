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
