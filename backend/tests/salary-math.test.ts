import { describe, expect, it } from "vitest";
import {
  aggregateSalaryBuckets,
  computePayComponents,
  dayBefore,
  parseMoney,
  round2,
} from "../src/utils/salary-math";

describe("parseMoney", () => {
  it("parses numeric strings and numbers", () => {
    expect(parseMoney("1200.50")).toBe(1200.5);
    expect(parseMoney(99)).toBe(99);
  });

  it("rejects non-finite values", () => {
    expect(() => parseMoney("abc")).toThrow(/Invalid money/);
  });
});

describe("round2", () => {
  it("rounds to two decimal places", () => {
    expect(round2(10.005)).toBe(10.01);
    expect(round2(10.004)).toBe(10);
  });
});

describe("dayBefore", () => {
  it("returns the previous calendar day in UTC", () => {
    expect(dayBefore("2026-03-01")).toBe("2026-02-28");
    expect(dayBefore("2024-03-01")).toBe("2024-02-29"); // leap year
  });

  it("rejects invalid dates", () => {
    expect(() => dayBefore("not-a-date")).toThrow(/Invalid date/);
  });
});

describe("computePayComponents", () => {
  it("computes gross and net", () => {
    expect(computePayComponents(1000, 200, 150)).toEqual({
      baseSalary: 1000,
      allowances: 200,
      deductions: 150,
      gross: 1200,
      net: 1050,
    });
  });

  it("rejects deductions above gross", () => {
    expect(() => computePayComponents(1000, 0, 1001)).toThrow(/Deductions cannot exceed/);
  });

  it("rejects negative amounts", () => {
    expect(() => computePayComponents(-1, 0, 0)).toThrow(/negative/);
  });
});

describe("aggregateSalaryBuckets", () => {
  const rows = [
    {
      currency: "USD",
      baseSalary: 100,
      allowances: 10,
      deductions: 5,
      user: { country: "US", department: "Eng", role: { name: "EMPLOYEE" } },
    },
    {
      currency: "USD",
      baseSalary: 200,
      allowances: 0,
      deductions: 20,
      user: { country: "US", department: "Sales", role: { name: "EMPLOYEE" } },
    },
    {
      currency: "INR",
      baseSalary: 50000,
      allowances: 0,
      deductions: 0,
      user: { country: "IN", department: "Eng", role: { name: "EMPLOYEE" } },
    },
  ];

  it("groups by currency and sorts by totalNet desc", () => {
    const buckets = aggregateSalaryBuckets(rows, "currency");
    expect(buckets.map((b) => b.key)).toEqual(["INR", "USD"]);
    expect(buckets[1]).toMatchObject({
      key: "USD",
      employeeCount: 2,
      totalGross: 310,
      totalNet: 285,
      averageNet: 142.5,
    });
  });

  it("groups by country and uses UNSET when missing", () => {
    const withUnset = [
      ...rows,
      { currency: "EUR", baseSalary: 10, allowances: 0, deductions: 0, user: null },
    ];
    const buckets = aggregateSalaryBuckets(withUnset, "country");
    const unset = buckets.find((b) => b.key === "UNSET");
    expect(unset?.employeeCount).toBe(1);
    expect(buckets.find((b) => b.key === "US")?.employeeCount).toBe(2);
  });

  it("groups by department", () => {
    const buckets = aggregateSalaryBuckets(rows, "department");
    expect(buckets.find((b) => b.key === "Eng")?.employeeCount).toBe(2);
    expect(buckets.find((b) => b.key === "Sales")?.employeeCount).toBe(1);
  });
});
