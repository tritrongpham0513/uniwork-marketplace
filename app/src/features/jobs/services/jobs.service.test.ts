import { describe, it, expect } from "vitest";
import { buildJobQuery, HOURLY_MAX } from "./jobs.service";
import { HOURS_PER_SALARY_UNIT } from "@/features/jobs/types";
import type { JobFilters } from "@/features/jobs/types";

/** Bộ lọc mặc định — mọi test chỉ override những field cần kiểm tra. */
const baseFilters: JobFilters = {
  keyword: "",
  categoryIds: [],
  positionIds: [],
  provinceIds: [],
  districtIds: [],
  wardIds: [],
  employmentTypes: [],
  workModes: [],
  salaryUnit: "HOURLY",
  salaryMin: 0,
  salaryMax: HOURLY_MAX,
  sort: "newest",
  page: 1,
  pageSize: 20,
};

describe("buildJobQuery", () => {
  describe("mảng id -> chuỗi phân tách bởi dấu phẩy", () => {
    it("should join categoryIds with comma", () => {
      const query = buildJobQuery({
        ...baseFilters,
        categoryIds: ["1", "2", "3"],
      });
      expect(query.categoryIds).toBe("1,2,3");
    });

    it("should join positionIds with comma", () => {
      const query = buildJobQuery({
        ...baseFilters,
        positionIds: ["10", "20"],
      });
      expect(query.positionIds).toBe("10,20");
    });

    it("should join provinceIds with comma", () => {
      const query = buildJobQuery({ ...baseFilters, provinceIds: ["79"] });
      expect(query.provinceIds).toBe("79");
    });

    it("should join districtIds with comma", () => {
      const query = buildJobQuery({
        ...baseFilters,
        districtIds: ["001", "002"],
      });
      expect(query.districtIds).toBe("001,002");
    });

    it("should join wardIds with comma", () => {
      const query = buildJobQuery({
        ...baseFilters,
        wardIds: ["00001", "00002"],
      });
      expect(query.wardIds).toBe("00001,00002");
    });

    it("should join employmentTypes with comma", () => {
      const query = buildJobQuery({
        ...baseFilters,
        employmentTypes: ["PART_TIME", "FULL_TIME"],
      });
      expect(query.employmentTypes).toBe("PART_TIME,FULL_TIME");
    });

    it("should join workModes with comma", () => {
      const query = buildJobQuery({
        ...baseFilters,
        workModes: ["REMOTE", "HYBRID"],
      });
      expect(query.workModes).toBe("REMOTE,HYBRID");
    });

    it("should set array fields to undefined when empty", () => {
      const query = buildJobQuery(baseFilters);
      expect(query.categoryIds).toBeUndefined();
      expect(query.positionIds).toBeUndefined();
      expect(query.provinceIds).toBeUndefined();
      expect(query.districtIds).toBeUndefined();
      expect(query.wardIds).toBeUndefined();
      expect(query.employmentTypes).toBeUndefined();
      expect(query.workModes).toBeUndefined();
    });
  });

  describe("keyword", () => {
    it("should keep keyword when non-empty", () => {
      const query = buildJobQuery({ ...baseFilters, keyword: "phục vụ" });
      expect(query.keyword).toBe("phục vụ");
    });

    it("should set keyword to undefined when empty string", () => {
      const query = buildJobQuery({ ...baseFilters, keyword: "" });
      expect(query.keyword).toBeUndefined();
    });
  });

  describe("quy đổi lương về đồng/giờ", () => {
    it("should not divide when unit is HOURLY", () => {
      const query = buildJobQuery({
        ...baseFilters,
        salaryUnit: "HOURLY",
        salaryMin: 25000,
        salaryMax: 30000,
      });
      expect(query.salaryMin).toBe(25000);
      expect(query.salaryMax).toBe(30000);
    });

    it("should divide by 8 when unit is DAILY", () => {
      const query = buildJobQuery({
        ...baseFilters,
        salaryUnit: "DAILY",
        salaryMin: 200000,
        salaryMax: 240000,
      });
      expect(query.salaryMin).toBe(25000);
      expect(query.salaryMax).toBe(30000);
    });

    it("should divide by 40 when unit is WEEKLY", () => {
      const query = buildJobQuery({
        ...baseFilters,
        salaryUnit: "WEEKLY",
        salaryMin: 1000000,
        salaryMax: 1200000,
      });
      expect(query.salaryMin).toBe(25000);
      expect(query.salaryMax).toBe(30000);
    });

    it("should divide by 160 when unit is MONTHLY", () => {
      const query = buildJobQuery({
        ...baseFilters,
        salaryUnit: "MONTHLY",
        salaryMin: 4000000,
        salaryMax: 4800000,
      });
      expect(query.salaryMin).toBe(25000);
      expect(query.salaryMax).toBe(30000);
    });

    it("should round fractional results", () => {
      const query = buildJobQuery({
        ...baseFilters,
        salaryUnit: "MONTHLY",
        salaryMin: 100001,
        salaryMax: 100003,
      });
      expect(query.salaryMin).toBe(Math.round(100001 / 160));
      expect(query.salaryMax).toBe(Math.round(100003 / 160));
    });

    it("should always send salaryUnit so API knows the display unit", () => {
      const query = buildJobQuery({ ...baseFilters, salaryUnit: "DAILY" });
      expect(query.salaryUnit).toBe("DAILY");
    });

    it("should fall back to HOURLY when salaryUnit is missing", () => {
      const filters = {
        ...baseFilters,
        salaryUnit: undefined,
      } as unknown as JobFilters;
      const query = buildJobQuery(filters);
      expect(query.salaryUnit).toBe("HOURLY");
      expect(query.salaryMin).toBe(0);
    });

    it("should use HOURS_PER_SALARY_UNIT constant for every unit", () => {
      for (const [unit, hours] of Object.entries(HOURS_PER_SALARY_UNIT)) {
        const query = buildJobQuery({
          ...baseFilters,
          salaryUnit: unit as JobFilters["salaryUnit"],
          salaryMin: hours * 1000,
          salaryMax: hours * 2000,
        });
        expect(query.salaryMin).toBe(1000);
        expect(query.salaryMax).toBe(2000);
      }
    });
  });

  describe("phân trang & sắp xếp", () => {
    it("should pass through sort, page and pageSize", () => {
      const query = buildJobQuery({
        ...baseFilters,
        sort: "salary_desc",
        page: 3,
        pageSize: 50,
      });
      expect(query.sort).toBe("salary_desc");
      expect(query.page).toBe(3);
      expect(query.pageSize).toBe(50);
    });
  });

  it("should build a complete query for a fully populated filter", () => {
    const query = buildJobQuery({
      keyword: "ca đêm",
      categoryIds: ["5"],
      positionIds: ["9"],
      provinceIds: ["79"],
      districtIds: ["001"],
      wardIds: ["00001"],
      employmentTypes: ["PART_TIME"],
      workModes: ["ONSITE"],
      salaryUnit: "DAILY",
      salaryMin: 160000,
      salaryMax: 240000,
      sort: "newest",
      page: 1,
      pageSize: 20,
    });

    expect(query).toEqual({
      keyword: "ca đêm",
      categoryIds: "5",
      positionIds: "9",
      provinceIds: "79",
      districtIds: "001",
      wardIds: "00001",
      employmentTypes: "PART_TIME",
      workModes: "ONSITE",
      salaryUnit: "DAILY",
      salaryMin: 20000,
      salaryMax: 30000,
      sort: "newest",
      page: 1,
      pageSize: 20,
    });
  });
});
