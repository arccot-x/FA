import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mergeReceiptScan, shouldAutoScanReceipt } from "./receiptScan";
import type { Transaction } from "../types";

const pending: Transaction = {
  id: "tx-1",
  status: "PENDING_DETAILS",
  source: "SNAP_SAVE",
  occurredAt: "2026-06-30T00:00:00.000Z",
  attachments: []
};

describe("receipt scanning", () => {
  it("auto-scans only unscanned pending receipts when AI is enabled", () => {
    assert.equal(shouldAutoScanReceipt({ aiEnabled: true, transaction: pending, receiptUri: "file://receipt.jpg", userId: "user-1" }), true);
    assert.equal(shouldAutoScanReceipt({ aiEnabled: false, transaction: pending, receiptUri: "file://receipt.jpg", userId: "user-1" }), false);
    assert.equal(shouldAutoScanReceipt({ aiEnabled: true, transaction: { ...pending, aiScannedAt: "2026-06-30T10:00:00.000Z" }, receiptUri: "file://receipt.jpg", userId: "user-1" }), false);
    assert.equal(shouldAutoScanReceipt({ aiEnabled: true, transaction: { ...pending, status: "CLEARED" }, receiptUri: "file://receipt.jpg", userId: "user-1" }), false);
  });

  it("fills empty receipt fields without clobbering user edits", () => {
    assert.deepEqual(
      mergeReceiptScan(
        { amount: "", merchant: "", category: "GROCERIES", notes: "" },
        { amount: 12.5, merchant: "Bakery", category: "DINING", items: "Croissant" }
      ),
      { amount: 12.5, merchant: "Bakery", category: "DINING", notes: "Croissant" }
    );

    assert.deepEqual(
      mergeReceiptScan(
        { amount: "9", merchant: "Manual", category: "GROCERIES", notes: "Typed" },
        { amount: 12.5, merchant: "Bakery", category: "DINING", items: "Croissant" }
      ),
      { amount: 9, merchant: "Manual", category: "DINING", notes: "Typed" }
    );
  });
});
