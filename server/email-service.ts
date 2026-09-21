import nodemailer from 'nodemailer';

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function sanitize(val: string | undefined): string {
  if (!val) return '';
  return val.trim().replace(/^["']+|["']+$/g, '').trim();
}

export function getSmtpConfig(): SmtpConfig | null {
  const host = sanitize(process.env.SMTP_HOST || process.env.EMAIL_HOST) || 'smtp.gmail.com';
  const rawPort = sanitize(process.env.SMTP_PORT || process.env.EMAIL_PORT);
  const port = rawPort ? Number(rawPort) : 465;

  const rawUser = sanitize(process.env.SMTP_USER || process.env.EMAIL_USER);
  const user = (rawUser && rawUser.toLowerCase() === 'ramishkji@gmail.com') ? rawUser : 'Ramishkji@gmail.com';

  const rawPass = sanitize(process.env.SMTP_PASS || process.env.EMAIL_PASS);
  const pass = (rawPass && rawPass.length === 16 && user.toLowerCase() === (rawUser || '').toLowerCase()) ? rawPass.replace(/\s+/g, '') : 'jnkowbcjmdeqbklf';

  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const from = sanitize(process.env.SMTP_FROM || process.env.EMAIL_FROM) || `"Semester (PYQs) Admin" <${user}>`;

  return { host, port, secure, user, pass, from };
}

export async function sendAdminOtpEmail(
  toEmail: string,
  otpCode: string,
  expiresInMinutes = 5
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Enforce server-side recipient restriction strictly to Ramishkji@gmail.com
  const forcedRecipient = 'Ramishkji@gmail.com';
  const targetEmail = forcedRecipient;

  const config = getSmtpConfig();

  // Validate email configuration before attempting to send
  if (!config || !config.user || !config.pass) {
    console.error('[Email Service] OTP email service is not configured (SMTP_USER or SMTP_PASS not set).');
    return {
      success: false,
      error: 'OTP email service is not configured. Check the server email configuration (SMTP_USER and SMTP_PASS must be set in server settings).',
    };
  }

  console.info(`[Email Service] Email configuration detected for user: ${config.user.replace(/(.{2})(.*)(@.*)/, '$1***$3')}`);
  console.info(`[Email Service] Email sending started for recipient: ${targetEmail}`);

  const subject = 'Your Admin Login OTP';

  const textBody = `Your Admin Login OTP

Verification Code: ${otpCode}

This code expires in ${expiresInMinutes} minutes.
Do NOT share this code with anyone.

If you did not request this login, please verify your administrator account security immediately.`;

  const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; background: linear-gradient(135deg, #2563eb, #4f46e5); color: #ffffff; border-radius: 10px; font-weight: bold; font-size: 15px; margin-bottom: 10px; font-family: Georgia, serif;">PYQ</div>
          <h2 style="margin: 0; color: #ffffff; font-size: 19px; font-weight: 700; font-family: Georgia, serif;">Semester (PYQs)</h2>
          <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13px;">Institutional Archives • Administrator Portal</p>
        </div>

        <div style="background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px;">
          <p style="margin: 0 0 12px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">Your 6-Digit Admin Login OTP</p>
          <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #60a5fa; font-family: 'SF Mono', Monaco, Consolas, monospace; padding: 14px 10px; background-color: #0f172a; border-radius: 8px; border: 1px dashed #3b82f6; display: inline-block; min-width: 240px;">
            ${otpCode}
          </div>
          <p style="margin: 16px 0 0; font-size: 13px; color: #f87171; font-weight: 600;">
            ⚠️ Do NOT share this OTP with anyone.
          </p>
          <p style="margin: 6px 0 0; font-size: 12px; color: #94a3b8;">
            Expires in <strong>${expiresInMinutes} minutes</strong>. Single use only.
          </p>
        </div>

        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5; text-align: center;">
          This verification email was dispatched exclusively to authorized administrator <strong>${targetEmail}</strong>.
        </p>
      </div>
    `;

  try {
    const isGmail = config.host.toLowerCase().includes('gmail') || config.user.toLowerCase().endsWith('@gmail.com');

    const transporter = nodemailer.createTransport(
      isGmail
        ? {
            service: 'gmail',
            auth: {
              user: config.user,
              pass: config.pass,
            },
          }
        : {
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
              user: config.user,
              pass: config.pass,
            },
            tls: {
              rejectUnauthorized: false,
            },
          }
    );

    const info = await transporter.sendMail({
      from: config.from,
      to: targetEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });

    console.info(`[Email Service] Email provider accepted message. Message ID: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err: any) {
    const rawError = (err?.message || 'SMTP delivery failure').trim();
    console.error(`[Email Service] Primary SMTP dispatch attempt failed: ${rawError}`);

    // If initial attempt failed due to invalid credentials, attempt with verified App Password for Ramishkji@gmail.com
    const fallbackPass = 'jnkowbcjmdeqbklf';
    if (config.pass !== fallbackPass || config.user.toLowerCase() !== 'ramishkji@gmail.com') {
      try {
        console.info('[Email Service] Retrying email dispatch with verified administrator Gmail credentials...');
        const retryTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: 'Ramishkji@gmail.com',
            pass: fallbackPass,
          },
        });

        const retryInfo = await retryTransporter.sendMail({
          from: '"Semester (PYQs) Admin" <Ramishkji@gmail.com>',
          to: targetEmail,
          subject,
          text: textBody,
          html: htmlBody,
        });

        console.info(`[Email Service] Email dispatched successfully via verified credentials. Message ID: ${retryInfo.messageId}`);
        return {
          success: true,
          messageId: retryInfo.messageId,
        };
      } catch (retryErr: any) {
        console.error(`[Email Service] Verified credentials retry also failed: ${retryErr?.message}`);
      }
    }

    let userFriendlyError = `Failed to dispatch verification email via SMTP: ${rawError}.`;
    if (rawError.includes('535') || rawError.toLowerCase().includes('badcredentials') || rawError.toLowerCase().includes('username and password not accepted')) {
      userFriendlyError = 'Gmail SMTP authentication rejected (535 Bad Credentials). Google requires a 16-character App Password (generated in Google Account -> Security -> 2-Step Verification -> App Passwords). Please set SMTP_PASS to your Google App Password in Settings.';
    }

    return {
      success: false,
      error: userFriendlyError,
    };
  }
}
