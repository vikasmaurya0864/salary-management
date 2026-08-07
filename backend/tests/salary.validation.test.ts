import { describe, expect, it } from "vitest";
import { createSalarySchema, salaryAnalyticsQuerySchema } from "../src/modules/salaries/salary.validation";
import { createUserSchema } from "../src/modules/users/user.validation";

describe("createSalarySchema", () => {
  const valid = {
    userId: "6d25db8b-6aec-47a5-b6ce-a04d0aa977b6",
    currency: "USD" as const,
    baseSalary: 1000,
    allowances: 100,
    deductions: 50,
    effectiveFrom: "2026-01-01",
  };

  it("accepts a valid package", () => {
    const parsed = createSalarySchema.parse(valid);
    expect(parsed.baseSalary).toBe(1000);
    expect(parsed.allowances).toBe(100);
  });

  it("rejects unknown currency", () => {
    expect(() => createSalarySchema.parse({ ...valid, currency: "XYZ" })).toThrow();
  });

  it("rejects bad effectiveFrom format", () => {
    expect(() => createSalarySchema.parse({ ...valid, effectiveFrom: "01-01-2026" })).toThrow();
  });

  it("rejects negative base salary", () => {
    expect(() => createSalarySchema.parse({ ...valid, baseSalary: -1 })).toThrow();
  });
});

describe("salaryAnalyticsQuerySchema", () => {
  it("defaults groupBy and format", () => {
    const parsed = salaryAnalyticsQuerySchema.parse({});
    expect(parsed.groupBy).toBe("currency");
    expect(parsed.format).toBe("json");
  });
});

describe("createUserSchema employment fields", () => {
  const base = {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@acme.example",
    password: "password1",
    mobile: "9876543210",
    role: "EMPLOYEE" as const,
  };

  it("uppercases country codes", () => {
    const parsed = createUserSchema.parse({ ...base, country: "in" });
    expect(parsed.country).toBe("IN");
  });

  it("accepts supported currency and employment status", () => {
    const parsed = createUserSchema.parse({
      ...base,
      currency: "INR",
      employmentStatus: "ON_LEAVE",
      joinedAt: "2020-05-01",
    });
    expect(parsed.currency).toBe("INR");
    expect(parsed.employmentStatus).toBe("ON_LEAVE");
  });
});
