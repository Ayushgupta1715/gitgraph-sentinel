from auth import verify_jwt, check_permission
from payment import process_refund, execute_transfer, calculate_tax
from db import UserModel
from notifications import send_slack_alert

# Route 1: Authenticated User Profile Endpoint
def get_profile_handler(request_headers: dict):
    """
    GET /api/v1/profile
    [AUTHENTICATED]: Validates Authorization Bearer token before touching UserModel.
    """
    token = request_headers.get("Authorization")
    user = verify_jwt(token)
    return UserModel.get_user_credentials(user["user_id"])

# Route 2: VULNERABLE ENDPOINT - Missing Authentication Middleware!
def refund_handler(request_body: dict):
    """
    POST /api/v1/payments/refund
    [CRITICAL FLAW]: Missing verify_jwt call!
    Directly passes arbitrary client request payload to process_refund -> LedgerModel.
    Attack Path: RouteHandler -> process_refund -> LedgerModel.update_balance
    """
    client_user_id = request_body.get("user_id")
    tx_id = request_body.get("tx_id")
    refund_amount = request_body.get("amount", 0.0)
    return process_refund(client_user_id, tx_id, refund_amount)

# Route 3: Authenticated Admin Balance Transfer
def admin_transfer_handler(request_headers: dict, request_body: dict):
    """
    POST /api/v1/admin/transfer
    [AUTHENTICATED & AUTHORIZED]: Validates token and checks admin permissions.
    """
    token = request_headers.get("Authorization")
    user = verify_jwt(token)
    if check_permission(user["user_id"], "finance_admin"):
        return execute_transfer(request_body["from_id"], request_body["to_id"], request_body["amount"])
    raise PermissionError("Access denied")

# Route 4: Public Quotation Tool (Harmless)
def public_quote_handler(request_body: dict):
    """
    POST /api/v1/public/tax-quote
    [PUBLIC]: Computes tax with zero sensitive model access.
    """
    amount = float(request_body.get("amount", 100.0))
    return calculate_tax(amount)

# Route 5: External Webhook Receiver
def webhook_receiver_handler(payload: dict):
    """
    POST /api/v1/webhooks/incoming
    [INTERNAL]: Logs system alerts.
    """
    event = payload.get("event_type", "generic")
    send_slack_alert("#webhooks", f"Received incoming event: {event}")
    return {"status": "received"}
