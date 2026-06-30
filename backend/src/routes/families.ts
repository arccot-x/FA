import { BillStatus, FamilyRole, MemberStatus, TransactionScope } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getFamilyAccess, requireFamilyAccess } from "../services/subscriptions";
import { asyncHandler } from "../utils/asyncHandler";
import { getAuthUserId } from "../utils/requireUserAccess";
import { monthStart, parseMonth } from "../utils/month";

export const familiesRouter = Router();

async function activeMembership(userId: string) {
  return prisma.familyMember.findFirst({
    where: { userId, status: MemberStatus.ACTIVE },
    include: { family: true }
  });
}

async function enrichMembers(members: { userId: string; role: FamilyRole; status: MemberStatus }[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: members.map((m) => m.userId) } },
    select: { id: true, name: true, email: true }
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return members.map((m) => ({
    userId: m.userId,
    role: m.role,
    status: m.status,
    name: byId.get(m.userId)?.name ?? "Member",
    email: byId.get(m.userId)?.email ?? ""
  }));
}

// Create a family (caller becomes owner + active member).
familiesRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const { name } = z.object({ name: z.string().min(1).max(60) }).parse(req.body);

    if (await activeMembership(userId)) {
      throw new Error("You are already in a family.");
    }
    await requireFamilyAccess(userId);

    const family = await prisma.family.create({
      data: {
        name,
        ownerId: userId,
        members: { create: { userId, role: FamilyRole.OWNER, status: MemberStatus.ACTIVE } }
      },
      include: { members: true }
    });

    res.status(201).json({ family: { id: family.id, name: family.name, ownerId: family.ownerId, members: await enrichMembers(family.members) } });
  })
);

// My family + my pending invites.
familiesRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const membership = await activeMembership(userId);

    const invites = await prisma.familyMember.findMany({
      where: { userId, status: MemberStatus.PENDING },
      include: { family: true }
    });

    let family = null;
    if (membership) {
      const members = await prisma.familyMember.findMany({ where: { familyId: membership.familyId } });
      family = {
        id: membership.family.id,
        name: membership.family.name,
        ownerId: membership.family.ownerId,
        role: membership.role,
        members: await enrichMembers(members),
        subscription: await getFamilyAccess(membership.family.ownerId)
      };
    }

    res.json({
      family,
      invites: invites.map((i) => ({ memberId: i.id, familyId: i.familyId, familyName: i.family.name }))
    });
  })
);

// Owner invites a user by their account id.
familiesRouter.post(
  "/:familyId/invite",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const { userId: inviteeId } = z.object({ userId: z.string().min(1) }).parse(req.body);
    const family = await prisma.family.findUniqueOrThrow({ where: { id: req.params.familyId } });

    if (family.ownerId !== userId) {
      throw new Error("Only the family owner can invite members.");
    }
    const access = await requireFamilyAccess(family.ownerId);
    if (inviteeId === userId) {
      throw new Error("You are already in this family.");
    }

    const invitee = await prisma.user.findUnique({ where: { id: inviteeId } });
    if (!invitee) {
      throw new Error("No account found with that ID.");
    }

    const existing = await prisma.familyMember.findUnique({
      where: { familyId_userId: { familyId: family.id, userId: inviteeId } }
    });
    if (existing) {
      throw new Error(existing.status === MemberStatus.ACTIVE ? "That person is already a member." : "That person is already invited.");
    }

    const members = await prisma.familyMember.count({ where: { familyId: family.id } });
    if (members >= access.memberLimit) {
      throw new Error("Your subscription limit has been reached.");
    }

    await prisma.familyMember.create({ data: { familyId: family.id, userId: inviteeId, role: FamilyRole.MEMBER, status: MemberStatus.PENDING } });
    res.status(201).json({ ok: true });
  })
);

// Accept an invite.
familiesRouter.post(
  "/invites/:memberId/accept",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const member = await prisma.familyMember.findUniqueOrThrow({ where: { id: req.params.memberId } });
    if (member.userId !== userId || member.status !== MemberStatus.PENDING) {
      throw new Error("Invite not found.");
    }
    if (await activeMembership(userId)) {
      throw new Error("Leave your current family before joining another.");
    }
    const family = await prisma.family.findUniqueOrThrow({ where: { id: member.familyId } });
    const access = await requireFamilyAccess(family.ownerId);
    const members = await prisma.familyMember.count({ where: { familyId: family.id, status: MemberStatus.ACTIVE } });
    if (members >= access.memberLimit) {
      throw new Error("This family subscription is full.");
    }
    await prisma.familyMember.update({ where: { id: member.id }, data: { status: MemberStatus.ACTIVE } });
    res.json({ ok: true });
  })
);

