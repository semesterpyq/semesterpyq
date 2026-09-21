import nodemailer from 'nodemailer';
import { getSmtpConfig, SmtpConfig } from './email-service';

export async function runSmtpDiagnostic(): Promise<{
  success: boolean;
  host: string;
  port: number;
  secure: boolean;
  userMasked: string;
  handshakeSuccess: boolean;
  mailSentSuccess: boolean;
  messageId?: string;
  error?: string;
  details: string[];
}> {
  const details: string[] = [];
  const config = getSmtpConfig();

  if (!config || !config.user || !config.pass) {
    return {
      success: false,
      host: 'unknown',
      port: 0,
      secure: false,
      userMasked: 'none',
      handshakeSuccess: false,
      mailSentSuccess: false,
      error: 'SMTP configuration is missing or incomplete (SMTP_USER or SMTP_PASS not set).',
      details: ['SMTP configuration check failed: missing credentials.'],
    };
  }

  const maskedUser = config.user.replace(/(.{2})(.*)(@.*)/, '$1***$3');
  details.push(`Loaded SMTP configuration for host: ${config.host}:${config.port} (secure: ${config.secure}), user: ${maskedUser}`);

  const isGmail = config.host.toLowerCase().includes('gmail') || config.user.toLowerCase().endsWith('@gmail.com');
  const transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: 'gmail',
          auth: { user: config.user, pass: config.pass },
        }
      : {
          host: config.host,
          port: config.port,
          secure: config.secure,
          auth: { user: config.user, pass: config.pass },
          tls: { rejectUnauthorized: false },
        }
  );

  let handshakeSuccess = false;
  try {
    details.push(`Initiating SMTP connection handshake and authentication verification for ${maskedUser}...`);
    await transporter.verify();
    handshakeSuccess = true;
    details.push(`SMTP connection handshake and authentication verified successfully for ${maskedUser}.`);
  } catch (err: any) {
    details.push(`SMTP handshake/authentication failed: ${err?.message || err}`);
    return {
      success: false,
      host: config.host,
      port: config.port,
      secure: config.secure,
      userMasked: maskedUser,
      handshakeSuccess: false,
      mailSentSuccess: false,
      error: err?.message || 'Handshake failed',
      details,
    };
  }

  let mailSentSuccess = false;
  let messageId: string | undefined;

  try {
    details.push(`Sending diagnostic test message to authorized admin: Ramishkji@gmail.com...`);
    const info = await transporter.sendMail({
      from: config.from,
      to: 'Ramishkji@gmail.com',
      subject: 'SMTP Diagnostic Verification Test',
      text: 'This is an automated diagnostic test message confirming SMTP connectivity and mail-sending capability.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 8px;">
          <h3 style="color: #60a5fa; margin-top: 0;">SMTP Diagnostic Test Successful</h3>
          <p>Connectivity, authentication, and mail-sending capability have been verified successfully for <strong>${maskedUser}</strong>.</p>
          <p style="font-size: 12px; color: #94a3b8;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    mailSentSuccess = true;
    messageId = info.messageId;
    details.push(`Test message accepted by mail server via ${maskedUser}. Message ID: ${messageId}`);
  } catch (err: any) {
    details.push(`Failed to send test message: ${err?.message || err}`);
    return {
      success: false,
      host: config.host,
      port: config.port,
      secure: config.secure,
      userMasked: maskedUser,
      handshakeSuccess,
      mailSentSuccess: false,
      error: err?.message || 'Mail send failed',
      details,
    };
  }

  return {
    success: true,
    host: config.host,
    port: config.port,
    secure: config.secure,
    userMasked: maskedUser,
    handshakeSuccess,
    mailSentSuccess,
    messageId,
    details,
  };
}
