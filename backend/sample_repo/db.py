# Database Access Layer with models and sensitive resource classifications

class UserModel:
    name = "users_table"
    sensitive = True

    @staticmethod
    def get_user_credentials(user_id: int):
        # ACCESSES sensitive credential data
        return {
            "id": user_id,
            "api_key": "sec_k9921_prod_secret",
            "hashed_password": "$2b$12$e8YF/r7X8B...",
            "email": "sarah.connor@cyberdyne.io"
        }

class LedgerModel:
    name = "financial_ledger_table"
    sensitive = True

    @staticmethod
    def update_balance(account_id: int, delta: float):
        # ACCESSES critical balance records
        return {
            "account_id": account_id,
            "previous_balance": 5420.00,
            "new_balance": 5420.00 + delta,
            "ledger_hash": "a9f8b4c2e1d0"
        }

class AuditLogModel:
    name = "security_audit_logs"
    sensitive = False

    @staticmethod
    def record_entry(action_type: str, metadata: dict):
        return {"status": "persisted", "action": action_type}
