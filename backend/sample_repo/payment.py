from auth import check_permission, audit_auth_event
from db import LedgerModel, AuditLogModel
from notifications import send_slack_alert, send_email_receipt

def process_refund(user_id: int, transaction_id: str, amount: float):
    """
    Core refund processor.
    Multi-hop chain: routes.py -> process_refund -> LedgerModel.update_balance
    """
    # Flaw: Relies solely on user_id passed in request without verified caller authentication
    has_perm = check_permission(user_id, "finance_admin")
    if not has_perm:
        AuditLogModel.record_entry("UNAUTHORIZED_REFUND_ATTEMPT", {"user_id": user_id, "tx": transaction_id})
        send_slack_alert("#security-alerts", f"Unauthorized refund attempt for user {user_id}")
        return {"status": "denied", "reason": "Insufficient administrative privileges"}
    
    result = LedgerModel.update_balance(user_id, -amount)
    audit_auth_event(user_id, "REFUND_EXECUTED", "SUCCESS")
    send_email_receipt(f"user_{user_id}@example.com", result)
    return {"status": "approved", "ledger": result}

def execute_transfer(sender_id: int, recipient_id: int, amount: float):
    """Direct balance transfer between accounts."""
    LedgerModel.update_balance(sender_id, -amount)
    LedgerModel.update_balance(recipient_id, amount)
    return {"status": "transferred", "amount": amount}

def calculate_tax(amount: float, jurisdiction: str = "US_CA"):
    """Pure tax computation utility without sensitive data access."""
    rate = 0.0825 if jurisdiction == "US_CA" else 0.05
    return {"subtotal": amount, "tax_rate": rate, "tax_amount": amount * rate}
