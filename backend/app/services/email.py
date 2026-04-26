import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import get_settings

logger = logging.getLogger("baba.email")


def _send_smtp_sync(to: str, subject: str, html: str) -> None:
    settings = get_settings()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from
    msg["To"] = to
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        if settings.smtp_tls:
            server.starttls()
        if settings.smtp_user:
            server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to, msg.as_string())


async def send_email(to: str, subject: str, html: str) -> None:
    """Send an e-mail asynchronously. Logs errors without raising."""
    settings = get_settings()
    if not settings.smtp_enabled:
        logger.info("SMTP disabled — skipping email to=%s subject=%s", to, subject)
        return
    try:
        await asyncio.to_thread(_send_smtp_sync, to, subject, html)
        logger.info("Email sent to=%s subject=%s", to, subject)
    except Exception:
        logger.exception("Failed to send email to=%s subject=%s", to, subject)


def build_password_reset_email(reset_url: str) -> str:
    return f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Redefinir senha — App do Baba</title>
</head>
<body style="margin:0;padding:0;background:#07110f;font-family:system-ui,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#07110f;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#0d1f1a;border-radius:20px;padding:40px;border:1px solid rgba(255,255,255,0.08);">
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <div style="display:inline-flex;width:52px;height:52px;background:linear-gradient(135deg,#38D39F,#4CC9F0);border-radius:14px;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#07110f;margin:0 auto;">B</div>
              <p style="margin:12px 0 0;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:.12em;">App do Baba</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:20px;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#f8fafc;line-height:1.3;">Redefinir sua senha</h1>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-size:15px;color:#94a3b8;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha. O link expira em <strong style="color:#e2e8f0;">30 minutos</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <a href="{reset_url}" style="display:inline-block;background:linear-gradient(135deg,#38D39F,#4CC9F0);color:#07110f;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
                Redefinir senha
              </a>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px;">
              <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
                Se você não solicitou a redefinição, ignore este e-mail. Sua senha permanece a mesma.<br/><br/>
                Ou copie este link: <a href="{reset_url}" style="color:#38D39F;word-break:break-all;">{reset_url}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
