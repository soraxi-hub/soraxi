import { Metadata } from "next";
import { redirect } from "next/navigation";
import { VendorWaitlistWizard } from "@/modules/store/waitlist";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { getUserById } from "@/lib/db/models/user.model";
import type { WaitlistApplicantDefaults } from "@/types/waitlist-wizard.types";

export const metadata: Metadata = {
  title: "Vendor Waitlist",
  description:
    "Apply to become a vendor on Soraxi. Share your business details, product samples, and proof of business to join our curated waitlist.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default async function VendorWaitlistPage() {
  const tokenUser = await getUserFromCookie();

  if (!tokenUser) {
    redirect(`/sign-in?redirect=${encodeURIComponent("/store/waitlist")}`);
  }

  const account = await getUserById(tokenUser.id, true);

  const applicantDefaults: WaitlistApplicantDefaults = {
    ownerName: account
      ? `${account.firstName ?? ""} ${account.lastName ?? ""}`.trim()
      : `${tokenUser.firstName ?? ""} ${tokenUser.lastName ?? ""}`.trim(),
    email: account?.email ?? tokenUser.email ?? "",
    phone: account?.phoneNumber ?? "",
    // Optional on the account — vendors who never set it pick one in the form.
    institution: account?.institution ?? "",
  };

  return <VendorWaitlistWizard applicantDefaults={applicantDefaults} />;
}
