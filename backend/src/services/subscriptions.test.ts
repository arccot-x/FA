import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SubscriptionPlan } from "@prisma/client";
import { planDetails, publicSubscription } from "./subscriptions";

describe("subscription plans", () => {
  it("keeps family plan limits aligned with pricing", () => {
    assert.deepEqual(planDetails[SubscriptionPlan.INDIVIDUAL], { price: 5, memberLimit: 1, family: false });
    assert.deepEqual(planDetails[SubscriptionPlan.FAMILY_3], { price: 10, memberLimit: 4, family: true });
    assert.deepEqual(planDetails[SubscriptionPlan.FAMILY_6], { price: 15, memberLimit: 7, family: true });
  });

  it("publishes public subscription details without changing the saved state", () => {
    const updatedAt = new Date("2026-06-30T00:00:00.000Z");
    const result = publicSubscription({
      plan: SubscriptionPlan.FAMILY_3,
      active: true,
      billingName: null,
      billingEmail: null,
      cardLast4: null,
      updatedAt
    });

    assert.equal(result.plan, SubscriptionPlan.FAMILY_3);
    assert.equal(result.active, true);
    assert.equal(result.price, 10);
    assert.equal(result.memberLimit, 4);
    assert.equal(result.family, true);
    assert.equal(result.updatedAt, updatedAt);
  });
});