// Decline an invite (deletes the pending membership).
familiesRouter.post(
  "/invites/:memberId/decline",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const member = await prisma.familyMember.findUniqueOrThrow({ where: { id: req.params.memberId } });
    if (member.userId !== userId || member.status !== MemberStatus.PENDING) {
      throw new Error("Invite not found.");
    }
    await prisma.familyMember.delete({ where: { id: member.id } });
    res.status(204).send();
  })
);

// Leave a family, or (owner) remove a member by their user id.
familiesRouter.delete(
  "/:familyId/members/:memberUserId",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const family = await prisma.family.findUniqueOrThrow({ where: { id: req.params.familyId } });
    const target = req.params.memberUserId;

    const isOwner = family.ownerId === userId;
    if (!isOwner && target !== userId) {
      throw new Error("You can only remove yourself.");
    }
    if (target === family.ownerId) {
      throw new Error("The owner cannot leave. Delete the family instead.");
    }

    await prisma.familyMember.deleteMany({ where: { familyId: family.id, userId: target } });
    res.status(204).send();
  })
);

// Owner deletes the whole family.
familiesRouter.delete(
  "/:familyId",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const family = await prisma.family.findUniqueOrThrow({ where: { id: req.params.familyId } });
    if (family.ownerId !== userId) {
      throw new Error("Only the owner can delete the family.");
    }
    await prisma.family.delete({ where: { id: family.id } });
    res.status(204).send();
  })
);

// Shared "house" money for the caller's family in a given month.
familiesRouter.get(
  "/house",
  asyncHandler(async (req, res) => {
    const userId = getAuthUserId(req);
    const membership = await activeMembership(userId);
    if (!membership) {
      res.json({ pool: 0, spent: 0, balance: 0, transactions: [] });
      return;
    }
    const access = await getFamilyAccess(membership.family.ownerId);
    if (!access.allowed) {
      res.json({ pool: 0, spent: 0, billsDue: 0, balance: 0, transactions: [], locked: true, lockedReason: access.reason });
      return;
    }

    const members = await prisma.familyMember.findMany({ where: { familyId: membership.familyId, status: MemberStatus.ACTIVE } });
    const memberIds = members.map((m) => m.userId);
    const cycleMonth = parseMonth(String(req.query.month ?? ""));
    const start = monthStart(cycleMonth);
    const end = monthStart(new Date(Date.UTC(cycleMonth.getUTCFullYear(), cycleMonth.getUTCMonth() + 1, 1)));

    const [cycles, transactions, houseBills, users] = await Promise.all([
      prisma.incomeCycle.findMany({ where: { userId: { in: memberIds }, cycleMonth } }),
      prisma.transaction.findMany({
        where: { familyId: membership.familyId, scope: TransactionScope.HOUSE, occurredAt: { gte: start, lt: end } },
        include: { attachments: true },
        orderBy: { occurredAt: "desc" },
        take: 100
      }),
      prisma.billOccurrence.findMany({
        where: { userId: { in: memberIds }, cycleMonth, billTemplate: { scope: TransactionScope.HOUSE, familyId: membership.familyId } }
      }),
      prisma.user.findMany({ where: { id: { in: memberIds } }, select: { id: true, name: true } })
    ]);

    const nameById = new Map(users.map((u) => [u.id, u.name]));
    const pool = cycles.reduce((sum, c) => sum + Number(c.houseAllocation ?? 0), 0);
    const txnSpent = transactions.reduce((sum, txn) => sum + Number(txn.amount ?? 0), 0);
    const paidBills = houseBills.filter((b) => b.status === BillStatus.PAID).reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
    const billsDue = houseBills.filter((b) => b.status === BillStatus.UNPAID).reduce((sum, b) => sum + Number(b.amount ?? 0), 0);
    const spent = txnSpent + paidBills;

    res.json({
      pool,
      spent,
      billsDue,
      balance: pool - spent,
      transactions: transactions.map((txn) => ({ ...txn, spenderName: nameById.get(txn.userId) ?? "Member" }))
    });
  })
);
