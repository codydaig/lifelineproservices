"use client";

import { useForm, Controller } from "react-hook-form";
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
import { ChartOfAccount, NewChartOfAccount } from "@workspace/db";
import { createChartOfAccount, updateChartOfAccount } from "@/actions/accounts";
import { useState } from "react";

const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["equity", "asset", "liability", "revenue", "expense"]),
  subType: z.enum(["bank", "cash", "fixed_asset", "other", "credit_card"]),
  description: z.string().optional().nullable(),
  parentAccountId: z.string().optional().nullable(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

interface AccountFormProps {
  initialData?: ChartOfAccount;
  accounts: ChartOfAccount[];
  onSuccess: () => void;
}

export function AccountForm({
  initialData,
  accounts,
  onSuccess,
}: AccountFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: (initialData?.type as any) || "asset",
      subType: (initialData?.subType as any) || "other",
      description: initialData?.description || "",
      parentAccountId: initialData?.parentAccountId || null,
    },
  });

  const onSubmit = async (values: AccountFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        await updateChartOfAccount(initialData.id, values);
      } else {
        await createChartOfAccount(values);
      }
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          disabled={isLoading}
          {...form.register("name")}
          placeholder="Account name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <Controller
            control={form.control}
            name="type"
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
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subType">Sub Type</Label>
          <Controller
            control={form.control}
            name="subType"
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
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="fixed_asset">Fixed Asset</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentAccountId">Parent Account</Label>
        <Controller
          control={form.control}
          name="parentAccountId"
          render={({ field }) => (
            <Select
              disabled={isLoading}
              onValueChange={(value: string) =>
                field.onChange(value === "none" ? null : value)
              }
              value={field.value || "none"}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {accounts
                  .filter((acc) => acc.id !== initialData?.id)
                  .map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          disabled={isLoading}
          {...form.register("description")}
          placeholder="Optional description"
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {initialData ? "Update Account" : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
