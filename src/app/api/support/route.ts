import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import { sendMail, wrapWithBrandedTemplate } from "@/services/mail.service";

const ticketId = `TKT-${Date.now()}`;

export async function POST(req: Request) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const adminHtmlBody = `
  <div>
    <h2 style="color:#14a800; margin-bottom:20px;">New Support Form Submission</h2>
    <div style="margin-bottom:10px;">
      <strong style="color:#333;">Name:</strong> ${name}
    </div>
    <div style="margin-bottom:10px;">
      <strong style="color:#333;">Email:</strong> ${email}
    </div>
    <div style="margin-bottom:10px;">
      <strong style="color:#333;">Subject:</strong> ${subject}
    </div>
    <div style="margin-bottom:20px;">
      <strong style="color:#333;">Message:</strong>
      <div style="background:#f9f9f9; border:1px solid #ddd; padding:12px; margin-top:6px; border-radius:6px; line-height:1.5;">
        ${message}
      </div>
    </div>
    <div style="font-size:12px; color:#777; margin-top:30px; text-align:center;">
      This message was submitted through the contact form on ${siteConfig.name}.
    </div>
  </div>
`;

  const userHtmlBody = `
  <div>
    <p style="margin-bottom:15px;">Thank you for reaching out to our support team (<strong>${process.env.SORAXI_SUPPORT_EMAIL}</strong>).</p>
    <p style="margin-bottom:15px;">Hi <strong>${name}</strong>,</p>
    <p style="margin-bottom:20px;">We have received your message and will get back to you as soon as possible. Here is a copy of your message for your reference:</p>

    <div style="margin-bottom:10px;">
      <strong style="color:#333;">Name:</strong> ${name}
    </div>
    <div style="margin-bottom:10px;">
      <strong style="color:#333;">Email:</strong> ${email}
    </div>
    <div style="margin-bottom:10px;">
      <strong style="color:#333;">Subject:</strong> ${subject}
    </div>
    <div style="margin-bottom:20px;">
      <strong style="color:#333;">Message:</strong>
      <div style="background:#f9f9f9; border:1px solid #ddd; padding:12px; margin-top:6px; border-radius:6px; line-height:1.5;">
        ${message}
      </div>
    </div>

    <div style="font-size:12px; color:#777; margin-top:30px; text-align:center;">
      This is an automated confirmation from <a href="${siteConfig.url}" style="color:#14a800; text-decoration:none;">${siteConfig.url}</a>. Please do not reply to this email.
    </div>
  </div>
`;

  try {
    // send email to support team
    await sendMail({
      email: process.env.SORAXI_SUPPORT_EMAIL!,
      emailType: "supportNotification",
      fromAddress: "support@soraxihub.com",
      subject: `[Support Form] New message from ${name} (Ticket: ${ticketId})`,
      html: wrapWithBrandedTemplate({
        title: `New Support Request from ${name}`,
        bodyContent: adminHtmlBody,
      }),
    });

    // send email to user for reference
    await sendMail({
      email,
      emailType: "noreply",
      fromAddress: "noreply@soraxihub.com",
      subject: `We’ve received your support request (Ticket: ${ticketId}) – ${siteConfig.name}`,
      html: wrapWithBrandedTemplate({
        title: `We’ve received your message – ${siteConfig.name} Support`,
        bodyContent: userHtmlBody,
      }),
    });

    return NextResponse.json({ success: true, ticketId });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}
