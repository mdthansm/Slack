"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import * as nodemailer from "nodemailer";

export const sendInvite = action({
  args: {
    email: v.string(),
    invitedByUserId: v.id("users"),
    workspaceId: v.id("workspaces"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const inviter = await ctx.runQuery(internal.users.getInternal, {
      userId: args.invitedByUserId,
    });
    const inviterName = inviter?.name ?? "Someone";
    const inviterEmail = inviter?.email ?? "";

    const workspace = await ctx.runQuery(internal.workspaces.getInternal, {
      workspaceId: args.workspaceId,
    });
    const workspaceName = workspace?.name ?? "a workspace";

    await ctx.runMutation(internal.appInvites.inviteInternal, {
      email: args.email,
      invitedByUserId: args.invitedByUserId,
      workspaceId: args.workspaceId,
      role: args.role,
    });

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromName = process.env.SMTP_FROM_NAME || "Slack Clone";

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.warn("SMTP not configured — invite saved but email not sent.");
      return { sent: false, reason: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const signUpUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
      ? process.env.NEXT_PUBLIC_CONVEX_SITE_URL.replace(".convex.site", "")
      : "http://localhost:3000";

    const roleLabel = args.role === "admin" ? "an Admin" : "a Member";

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f4f4f8;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#611f69,#4a154b);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Slack Clone</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 20px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#1d1c1d;">You've been invited!</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#616061;">
              <strong>${inviterName}</strong> (${inviterEmail}) has invited you to join
              workspace <strong>${workspaceName}</strong> as ${roleLabel}.
              Sign up to start collaborating with your team.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding:8px 0 24px;">
                <a href="${signUpUrl}"
                   style="display:inline-block;padding:14px 36px;background:#611f69;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                  Join ${workspaceName}
                </a>
              </td></tr>
            </table>
            <p style="margin:0;font-size:13px;color:#999;line-height:1.5;">
              If the button above doesn't work, copy and paste this link into your browser:<br/>
              <a href="${signUpUrl}" style="color:#611f69;word-break:break-all;">${signUpUrl}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#aaa;text-align:center;">
              This invite was sent by ${inviterName} via ${fromName}.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    try {
      await transporter.sendMail({
        from: `"${fromName}" <${smtpUser}>`,
        replyTo: inviterEmail || smtpUser,
        to: args.email,
        subject: `${inviterName} invited you to ${workspaceName}`,
        html,
        text: `${inviterName} (${inviterEmail}) has invited you to join workspace "${workspaceName}" as ${roleLabel}. Sign up here: ${signUpUrl}`,
      });
      return { sent: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Failed to send invite email:", message);
      return { sent: false, reason: message };
    }
  },
});
