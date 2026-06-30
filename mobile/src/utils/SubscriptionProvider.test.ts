import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SUBSCRIPTION_PLANS } from "./subscriptionPlans";

describe("subscription plan catalog", () => {
  it("matches the test subscription tiers used by family gating", () => {
    assert.deepEqual(
      SUBSCRIPTION_PLANS.map((plan) => ({ id: plan.id, price: plan.price, memberLimit: plan.memberLimit, family: plan.family })),
      [
        { id: "INDIVIDUAL", price: 5, memberLimit: 1, family: false },
        { id: "FAMILY_3", price: 10, memberLimit: 4, family: true },
        { id: "FAMILY_6", price: 15, memberLimit: 7, family: true }
      ]
    );
  });
});
