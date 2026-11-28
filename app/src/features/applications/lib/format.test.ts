import { describe, expect, it } from "vitest";
import { formatApplicationJobSalary } from "./format";

describe("formatApplicationJobSalary", () => {
  it("should return thỏa thuận for negotiable salary", () => {
    expect(
      formatApplicationJobSalary({
        jobSalaryType: "NEGOTIABLE",
        jobSalaryMin: 0,
        jobSalaryMax: 0,
      })
    ).toBe("Thỏa thuận");
  });

  it("should format a salary range with unit", () => {
    const result = formatApplicationJobSalary({
      jobSalaryType: "HOURLY",
      jobSalaryMin: 25000,
      jobSalaryMax: 30000,
    });
    expect(result).toMatch(/^25[.,\s]000 – 30[.,\s]000\/giờ$/);
  });

  it("should format single value when min equals max", () => {
    const result = formatApplicationJobSalary({
      jobSalaryType: "DAILY",
      jobSalaryMin: 200000,
      jobSalaryMax: 200000,
    });
    expect(result).toMatch(/^200[.,\s]000\/ngày$/);
  });

  it("should format single value when max is null", () => {
    const result = formatApplicationJobSalary({
      jobSalaryType: "MONTHLY",
      jobSalaryMin: 3000000,
      jobSalaryMax: null,
    });
    expect(result).toMatch(/^3[.,\s]000[.,\s]000\/tháng$/);
  });

  it("should return dash when salary is missing", () => {
    expect(
      formatApplicationJobSalary({
        jobSalaryType: "HOURLY",
        jobSalaryMin: null,
        jobSalaryMax: null,
      })
    ).toBe("—");
  });

  it("should return dash when salary is zero", () => {
    expect(
      formatApplicationJobSalary({
        jobSalaryType: "PER_TASK",
        jobSalaryMin: 0,
        jobSalaryMax: 0,
      })
    ).toBe("—");
  });
});
