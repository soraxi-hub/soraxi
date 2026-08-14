"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { cn } from "@/lib/utils";
import type { Bank } from "@/modules/server/store/payout-account/procedures";
import { useTRPC } from "@/trpc/client";

import { pageCardLg, pageGutter } from "../components/page-card.styles";
import { BankCombobox } from "./bank-combobox";
import { Badge } from "@/components/ui/badge";

const ACCOUNT_NUMBER_LENGTH = 10;

/**
 * The store's payout account.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE ACCOUNT, NOT A LIST
 * ─────────────────────────────────────────────────────────────────────────────
 * A store has exactly one payout account and saving a new one replaces it. The
 * previous screen presented a list of up to three, but payouts always used the
 * first — so "add another account" changed nothing about where money landed
 * while strongly implying it had. One account removes the gap between what this
 * page says and what actually happens.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LAYOUT
 * ─────────────────────────────────────────────────────────────────────────────
 * The page owns the horizontal gutter; the cards are flush on mobile and boxed
 * from `lg`. See `page-card.styles.ts` for why.
 */
const UpdatePayoutAccount = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [isChanging, setIsChanging] = useState(false);

  const { data: payoutAccounts, isLoading: loadingAccounts } = useQuery(
    trpc.storePayoutAccount.getStorePayoutAccounts.queryOptions(),
  );

  const account = payoutAccounts?.[0];

  return (
    <div className={cn("mx-auto w-full max-w-3xl py-6 space-y-6", pageGutter)}>
      <header>
        <h1 className="text-2xl font-bold">Payout account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One bank account, used for every payout.
        </p>
      </header>

      {loadingAccounts ? (
        <SoraxiCard className={pageCardLg}>
          <SoraxiCardContent className="space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </SoraxiCardContent>
        </SoraxiCard>
      ) : account && !isChanging ? (
        <CurrentAccount
          bankName={account.bankDetails.bankName}
          accountNumber={account.bankDetails.accountNumber}
          accountHolderName={account.bankDetails.accountHolderName}
          onChange={() => setIsChanging(true)}
        />
      ) : (
        <AccountForm
          hasExistingAccount={Boolean(account)}
          onCancel={account ? () => setIsChanging(false) : undefined}
          onSaved={() => {
            setIsChanging(false);
            queryClient.invalidateQueries({
              queryKey:
                trpc.storePayoutAccount.getStorePayoutAccounts.queryKey(),
            });
          }}
        />
      )}

      <HowPayoutsWork />
    </div>
  );
};

/* -------------------------------------------------------------------------- */

/**
 * The saved account.
 *
 * Only the last four digits are shown. The full number is of no use to the
 * vendor here — they know their own account — and masking means a shoulder
 * glance or a screen share doesn't hand it over.
 */
