import { describe, expect, it } from "vitest";
import { toCsv } from "../src/utils/csv";
import { analyticsBucketsToCsv, type AnalyticsBucket } from "../src/utils/salary-math";

describe("toCsv", () => {
  it("joins rows with CRLF and commas", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2");
  });

  it("quotes fields that contain commas or quotes", () => {
    expect(toCsv([["hello, world", 'say "hi"']])).toBe('"hello, world","say ""hi"""');
  });

  it("treats null/undefined as empty cells", () => {
    expect(toCsv([[null, undefined, "x"]])).toBe(",,x");
  });
});

describe("analyticsBucketsToCsv", () => {
  it("exports a header row plus bucket rows", () => {
    const buckets: AnalyticsBucket[] = [
      {
        key: "USD",
        employeeCount: 2,
        totalBase: 300,
        totalAllowances: 10,
        totalDeductions: 25,
        totalGross: 310,
        totalNet: 285,
        averageNet: 142.5,
      },
    ];
    const csv = analyticsBucketsToCsv(buckets);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("group,employeeCount");
    expect(lines[1]).toBe("USD,2,300,10,25,310,285,142.5");
  });
});
