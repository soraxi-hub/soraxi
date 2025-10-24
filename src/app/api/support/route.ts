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
import { generateUniqueId } from "@/lib/utils";

export async function POST(req: Request) {
  const { name, email, subject, message } = await req.json();
  const ticketId = `TKT-${generateUniqueId(12)}`;

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
      // metadata: {
      //   ticketId,
      //   customerName: name,
      //   customerEmail: email,
      //   notificationType: "support_request",
      // },
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
      emailType: "noreply",
      fromAddress: "noreply@soraxihub.com",
      html: userHtml,
      text: userText,
      // metadata: {
      //   ticketId,
      //   customerName: name,
      //   customerEmail: email,
      //   notificationType: "support_confirmation",
      // },
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
