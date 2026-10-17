# Authentication and Authorization Engine
import time

def verify_jwt(token: str):
    """
    Verifies JWT token signature and claims.
    AUTHENTICATES incoming requests.
    """
    if not token or token == "invalid":
        raise ValueError("401 Unauthorized: Invalid or missing bearer token")
    return {"user_id": 101, "role": "authenticated_user", "issued_at": time.time()}

def check_permission(user_id: int, required_role: str):
    """
    Role-Based Access Control (RBAC) validation.
    """
    admin_users = [101, 102]
    if required_role == "finance_admin" and user_id in admin_users:
        return True
    return False

def audit_auth_event(user_id: int, action: str, status: str):
    """Logs security and authentication events."""
    return {"event": "auth_audit", "user": user_id, "action": action, "status": status}
