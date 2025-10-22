import { NextResponse } from "next/server";
import { siteConfig } from "@/config/site";
import {
  AdminNotificationEmail,
  NotificationFactory,
  renderTemplate,
  SupportContactEmail,
} from "@/domain/notification";
import React from "react";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";

const ticketId = `TKT-${Date.now()}`;

export async function POST(req: Request) {
  const { name, email, subject, message } = await req.json();

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  try {
    if (!process.env.SORAXI_SUPPORT_EMAIL) {
      console.error("Missing required environment variables");
      throw new Error(
        "Server configuration error: Missing required SORAXI EMAIL CONFIG environment variables"
      );
    }

    // 1. Send admin notification using AdminNotificationEmail template
    const adminHtml = await renderTemplate(
      React.createElement(AdminNotificationEmail, {
        title: "New Support Request",
        content: `A new support request has been submitted through the contact form. Please review the details below and respond to the user.`,
        details: {
          "Ticket ID": ticketId,
          "Customer Name": name,
          "Customer Email": email,
          Subject: subject,
          "Submission Date": new Date().toLocaleDateString(),
          Priority: "Normal",
        },
        actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/admin/support/${ticketId}`,
        actionLabel: "View Support Ticket",
      })
    );

    const adminText = EmailTextTemplates.generateAdminSupportNotificationText({
      ticketId,
      customerName: name,
      customerEmail: email,
      subject: subject,
      message: message,
    });

    const adminNotification = NotificationFactory.create("email", {
      recipient: process.env.SORAXI_SUPPORT_EMAIL,
      subject: `[Support] New message from ${name} (Ticket: ${ticketId})`,
      emailType: "supportNotification",
      fromAddress: "support@soraxihub.com",
      html: adminHtml,
      text: adminText,
      metadata: {
        ticketId,
        customerName: name,
        customerEmail: email,
        notificationType: "support_request",
      },
    });

    await adminNotification.send();

    // 2. Send confirmation email to user using SupportContactEmail template
    const userHtml = await renderTemplate(
      React.createElement(SupportContactEmail, {
        userName: name,
        userEmail: email,
        subject: subject,
        message: message,
        ticketId: ticketId,
      })
    );

    const userText = EmailTextTemplates.generateUserSupportConfirmationText({
      customerName: name,
      customerEmail: email,
      subject: subject,
      message: message,
      ticketId: ticketId,
      supportEmail: process.env.SORAXI_SUPPORT_EMAIL!,
      siteName: siteConfig.name,
    });
    const userNotification = NotificationFactory.create("email", {
      recipient: email,
      subject: `We've received your support request (Ticket: ${ticketId}) – ${siteConfig.name}`,
      emailType: "supportConfirmation",
      fromAddress: "noreply@soraxihub.com",
      html: userHtml,
      text: userText,
      metadata: {
        ticketId,
        customerName: name,
        customerEmail: email,
        notificationType: "support_confirmation",
      },
    });

    await userNotification.send();

    return NextResponse.json({
      success: true,
      ticketId,
      message: "Support request submitted successfully",
    });
  } catch (err: any) {
    console.error("Support form submission error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit support request" },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import { siteConfig } from "@/config/site";
// import { sendMail, wrapWithBrandedTemplate } from "@/services/mail.service";

// const ticketId = `TKT-${Date.now()}`;

// export async function POST(req: Request) {
//   const { name, email, subject, message } = await req.json();

//   if (!name || !email || !subject || !message) {
//     return NextResponse.json({ error: "Missing fields" }, { status: 400 });
//   }

//   const adminHtmlBody = `
//   <div>
//     <h2 style="color:#14a800; margin-bottom:20px;">New Support Form Submission</h2>
//     <div style="margin-bottom:10px;">
//       <strong style="color:#333;">Name:</strong> ${name}
//     </div>
//     <div style="margin-bottom:10px;">
//       <strong style="color:#333;">Email:</strong> ${email}
//     </div>
//     <div style="margin-bottom:10px;">
//       <strong style="color:#333;">Subject:</strong> ${subject}
//     </div>
//     <div style="margin-bottom:20px;">
//       <strong style="color:#333;">Message:</strong>
//       <div style="background:#f9f9f9; border:1px solid #ddd; padding:12px; margin-top:6px; border-radius:6px; line-height:1.5;">
//         ${message}
//       </div>
//     </div>
//     <div style="font-size:12px; color:#777; margin-top:30px; text-align:center;">
//       This message was submitted through the contact form on ${siteConfig.name}.
//     </div>
//   </div>
// `;

//   const userHtmlBody = `
//   <div>
//     <p style="margin-bottom:15px;">Thank you for reaching out to our support team (<strong>${process.env.SORAXI_SUPPORT_EMAIL}</strong>).</p>
//     <p style="margin-bottom:15px;">Hi <strong>${name}</strong>,</p>
//     <p style="margin-bottom:20px;">We have received your message and will get back to you as soon as possible. Here is a copy of your message for your reference:</p>

//     <div style="margin-bottom:10px;">
//       <strong style="color:#333;">Name:</strong> ${name}
//     </div>
//     <div style="margin-bottom:10px;">
//       <strong style="color:#333;">Email:</strong> ${email}
//     </div>
//     <div style="margin-bottom:10px;">
//       <strong style="color:#333;">Subject:</strong> ${subject}
//     </div>
//     <div style="margin-bottom:20px;">
//       <strong style="color:#333;">Message:</strong>
//       <div style="background:#f9f9f9; border:1px solid #ddd; padding:12px; margin-top:6px; border-radius:6px; line-height:1.5;">
//         ${message}
//       </div>
//     </div>

//     <div style="font-size:12px; color:#777; margin-top:30px; text-align:center;">
//       This is an automated confirmation from <a href="${siteConfig.url}" style="color:#14a800; text-decoration:none;">${siteConfig.url}</a>. Please do not reply to this email.
//     </div>
//   </div>
// `;

//   try {
//     if (!process.env.SORAXI_SUPPORT_EMAIL) {
//       console.error("Missing required environment variables");
//       throw new Error(
//         "Server configuration error: Missing required SORAXI EMAIL CONFIG environment variables"
//       );
//     }
//     // send email to support team
//     await sendMail({
//       email: process.env.SORAXI_SUPPORT_EMAIL,
//       emailType: "supportNotification",
//       fromAddress: "support@soraxihub.com",
//       subject: `[Support Form] New message from ${name} (Ticket: ${ticketId})`,
//       html: wrapWithBrandedTemplate({
//         title: `New Support Request from ${name}`,
//         bodyContent: adminHtmlBody,
//       }),
//     });

//     // send email to user for reference
//     await sendMail({
//       email,
//       emailType: "noreply",
//       fromAddress: "noreply@soraxihub.com",
//       subject: `We’ve received your support request (Ticket: ${ticketId}) – ${siteConfig.name}`,
//       html: wrapWithBrandedTemplate({
//         title: `We’ve received your message – ${siteConfig.name} Support`,
//         bodyContent: userHtmlBody,
//       }),
//     });

//     return NextResponse.json({ success: true, ticketId });
//   } catch (err: any) {
//     console.error(err);
//     return NextResponse.json(
//       { error: err.message || "Failed to send emails" },
//       { status: 500 }
//     );
//   }
// }
