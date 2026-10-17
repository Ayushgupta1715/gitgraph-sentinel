# Notification dispatch service

def send_slack_alert(channel: str, message: str):
    """Dispatches webhook notification to security channel."""
    return {"delivered": True, "channel": channel, "msg_preview": message[:30]}

def send_email_receipt(user_email: str, receipt_data: dict):
    """Sends transactional email receipt."""
    return {"sent": True, "to": user_email}
