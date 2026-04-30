# Supabase Email Templates - Austin Auto Detail

These templates live in the Supabase Dashboard, not in this repo. This file is
just a record of what to paste so you can re-apply if Supabase ever loses them.

**Where to apply:** Supabase Dashboard → Authentication → Email Templates →
pick the template name → paste the Subject + HTML body → Save.

---

## Confirm signup (Bug 4 - required)

### Subject

```
Welcome to Austin Auto Detail - Confirm your email
```

### HTML body

```html
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b0b0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f8f8f8;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b0d;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#15151a;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
            <!-- Header with logo wordmark -->
            <tr>
              <td align="center" style="padding:32px 24px 16px;border-bottom:1px solid rgba(255,255,255,0.08);">
                <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:0.06em;color:#d62030;">AAD</p>
                <p style="margin:6px 0 0;font-size:11px;letter-spacing:0.32em;color:#f8f8f8;">DETAILING</p>
              </td>
            </tr>
            <!-- Body -->
            <tr>
              <td style="padding:32px 28px 8px;">
                <h1 style="margin:0;font-size:22px;font-weight:600;color:#fff;">Welcome to Austin Auto Detail</h1>
                <p style="margin:16px 0 0;color:#c8c8c8;line-height:1.6;font-size:15px;">
                  Thanks for signing up. Click the button below to confirm your email and start booking mobile detailing in Austin.
                </p>
              </td>
            </tr>
            <!-- CTA button -->
            <tr>
              <td align="center" style="padding:28px 28px 8px;">
                <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(180deg,#e83444 0%,#d62030 50%,#b81a28 100%);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 28px;border-radius:10px;box-shadow:0 6px 20px -8px rgba(214,32,48,0.6);">
                  Confirm Your Email →
                </a>
              </td>
            </tr>
            <!-- Fallback link -->
            <tr>
              <td style="padding:24px 28px 8px;">
                <p style="margin:0;color:#888;font-size:12px;line-height:1.6;">
                  Button not working? Copy and paste this link into your browser:<br>
                  <a href="{{ .ConfirmationURL }}" style="color:#d62030;word-break:break-all;">{{ .ConfirmationURL }}</a>
                </p>
              </td>
            </tr>
            <!-- Disclaimer -->
            <tr>
              <td style="padding:24px 28px 32px;">
                <p style="margin:0;color:#666;font-size:11px;line-height:1.6;">
                  If you didn't sign up for Austin Auto Detail, you can safely ignore this email.
                </p>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td align="center" style="padding:20px 24px;border-top:1px solid rgba(255,255,255,0.08);background:#0b0b0d;">
                <p style="margin:0;color:#666;font-size:11px;letter-spacing:0.04em;">
                  Austin Auto Detail · <a href="https://austin-autodetail.com" style="color:#888;text-decoration:none;">austin-autodetail.com</a>
                </p>
                <p style="margin:6px 0 0;color:#555;font-size:10px;">Quality Over Quantity · Mobile detailing in Austin, TX</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

---

## Magic Link (optional, future)

If/when we enable passwordless sign-in, use the same template with these tweaks:

- **Subject:** `Sign in to Austin Auto Detail`
- **Heading:** `Sign in to your account`
- **CTA label:** `Sign In →`

---

## Reset Password (optional, future)

- **Subject:** `Reset your Austin Auto Detail password`
- **Heading:** `Reset your password`
- **Body copy:** `Click the button below to set a new password. The link expires in 1 hour.`
- **CTA label:** `Reset Password →`

---

## Custom SMTP (highly recommended - better deliverability)

Right now Supabase sends from `noreply@mail.app.supabase.io` which often hits
spam. Switch to your own domain via Resend so emails arrive from
`notifications@austin-autodetail.com`:

1. Supabase Dashboard → Project Settings → Authentication → SMTP Settings →
   **Enable Custom SMTP**
2. Fields:
   - **Host:** `smtp.resend.com`
   - **Port:** `465`
   - **User:** `resend`
   - **Pass:** a Resend API key (create a new one separate from the existing
     `RESEND_API_KEY` if you want isolation)
   - **Sender email:** `notifications@austin-autodetail.com`
   - **Sender name:** `Austin Auto Detail`
3. Save.

The domain `austin-autodetail.com` must already be verified in Resend (DKIM/SPF
records on the DNS side). If you set up Resend earlier with this domain, that's
already done.

---

## Verifying Bug 1 + Bug 4 together

Required Supabase Dashboard config for the email-confirmation flow to work:

1. **Authentication → URL Configuration:**
   - **Site URL:** `https://austin-autodetail.com`
   - **Redirect URLs (allow-list):** include
     - `https://austin-autodetail.com/auth/callback`
     - `https://austin-autodetail.com/**`
     - `https://austinautodetail.vercel.app/**` (keep as fallback during transition)

2. **Email Templates → Confirm signup:** paste the Subject + HTML above.

3. **Authentication → SMTP Settings:** enable custom SMTP via Resend (above).

Then test by signing up a fresh email address. The confirmation link should
land on `/auth/callback`, exchange the code for a session, and redirect to
`/dashboard` - no white page.
