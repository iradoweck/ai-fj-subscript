# Arquitetura Legada — MEGASON MVP (Firebase / Firestore)
*Preservado para histórico e compatibilidade retroativa antes da migração para MySQL + cPanel.*

---

## Informações do Snapshot Legado
- **Data de arquivamento:** 23 de Outubro de 2026
- **Tecnologias:** Firebase Authentication, Cloud Firestore (NoSQL), BroadcastChannel
- **Motivo da Migração:** Adoção de infraestrutura nativa MySQL + PHP 8.x PDO para hospedagem completa em cPanel com integridade referencial `ON DELETE CASCADE`.

## Arquivos Preservados
- `firestore.rules`: Regras de segurança RBAC e validação matemática de pacotes no Cloud Firestore.
- `js/services/firebase.js`: Inicializador modular do Firebase SDK via CDN oficial da Google.
- `js/config/firebase-config.js`: Credenciais de conexão com o projeto Firebase `fj-megason`.
