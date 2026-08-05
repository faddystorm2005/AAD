type ReviewRequestInput = {
  firstName: string;            // e.g. "Sarah" or "there" if missing
  vehicle: string;              // e.g. "2018 Ford F-150" or "" if vehicle_id is null
  serviceDateFormatted: string; // e.g. "Tuesday, May 5"
  nextdoorUrl: string;
  photoPermission: boolean;
};

export function renderReviewRequestEmail(input: ReviewRequestInput): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Quick favor, ${input.firstName}?`;
  const vehiclePhrase = input.vehicle ? `your ${input.vehicle}` : 'your vehicle';

  const photoPS = input.photoPermission
    ? `<p style="font-size:15px;color:#555;margin-top:24px;">P.S. Thanks for letting us share photos of ${vehiclePhrase} on our site and social. The work came out great.</p>`
    : '';

  const photoPSText = input.photoPermission
    ? `\n\nP.S. Thanks for letting us share photos of ${vehiclePhrase} on our site and social. The work came out great.`
    : '';

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
              <p style="margin:0 0 16px;">Alex here. Thanks for trusting us with ${vehiclePhrase} on ${input.serviceDateFormatted}.</p>
              <p style="margin:0 0 24px;">If we earned it, would you drop us a quick recommendation on NextDoor? It's the biggest thing that helps neighbors find us, and it takes about 30 seconds.</p>
              <p style="margin:0 0 32px;text-align:center;">
                <a href="${input.nextdoorUrl}" style="display:inline-block;background:#d4a24c;color:#0a0a0a;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:600;font-size:16px;">Recommend us on NextDoor</a>
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#555;">Not on NextDoor? Just reply to this email with your thoughts. We'd love to feature you on the site.</p>
              <p style="margin:24px 0 0;">Thanks,<br>Alex<br>Signature Mobile Detailing<br>(480) 793-3782</p>
              ${photoPS}
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

Alex here. Thanks for trusting us with ${vehiclePhrase} on ${input.serviceDateFormatted}.

If we earned it, would you drop us a quick recommendation on NextDoor? It's the biggest thing that helps neighbors find us, and it takes about 30 seconds.

Recommend us on NextDoor: ${input.nextdoorUrl}

Not on NextDoor? Just reply to this email with your thoughts. We'd love to feature you on the site.

Thanks,
Alex
Signature Mobile Detailing
(480) 793-3782${photoPSText}`;

  return { subject, html, text };
}
