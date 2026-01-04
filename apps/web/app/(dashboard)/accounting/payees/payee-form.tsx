"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { AccountingPayee } from "@workspace/db";
import { createAccountingPayee, updateAccountingPayee } from "@/actions/payees";
import { useState } from "react";

const payeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address1: z.string().optional().nullable(),
  address2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  isW9vendor: z.boolean().default(false),
  w9Attachment: z.string().optional().nullable(),
});

type PayeeFormValues = z.infer<typeof payeeSchema>;

interface PayeeFormProps {
  initialData?: AccountingPayee;
  onSuccess: () => void;
}

export function PayeeForm({ initialData, onSuccess }: PayeeFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PayeeFormValues>({
    resolver: zodResolver(payeeSchema),
    defaultValues: {
      name: initialData?.name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      address1: initialData?.address1 || "",
      address2: initialData?.address2 || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zip: initialData?.zip || "",
      isW9vendor: initialData?.isW9vendor || false,
      w9Attachment: initialData?.w9Attachment || "",
    },
  });

  const onSubmit = async (values: PayeeFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        await updateAccountingPayee(initialData.id, values);
      } else {
        await createAccountingPayee(values);
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
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          disabled={isLoading}
          {...form.register("name")}
          placeholder="Payee name"
        />
        {form.formState.errors.name && (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            disabled={isLoading}
            {...form.register("email")}
            placeholder="email@example.com"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            disabled={isLoading}
            {...form.register("phone")}
            placeholder="(555) 555-5555"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address1">Address Line 1</Label>
        <Input
          id="address1"
          disabled={isLoading}
          {...form.register("address1")}
          placeholder="Street address"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address2">Address Line 2</Label>
        <Input
          id="address2"
          disabled={isLoading}
          {...form.register("address2")}
          placeholder="Apt, suite, etc. (optional)"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            disabled={isLoading}
            {...form.register("city")}
            placeholder="City"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            disabled={isLoading}
            {...form.register("state")}
            placeholder="ST"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="zip">Zip</Label>
          <Input
            id="zip"
            disabled={isLoading}
            {...form.register("zip")}
            placeholder="12345"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isW9vendor"
          disabled={isLoading}
          checked={form.watch("isW9vendor")}
          onCheckedChange={(checked) =>
            form.setValue("isW9vendor", checked as boolean)
          }
        />
        <Label htmlFor="isW9vendor" className="cursor-pointer">
          W9 Vendor
        </Label>
      </div>

      {form.watch("isW9vendor") && (
        <div className="space-y-2">
          <Label htmlFor="w9Attachment">W9 Attachment Reference</Label>
          <Input
            id="w9Attachment"
            disabled={isLoading}
            {...form.register("w9Attachment")}
            placeholder="File reference or note"
          />
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isLoading}>
          {initialData ? "Update Payee" : "Create Payee"}
        </Button>
      </div>
    </form>
  );
}
