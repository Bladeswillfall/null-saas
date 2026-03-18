import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import {
  creatorAgreements,
  creators,
  ips,
  organizationMembers,
  payoutLedgerEntries,
  payoutPeriods,
  subsidiaries
} from '@null/db';
import type { TRPCContext } from './context';

type OrganizationRole = 'owner' | 'admin' | 'member';
type AuthorizedContext = Pick<TRPCContext, 'db' | 'user'>;

function requireUserId(ctx: AuthorizedContext): string {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to perform this action.'
    });
  }

  return ctx.user.id;
}

export async function getOrganizationRole(
  ctx: AuthorizedContext,
  organizationId: string
): Promise<OrganizationRole | null> {
  const userId = requireUserId(ctx);
  const [membership] = await ctx.db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)))
    .limit(1);

  return membership?.role ?? null;
}

export async function requireOrganizationMember(
  ctx: AuthorizedContext,
  organizationId: string
): Promise<OrganizationRole> {
  const role = await getOrganizationRole(ctx, organizationId);
  if (!role) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization.'
    });
  }

  return role;
}

export async function requireOrganizationAdmin(
  ctx: AuthorizedContext,
  organizationId: string
): Promise<Exclude<OrganizationRole, 'member'>> {
  const role = await requireOrganizationMember(ctx, organizationId);
  if (role === 'member') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to modify this organization.'
    });
  }

  return role;
}

async function requireOrgIdFromTable<T extends string>(
  organizationId: T | undefined,
  entityLabel: string
): Promise<T> {
  if (!organizationId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: `${entityLabel} not found.`
    });
  }

  return organizationId;
}

export async function requireCreatorOrganizationId(ctx: AuthorizedContext, creatorId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: creators.organizationId })
    .from(creators)
    .where(eq(creators.id, creatorId))
    .limit(1);

  return requireOrgIdFromTable(row?.organizationId, 'Creator');
}

export async function requireAgreementOrganizationId(ctx: AuthorizedContext, agreementId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: creatorAgreements.organizationId })
    .from(creatorAgreements)
    .where(eq(creatorAgreements.id, agreementId))
    .limit(1);

  return requireOrgIdFromTable(row?.organizationId, 'Agreement');
}

export async function requireSubsidiaryOrganizationId(ctx: AuthorizedContext, subsidiaryId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: subsidiaries.organizationId })
    .from(subsidiaries)
    .where(eq(subsidiaries.id, subsidiaryId))
    .limit(1);

  return requireOrgIdFromTable(row?.organizationId, 'Subsidiary');
}

export async function requireIpOrganizationId(ctx: AuthorizedContext, ipId: string): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: ips.organizationId })
    .from(ips)
    .where(eq(ips.id, ipId))
    .limit(1);

  return requireOrgIdFromTable(row?.organizationId, 'IP');
}

export async function requirePayoutPeriodOrganizationId(
  ctx: AuthorizedContext,
  payoutPeriodId: string
): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: payoutPeriods.organizationId })
    .from(payoutPeriods)
    .where(eq(payoutPeriods.id, payoutPeriodId))
    .limit(1);

  return requireOrgIdFromTable(row?.organizationId, 'Payout period');
}

export async function requireLedgerEntryOrganizationId(
  ctx: AuthorizedContext,
  ledgerEntryId: string
): Promise<string> {
  const [row] = await ctx.db
    .select({ organizationId: payoutPeriods.organizationId })
    .from(payoutLedgerEntries)
    .innerJoin(payoutPeriods, eq(payoutLedgerEntries.payoutPeriodId, payoutPeriods.id))
    .where(eq(payoutLedgerEntries.id, ledgerEntryId))
    .limit(1);

  return requireOrgIdFromTable(row?.organizationId, 'Ledger entry');
}

export function assertSameOrganization(
  expectedOrganizationId: string,
  actualOrganizationId: string,
  entityLabel: string
) {
  if (expectedOrganizationId !== actualOrganizationId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `${entityLabel} does not belong to the provided organization.`
    });
  }
}
