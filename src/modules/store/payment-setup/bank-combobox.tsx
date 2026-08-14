"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Bank } from "@/modules/server/store/payout-account/procedures";

interface BankComboboxProps {
  banks: Bank[];
  value: Bank | null;
  onChange: (bank: Bank | null) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Searchable bank picker.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY A COMBOBOX AND NOT A SELECT
 * ─────────────────────────────────────────────────────────────────────────────
 * Flutterwave returns **598** Nigerian banks. Scrolling that list to find
 * "Guaranty Trust Bank" is a chore on a desktop and close to unusable on a
 * phone. Typing three letters is not.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ITEMS ARE KEYED AND VALUED BY `id`, NEVER BY `name`
 * ─────────────────────────────────────────────────────────────────────────────
 * That bank list contains **25 duplicated names** — two entries each for
 * "FortisMobile", "TagPay", "Fidelity Mobile", "eTranzact" and others, with
 * *different* bank codes. It also contains one duplicated code (090567).
 * `id` is the only field that is actually unique.
 *
 * This matters twice over:
 *
 *  1. Radix registers items in an internal collection keyed by `value`, so two
 *     items sharing a `value` produce React's duplicate-key warning even when
 *     the outer `key` prop is unique. That was the warning on the old Select.
 *  2. Far worse, resolving the selection with `banks.find(b => b.name === value)`
 *     returns the *first* match. A vendor choosing the second "Fidelity Mobile"
 *     would silently be saved against the other one's bank code, and account
 *     verification would fail — or, much worse, succeed against the wrong bank.
 *
 * Selecting by `id` removes both problems. The duplicated names are still shown
 * as-is because they are what the bank list actually says; the code is appended
 * so a vendor faced with two identical labels can tell them apart.
 */
export function BankCombobox({
  banks,
  value,
  onChange,
  disabled,
  id,
}: BankComboboxProps) {
  const [open, setOpen] = useState(false);

  // Only ambiguous names get a code suffix — appending it to all 598 would be
  // noise for the 573 that are already unambiguous.
  const duplicatedNames = new Set(
    Object.entries(
      banks.reduce<Record<string, number>>((acc, bank) => {
        acc[bank.name] = (acc[bank.name] ?? 0) + 1;
        return acc;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );

  const label = (bank: Bank) =>
    duplicatedNames.has(bank.name) ? `${bank.name} (${bank.code})` : bank.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {value ? label(value) : "Choose your bank"}
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Matches the trigger's width so the list never overflows a phone.
          Tailwind v4 CSS-variable syntax — `w-(--var)`, not `w-[--var]` — and
          it has to beat PopoverContent's default `w-72`. */}
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
      >
        <Command
          className="bg-muted"
          // Search the label, not the id — the id is an implementation detail
          // and a vendor typing "gtb" must still match.
          filter={(itemValue, search) => {
            const bank = banks.find((b) => String(b.id) === itemValue);
            if (!bank) return 0;
            return bank.name.toLowerCase().includes(search.toLowerCase())
              ? 1
              : 0;
          }}
        >
          <CommandInput placeholder="Search banks..." />
          <CommandList>
            <CommandEmpty>No bank matches that.</CommandEmpty>
            <CommandGroup>
              {banks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={String(bank.id)}
                  onSelect={(selectedId) => {
                    const next =
                      banks.find((b) => String(b.id) === selectedId) ?? null;
                    onChange(next);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value?.id === bank.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{label(bank)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
