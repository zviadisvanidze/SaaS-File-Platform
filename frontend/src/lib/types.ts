export enum Role {
  ADMIN = 'admin',
  EMPLOYEE = 'employee',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
}

export enum Industry {
  FINANCE = 'finance',
  ECOMMERCE = 'ecommerce',
  HEALTHCARE = 'healthcare',
  EDUCATION = 'education',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  TECHNOLOGY = 'technology',
  OTHER = 'other',
}

export enum FileVisibility {
  ALL = 'all',
  RESTRICTED = 'restricted',
}

export interface AuthUser {
  userId: string;
  companyId: string;
  email: string;
  role: Role;
}

export interface Company {
  _id: string;
  name: string;
  registrationNumber: string;
  country: string;
  industry: Industry;
  subscription: {
    plan: SubscriptionPlan;
    activatedAt: string;
    billingAnchorDay: number;
  };
}

export interface Employee {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface FileAsset {
  _id: string;
  originalName: string;
  mimeType: string;
  size: number;
  visibility: FileVisibility;
  allowedUsers: string[];
  uploadedBy: { _id: string; email: string; firstName?: string; lastName?: string } | string;
  createdAt: string;
}

export interface PlanDefinition {
  plan: SubscriptionPlan;
  label: string;
  maxFilesPerMonth: number;
  maxEmployees: number;
  basePricePerMonth: number;
  pricePerEmployee: number;
  overageFilePrice: number;
}

export interface SubscriptionOverview {
  plan: SubscriptionPlan;
  label: string;
  activatedAt: string;
  billingAnchorDay: number;
  limits: { maxFilesPerMonth: number; maxEmployees: number | null };
  usage: { filesThisMonth: number; employeeCount: number };
  availablePlans: Record<SubscriptionPlan, PlanDefinition>;
}

export interface BillingSummary {
  plan: SubscriptionPlan;
  planLabel: string;
  billingAnchorDay: number;
  nextDueDate: string;
  employeeCount: number;
  filesThisMonth: number;
  breakdown: {
    basePricePerMonth: number;
    employeeCharges: number;
    overageFiles: number;
    overageCharges: number;
  };
  amountDueUsd: number;
}

export interface AuditLog {
  _id: string;
  action: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorId?: { _id: string; email: string; firstName?: string; lastName?: string } | null;
}

export interface StatsOverview {
  plan: string;
  employeeCount: number;
  totalFiles: number;
  filesThisMonth: number;
  totalStorageBytes: number;
  filesByEmployee: { userId: string; email: string; fileCount: number }[];
}
