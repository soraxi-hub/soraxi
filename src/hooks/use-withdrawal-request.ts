import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { formatNaira } from "@/lib/utils/naira";
import { WITHDRAWAL_LIMITS } from "@/constants/financial.constants";
import { calculateWithdrawalFees } from "@/lib/utils/withdrawal.utils";
import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

/**
 * Withdrawal request form state.
 */
export interface WithdrawalForm {
  amount: string;
  accountId: string;
  storePassword: string;
}

/**
 * Bank account returned from payout account query.
 */
type Output = inferProcedureOutput<
  AppRouter["payment"]["getStorePayoutAccounts"]
>;

export type BankAccount = Output[number];

interface UseWithdrawalRequestParams {
  availableBalance: number;
  onWithdrawalSuccessAction: () => void;
  onCloseAction: () => void;
}

/**
 * Encapsulates all withdrawal business logic.
 *
 * Responsibilities:
 * - Fetch payout accounts
 * - Manage form state
 * - Validate withdrawal requests
 * - Calculate fees
 * - Submit withdrawal requests
 * - Manage confirmation modal state
 */
export function useWithdrawalRequest({
  availableBalance,
  onWithdrawalSuccessAction,
  onCloseAction,
}: UseWithdrawalRequestParams) {
  const trpc = useTRPC();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<BankAccount | null>(
    null,
  );

  const [form, setForm] = useState<WithdrawalForm>({
    amount: "",
    accountId: "",
    storePassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [errors, setErrors] = useState<
    Partial<Record<keyof WithdrawalForm, string>>
  >({});

  const { data: payoutAccounts, isLoading: isLoadingAccounts } = useQuery(
    trpc.payment.getStorePayoutAccounts.queryOptions(),
  );

  const createWithdrawalRequest = useMutation(
    trpc.withdrawal.createWithdrawalRequest.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);

        onWithdrawalSuccessAction();
        onCloseAction();
      },

      onError: (error) => {
        toast.error(
          error instanceof Error ? error.message : "An unknown error occurred",
        );
      },
    }),
  );

  useEffect(() => {
    if (!payoutAccounts?.length) return;

    setBankAccounts(payoutAccounts);

    setSelectedAccount(payoutAccounts[0]);

    setForm((prev) => ({
      ...prev,
      accountId: payoutAccounts[0].id,
    }));
  }, [payoutAccounts]);

  /**
   * Current amount converted to kobo.
   */
  const amountInKobo = useMemo(
    () => Math.round(Number.parseFloat(form.amount || "0") * 100),
    [form.amount],
  );

  /**
   * Fee breakdown for current amount.
   */
  const fees = useMemo(
    () => (amountInKobo > 0 ? calculateWithdrawalFees(amountInKobo) : null),
    [amountInKobo],
  );

  /**
   * Validates withdrawal form.
   */
  const validateForm = () => {
    const newErrors: Partial<Record<keyof WithdrawalForm, string>> = {};

    if (!form.amount || Number.parseFloat(form.amount) <= 0) {
      newErrors.amount = "Amount is required";
    } else if (amountInKobo < WITHDRAWAL_LIMITS.MINIMUM_WITHDRAWAL) {
      newErrors.amount = `Minimum withdrawal is ${formatNaira(
        WITHDRAWAL_LIMITS.MINIMUM_WITHDRAWAL,
        {
          showDecimals: true,
        },
      )}`;
    } else if (amountInKobo > WITHDRAWAL_LIMITS.MAXIMUM_WITHDRAWAL) {
      newErrors.amount = `Maximum withdrawal is ${formatNaira(
        WITHDRAWAL_LIMITS.MAXIMUM_WITHDRAWAL,
        {
          showDecimals: true,
        },
      )}`;
    } else if (amountInKobo > availableBalance) {
      newErrors.amount = "Amount exceeds available balance";
    }

    if (!form.accountId) {
      newErrors.accountId = "Please select a bank account";
    }

    if (!form.storePassword.trim()) {
      newErrors.storePassword = "Store password is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /**
   * Opens confirmation modal after validation.
   */
  const submitForm = () => {
    if (validateForm()) {
      setShowConfirmation(true);
    }
  };

  /**
   * Executes withdrawal request.
   */
  const processWithdrawal = async () => {
    try {
      setLoading(true);

      await createWithdrawalRequest.mutateAsync({
        amount: amountInKobo,
        accountId: form.accountId,
        storePassword: form.storePassword,
      });

      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    setForm,

    errors,

    loading,
    showConfirmation,
    setShowConfirmation,

    bankAccounts,
    selectedAccount,
    setSelectedAccount,

    isLoadingAccounts,

    amountInKobo,
    fees,

    submitForm,
    processWithdrawal,
  };
}
