"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { AccountingClass, AccountingPayee, ChartOfAccount } from "@workspace/db";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Controller } from "react-hook-form";

const entrySchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  payeeId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  debit: z.string().optional().nullable(),
  credit: z.string().optional().nullable(),
  memo: z.string().optional().nullable(),
});

const transactionSchema = z.object({
  date: z.string().min(1, "Date is required"),
  transactionType: z.enum(["journal_entry", "check", "deposit", "transfer", "expense", "invoice"]),
  description: z.string().optional().nullable(),
  entries: z.array(entrySchema).min(2, "At least 2 entries required"),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  accounts: ChartOfAccount[];
  payees: AccountingPayee[];
  classes: AccountingClass[];
  initialData?: any;
  onSuccess: () => void;
}

export function TransactionForm({
  accounts,
  payees,
  classes,
  initialData,
  onSuccess,
}: TransactionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [balance, setBalance] = useState<{ debits: number; credits: number }>({
    debits: 0,
    credits: 0,
  });

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: initialData?.date
        ? new Date(initialData.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      transactionType: initialData?.transactionType || "journal_entry",
      description: initialData?.description || "",
      entries: initialData?.entries || [
        { accountId: "", debit: "", credit: "", payeeId: null, classId: null, number: null, memo: "" },
        { accountId: "", debit: "", credit: "", payeeId: null, classId: null, number: null, memo: "" },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "entries",
  });

  // Calculate balance whenever entries change
  useEffect(() => {
    const subscription = form.watch((value) => {
      let totalDebits = 0;
      let totalCredits = 0;

      value.entries?.forEach((entry) => {
        if (entry && entry.debit) {
          totalDebits += parseFloat(entry.debit) || 0;
        }
        if (entry && entry.credit) {
          totalCredits += parseFloat(entry.credit) || 0;
        }
      });

      setBalance({ debits: totalDebits, credits: totalCredits });
    });

    return () => subscription.unsubscribe();
  }, [form.watch]);

  const isBalanced = Math.abs(balance.debits - balance.credits) < 0.01;

  const onSubmit = async (values: TransactionFormValues) => {
    if (!isBalanced) {
      alert("Transaction must be balanced: debits must equal credits");
      return;
    }

    setIsLoading(true);
    try {
      const data = {
        date: new Date(values.date),
        transactionType: values.transactionType,
        description: values.description,
        entries: values.entries.map((entry) => ({
          accountId: entry.accountId,
          payeeId: entry.payeeId || null,
          classId: entry.classId || null,
          debit: entry.debit || null,
          credit: entry.credit || null,
          memo: entry.memo || null,
        })),
      };

      if (initialData?.id) {
        await updateTransaction(initialData.id, data);
      } else {
        await createTransaction(data);
      }
      onSuccess();
    } catch (error: any) {
      alert(error.message || "Failed to save transaction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            disabled={isLoading}
            {...form.register("date")}
          />
          {form.formState.errors.date && (
            <p className="text-sm text-destructive">
              {form.formState.errors.date.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="transactionType">Type *</Label>
          <Controller
            control={form.control}
            name="transactionType"
            render={({ field }) => (
              <Select
                disabled={isLoading}
                onValueChange={field.onChange}
                value={field.value}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="journal_entry">Journal Entry</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          disabled={isLoading}
          {...form.register("description")}
          placeholder="Transaction description"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Entries</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                accountId: "",
                debit: "",
                credit: "",
                payeeId: null,
                classId: null,
                number: null,
                memo: "",
              })
            }
            disabled={isLoading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-12 gap-2 p-3 border rounded-lg"
            >
              <div className="col-span-3">
                <Label className="text-xs">Account *</Label>
                <Controller
                  control={form.control}
                  name={`entries.${index}.accountId`}
                  render={({ field }) => (
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="col-span-1">
                <Label className="text-xs">Num</Label>
                <Input
                  type="text"
                  disabled={isLoading}
                  {...form.register(`entries.${index}.number`)}
                  placeholder=""
                  className="text-xs"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Debit</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={isLoading}
                  {...form.register(`entries.${index}.debit`)}
                  placeholder="0.00"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Credit</Label>
                <Input
                  type="number"
                  step="0.01"
                  disabled={isLoading}
                  {...form.register(`entries.${index}.credit`)}
                  placeholder="0.00"
                />
              </div>

              <div className="col-span-2">
                <Label className="text-xs">Payee</Label>
                <Controller
                  control={form.control}
                  name={`entries.${index}.payeeId`}
                  render={({ field }) => (
                    <Select
                      disabled={isLoading}
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {payees.map((payee) => (
                          <SelectItem key={payee.id} value={payee.id}>
                            {payee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="col-span-1">
                <Label className="text-xs">Class</Label>
                <Controller
                  control={form.control}
                  name={`entries.${index}.classId`}
                  render={({ field }) => (
                    <Select
                      disabled={isLoading}
                      onValueChange={(value) => field.onChange(value || null)}
                      value={field.value || undefined}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="col-span-1 flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  disabled={isLoading || fields.length <= 2}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!isBalanced && (
        <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="space-y-1">
            <div className="text-sm">
              <span className="font-medium">Total Debits:</span> $
              {balance.debits.toFixed(2)}
            </div>
            <div className="text-sm">
              <span className="font-medium">Total Credits:</span> $
              {balance.credits.toFixed(2)}
            </div>
            <div className="text-sm font-medium">
              <span>Difference:</span>{" "}
              <span className="text-destructive">
                ${Math.abs(balance.debits - balance.credits).toFixed(2)}
              </span>
            </div>
          </div>
          <div className="text-destructive font-medium">✗ Not Balanced</div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading || !isBalanced}>
          {initialData ? "Update Transaction" : "Create Transaction"}
        </Button>
      </div>
    </form>
  );
}