function CurrentAccount({
  bankName,
  accountNumber,
  accountHolderName,
  onChange,
}: {
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  onChange: () => void;
}) {
  const lastFour = accountNumber.slice(-4);

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <SoraxiCardTitle>Where your money goes</SoraxiCardTitle>
            <SoraxiCardDescription className="mt-1 text-muted-foreground">
              Payouts from your withdrawals land in this account.
            </SoraxiCardDescription>
          </div>

          <Badge className="inline-flex shrink-0 items-center gap-1 bg-soraxi-green px-2.5 py-1 text-white">
            <BadgeCheck className="size-3.5" aria-hidden />
            Verified
          </Badge>
        </div>
      </SoraxiCardHeader>

      <SoraxiCardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-soraxi-green/10">
            <Landmark className="size-5 text-soraxi-green" aria-hidden />
          </span>

          <div className="min-w-0">
            <p className="truncate font-semibold">{bankName}</p>
            <p className="font-mono text-sm text-muted-foreground">
              {/* Screen readers get the meaning, not six literal bullets. */}
              <span aria-hidden>•••• {lastFour}</span>
              <span className="sr-only">
                Account ending {lastFour.split("").join(" ")}
              </span>
            </p>
            <p className="truncate text-sm text-soraxi-green">
              {accountHolderName}
            </p>
          </div>
        </div>

        <Button variant="outline" onClick={onChange} className="w-full">
          Use a different account
        </Button>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

/**
 * Add or replace the payout account.
 *
 * The account name is never typed — it comes back from the bank once the
 * number resolves. That is the whole verification step: if the name doesn't
 * appear, the account doesn't exist, and no amount of careful typing would have
 * caught a transposed digit.
 */
function AccountForm({
  hasExistingAccount,
  onCancel,
  onSaved,
}: {
  hasExistingAccount: boolean;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const trpc = useTRPC();

  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");

  const { data: banks, isLoading: loadingBanks } = useQuery(
    trpc.storePayoutAccount.getBanks.queryOptions(),
  );

  const resolveAccount = useMutation(
    trpc.storePayoutAccount.resolveAccountNumber.mutationOptions({
      onSuccess: (data) => {
        if (data.status !== "success") {
          setAccountHolderName("");
          toast.error(data.message || "We couldn't find that account.");
          return;
        }
        setAccountHolderName(data.data.account_name);
      },
      onError: (error) => {
        setAccountHolderName("");
        toast.error(error.message || "We couldn't check that account.");
      },
    }),
  );

  const save = useMutation(
    trpc.storePayoutAccount.setPayoutAccount.mutationOptions({
      onSuccess: () => {
        toast.success("Payout account saved.");
        onSaved();
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  /**
   * Resolution needs both a bank and a full account number, and either can be
   * supplied last — so it is attempted from one place whenever both are ready.
   */
  const tryResolve = (bank: Bank | null, digits: string) => {
    if (!bank?.code || digits.length !== ACCOUNT_NUMBER_LENGTH) {
      setAccountHolderName("");
      return;
    }
    resolveAccount.mutate({ accountNumber: digits, bankCode: bank.code });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!selectedBank || !accountHolderName) return;

    save.mutate({
      payoutMethod: "Bank Transfer",
      bankDetails: {
        bankName: selectedBank.name,
        accountNumber,
        accountHolderName,
        bankCode: Number(selectedBank.code),
        bankId: selectedBank.id,
      },
    });
  };

  const canSave =
    Boolean(selectedBank) && Boolean(accountHolderName) && !save.isPending;

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <SoraxiCardTitle>
          {hasExistingAccount
            ? "Add a different account"
            : "Add your payout account"}
        </SoraxiCardTitle>
        <SoraxiCardDescription className="mt-1 text-muted-foreground">
          We check the account with your bank before saving it. Bank transfer
          only, 1–3 business days.
        </SoraxiCardDescription>
      </SoraxiCardHeader>

      <SoraxiCardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bank">
              Your bank <span className="text-soraxi-error">*</span>
            </Label>
            {/* Searchable: the list is ~600 banks long. Selection is by `id`,
                because 25 of those names are duplicated across different bank
                codes — see `bank-combobox.tsx`. */}
            <BankCombobox
              id="bank"
              banks={banks ?? []}
              value={selectedBank}
              disabled={loadingBanks}
              onChange={(bank) => {
                setSelectedBank(bank);
                tryResolve(bank, accountNumber);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-number">
              Account number <span className="text-soraxi-error">*</span>
            </Label>
            <div className="relative">
              <Input
                id="account-number"
                inputMode="numeric"
                autoComplete="off"
                placeholder="10 digits"
                maxLength={ACCOUNT_NUMBER_LENGTH}
                value={accountNumber}
                onChange={(event) => {
                  const digits = event.target.value
                    .replace(/\D/g, "")
                    .slice(0, ACCOUNT_NUMBER_LENGTH);
                  setAccountNumber(digits);
                  tryResolve(selectedBank, digits);
                }}
                className="pr-16 font-mono"
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground tabular-nums">
                {accountNumber.length}/{ACCOUNT_NUMBER_LENGTH}
              </span>
            </div>

            {/* One line that changes meaning rather than three that appear and
                disappear — the vendor is watching this spot for the name. */}
            <p
              className={cn(
                "flex items-center gap-1.5 text-sm",
                accountHolderName
                  ? "font-medium text-soraxi-green"
                  : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {resolveAccount.isPending && (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              )}
              {resolveAccount.isPending
                ? "Checking with your bank..."
                : accountHolderName
                  ? accountHolderName
                  : "The account name appears here once we verify it."}
            </p>
          </div>

          <Button
            type="submit"
            disabled={!canSave}
            className="w-full gap-2 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Save payout account
          </Button>

          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={save.isPending}
              className="w-full"
            >
              Cancel
            </Button>
          )}
        </form>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

function HowPayoutsWork() {
  const points = [
    "Request a withdrawal from your wallet.",
    "Minimum withdrawal is ₦1,000.00.",
    "Your bank may charge a transfer fee.",
    "Every payout is listed in your wallet history.",
  ];

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <SoraxiCardTitle>How payouts work</SoraxiCardTitle>
      </SoraxiCardHeader>
      <SoraxiCardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {points.map((point) => (
            <li key={point} className="flex gap-2">
              <span
                className="mt-2 size-1 shrink-0 rounded-full bg-soraxi-green"
                aria-hidden
              />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

export default UpdatePayoutAccount;
