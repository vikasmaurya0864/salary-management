export const EMPLOYMENT_STATUSES = ["ACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];

/** ISO-4217 currency codes we support for multi-country payroll reporting. */
export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];
