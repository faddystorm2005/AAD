type ReviewRequestFollowupInput = {
  firstName: string;
  vehicle: string;          // e.g. "2018 Ford F-150"
  nextdoorUrl: string;
};

export function renderReviewRequestFollowupEmail(input: ReviewRequestFollowupInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Real quick, ${input.firstName}`;
  const vehiclePhrase = input.vehicle ? `your ${input.vehicle}` : 'your vehicle';

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f7f7f7;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f7f7;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;padding:32px;">
          <tr>
            <td style="font-size:16px;line-height:1.6;color:#222;">
              <p style="margin:0 0 16px;">Hi ${input.firstName},</p>
              <p style="margin:0 0 16px;">Alex again. Hope ${vehiclePhrase} still looks sharp.</p>
              <p style="margin:0 0 24px;">No pressure, but if you have 30 seconds, a NextDoor recommendation is genuinely the single biggest thing that helps neighbors find us. We're a small operation, so every recommendation moves the needle.</p>
              <p style="margin:0 0 32px;text-align:center;">
                <a href="${input.nextdoorUrl}" style="display:inline-block;background:#d4a24c;color:#0a0a0a;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:16px;">Recommend us on NextDoor</a>
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;">Already left one? Thank you, ignore this. Or hit reply if you'd rather share your thoughts directly.</p>
              <p style="margin:24px 0 0;">Thanks,<br>Alex<br>Signature Mobile Detailing<br>(480) 793-3782</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `Hi ${input.firstName},

Alex again. Hope ${vehiclePhrase} still looks sharp.

No pressure, but if you have 30 seconds, a NextDoor recommendation is genuinely the single biggest thing that helps neighbors find us. We're a small operation, so every recommendation moves the needle.

Recommend us on NextDoor: ${input.nextdoorUrl}

Already left one? Thank you, ignore this. Or hit reply if you'd rather share your thoughts directly.

Thanks,
Alex
Signature Mobile Detailing
(480) 793-3782`;

  return { subject, html, text };
}
