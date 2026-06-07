import {
  renderTemplate,
  StoreApprovedEmail,
  StoreReactivatedEmail,
  StoreRejectedEmail,
  StoreSuspendedEmail,
} from "@/domain/notification";
import { EmailTextTemplates } from "@/lib/utils/email-text-templates";
import React from "react";

type StoreActionType = "approved" | "rejected" | "suspend" | "reactivate";

export async function getStoreEmailTemplates(
  action: StoreActionType,
  {
    storeName,
    storeId,
  }: {
    storeName: string;
    storeId: string;
  },
) {
  switch (action) {
    case "approved":
      return {
        subject: `Your store has been approved!`,
        text: EmailTextTemplates.generateStoreApprovedText({
          storeName,
          storeId,
        }),
        html: await renderTemplate(
          React.createElement(StoreApprovedEmail, { storeName, storeId }),
        ),
      };
    case "rejected":
      return {
        subject: `Your store application was rejected`,
        text: EmailTextTemplates.generateStoreRejectedText({ storeName }),
        html: await renderTemplate(
          React.createElement(StoreRejectedEmail, { storeName }),
        ),
      };
    case "reactivate":
      return {
        subject: `Your store has been reactivated`,
        text: EmailTextTemplates.generateStoreReactivatedText({
          storeName,
          storeId,
        }),
        html: await renderTemplate(
          React.createElement(StoreReactivatedEmail, { storeName, storeId }),
        ),
      };
    case "suspend":
      return {
        subject: `Your store has been suspended`,
        text: EmailTextTemplates.generateStoreSuspendedText({ storeName }),
        html: await renderTemplate(
          React.createElement(StoreSuspendedEmail, { storeName }),
        ),
      };

    default:
      throw new Error("Invalid store email action:" + action);
  }
}
