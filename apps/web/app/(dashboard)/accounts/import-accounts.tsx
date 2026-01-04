"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { importQuickBooksAccounts } from "@/actions/accounts";
import { Upload } from "lucide-react";

export function ImportAccounts() {
  const [isImporting, setIsImporting] = useState(false);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const result = await importQuickBooksAccounts(text);
      if (result.success) {
        alert(`Successfully imported ${result.count} accounts.`);
      }
    } catch (error) {
      console.error("Failed to import accounts:", error);
      alert("Failed to import accounts. Please check the file format.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Import Chart of Accounts</CardTitle>
          <CardDescription>
            It looks like you don&apos;t have any accounts yet. You can import
            your chart of accounts from QuickBooks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="csv-file">QuickBooks CSV File</Label>
            <div className="flex items-center gap-2">
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isImporting}
              />
              <Button disabled={isImporting} size="icon">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The CSV should have Full name, Account type, Account subtype, and
              Description columns.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
