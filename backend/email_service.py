"""Stub email service for StagePass.

Wire your email provider (Resend / SendGrid / your own agent) here.
Both functions are called from server.py. They currently log to the
backend stdout — when you plug in Resend, replace the body of each
function with the actual send call.

Example with Resend:
    import resend
    resend.api_key = os.environ["RESEND_API_KEY"]
    resend.Emails.send({
        "from": os.environ["SENDER_EMAIL"],
        "to": [to_email],
        "subject": subject,
        "html": html,
    })
"""

import logging

logger = logging.getLogger("stagepass.email")


def _ticket_email_html(user_name: str, booking: dict) -> str:
    seats = ", ".join(
        f"{chr(65 + s['row'])}{s['col'] + 1}" for s in booking.get("seats", [])
    )
    return f"""
    <div style="font-family: Arial, sans-serif; background:#050505; color:#fff; padding:32px;">
      <h1 style="color:#D3FF24; letter-spacing:-1px;">StagePass</h1>
      <h2>Your seats are confirmed, {user_name}.</h2>
      <p style="color:#aaa">Event: <b style="color:#fff">{booking.get('event_title')}</b></p>
      <p style="color:#aaa">Venue: {booking.get('event_venue')}</p>
      <p style="color:#aaa">Seats: <span style="color:#D3FF24">{seats}</span></p>
      <p style="color:#aaa">Total: <b style="color:#fff">${booking.get('total', 0):.2f}</b></p>
      <p style="color:#666; font-size:12px; margin-top:24px;">
        Show this email at the door. Booking ID: {booking.get('id')}
      </p>
    </div>
    """


def _plan_email_html(user_name: str, plan_name: str, price: float) -> str:
    return f"""
    <div style="font-family: Arial, sans-serif; background:#050505; color:#fff; padding:32px;">
      <h1 style="color:#FF2E93;">StagePass {plan_name}</h1>
      <h2>Welcome to the front row, {user_name}.</h2>
      <p style="color:#aaa">Your {plan_name} plan is now active. ${price:.2f}/mo.</p>
      <p style="color:#aaa">Head to your <a style="color:#D3FF24" href="https://seat-select-3d-1.preview.emergentagent.com/organize">Host dashboard</a> to create your next event.</p>
    </div>
    """


def send_booking_confirmation(to_email: str, user_name: str, booking: dict) -> None:
    """Called after a booking is confirmed and paid.

    Replace the body of this function with your Resend / agent integration.
    """
    html = _ticket_email_html(user_name, booking)
    logger.info(
        "[EMAIL STUB] To: %s | Subject: Your StagePass tickets | Booking: %s",
        to_email,
        booking.get("id"),
    )
    # When ready, uncomment + add resend in requirements.txt:
    # import resend, os
    # resend.api_key = os.environ["RESEND_API_KEY"]
    # resend.Emails.send({
    #     "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
    #     "to": [to_email],
    #     "subject": f"Your StagePass tickets — {booking.get('event_title')}",
    #     "html": html,
    # })
    _ = html  # silence unused


def send_plan_upgrade_confirmation(to_email: str, user_name: str, plan_name: str, price: float) -> None:
    """Called after a plan upgrade succeeds (Stripe payment confirmed).

    Replace the body of this function with your Resend / agent integration.
    """
    html = _plan_email_html(user_name, plan_name, price)
    logger.info(
        "[EMAIL STUB] To: %s | Subject: Welcome to %s | Price: $%.2f",
        to_email,
        plan_name,
        price,
    )
    _ = html
