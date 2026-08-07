export type RoleName = "ADMIN" | "HR" | "EMPLOYEE";
export type EmploymentStatus = "ACTIVE" | "ON_LEAVE" | "TERMINATED";
export type CurrencyCode = "USD" | "EUR" | "GBP" | "INR" | "AED" | "SGD" | "AUD" | "CAD";

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  address: string | null;
  country: string | null;
  currency: CurrencyCode;
  department: string | null;
  jobTitle: string | null;
  employmentStatus: EmploymentStatus;
  joinedAt: string | null;
  exitedAt: string | null;
  roleId: string;
  createdAt: string;
  updatedAt: string;
  role?: Role;
}

export interface Salary {
  id: string;
  userId: string;
  currency: CurrencyCode;
  baseSalary: string;
  allowances: string;
  deductions: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  note: string | null;
  createdBy: string;
  user?: User;
  creator?: User;
}

export interface Payslip {
  id: string;
  userId: string;
  salaryId: string | null;
  year: number;
  month: number;
  currency: CurrencyCode;
  baseSalary: string;
  allowances: string;
  deductions: string;
  gross: string;
  net: string;
  user?: User;
}

export interface SalaryAnalyticsBucket {
  key: string;
  employeeCount: number;
  totalBase: number;
  totalAllowances: number;
  totalDeductions: number;
  totalGross: number;
  totalNet: number;
  averageNet: number;
}

export interface SalaryAnalytics {
  groupBy: "country" | "currency" | "department" | "role";
  totalEmployeesOnPayroll: number;
  buckets: SalaryAnalyticsBucket[];
}

export interface AuthSession {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: User;
}

export interface RoleUserCounts {
  active: number;
  inactive: number;
}

export interface UserStats {
  totalActive: number;
  totalInactive: number;
  byRole: Partial<Record<RoleName, RoleUserCounts>>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export type AttendanceStatus = "PRESENT" | "ABSENT" | "HOLIDAY";
export type CorrectionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type PermissionStatus = "ACTIVE" | "INACTIVE";

export interface Attendance {
  id: string;
  userId: string;
  date: string;
  day: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  workingHours: number | null;
  user?: User;
}

export interface AttendanceReport {
  user: { id: string; firstName: string; lastName: string; email: string };
  month: number;
  year: number;
  summary: {
    totalWeekdays: number;
    presentDays: number;
    absentDays: number;
    holidayDays: number;
    unmarkedDays: number;
    totalWorkingHours: number;
  };
  records: Array<{
    date: string;
    day: string;
    status: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    workingHours: number | null;
  }>;
}

export interface CorrectionRequest {
  id: string;
  userId: string;
  attendanceId: string | null;
  requestedDate: string;
  requestedDay: string;
  requestedStatus: AttendanceStatus;
  requestedCheckInTime: string | null;
  requestedCheckOutTime: string | null;
  requestedWorkingHours: number | null;
  reason: string;
  status: CorrectionStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  requester?: User;
}

export interface Permission {
  id: string;
  // Role-scoped only — there is no per-user grant. Anyone CURRENTLY
  // holding this role gets access, including someone moved into it later.
  roleId: string;
  // Audit trail: which admin created this grant (null if unknown / their
  // account was later removed).
  createdBy: string | null;
  path: string;
  method: HttpMethod;
  status: PermissionStatus;
  role?: Role;
  creator?: User;
}

export interface ApiErrorBody {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: unknown;
  };
}
