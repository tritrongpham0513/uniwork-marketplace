# Chuẩn code

Tài liệu này ghi các _judgement call_ (mục không thể lint hoàn toàn tự động) để agent sử dụng khi review hoặc viết code.

---

## Ngôn ngữ

**Dùng đúng thuật ngữ từ GLOSSARY.md**:

- Không viết "tin việc làm", hãy viết "tin tuyển dụng".
- Không viết "ứng viên", hãy viết "sinh viên" (nếu nói chung chung) hoặc "ứng tuyển viên" (nếu nói về đơn cụ thể).
- Không dịch "employer" thành "chủ", hãy viết "nhà tuyển dụng".

**Tiếng Anh cho tên biến/hàm/class** — ví dụ:

```typescript
// ✅ Đúng
const jobToHourly = (job: Job): number => { ... }
interface SalaryComparison { ... }

// ❌ Sai
const tinhLuongTheoDuongTinh = (job: Job) => { ... }
interface SoSanhLuong { ... }
```

**Tiếng Việt cho comment/JSDoc** — để khớp với code hiện tại:

```typescript
/**
 * Quy đổi mức lương tối thiểu sang đồng/giờ.
 * Dùng để so sánh lương giữa các loại hình thanh toán (giờ, ngày, tuần, tháng).
 */
const jobToHourly = (job: Job): number => { ... }
```

---

## Cấu trúc code

### Frontend

#### 1. Feature nằm trong services, không nằm trong component

```typescript
// ❌ Sai: logic nghiệp vụ trong component
export const JobFilters = () => {
  const [filters, setFilters] = useState({ categoryId: "", provinceId: "" });

  const handleSearch = async () => {
    const query = { ...filters, page: 1 };
    const response = await axios.get("/api/v1/jobs", { params: query });
    // ...logic tính toán...
  };

  return <div>{/* ... */}</div>;
};

// ✅ Đúng: logic ở service, component gọi hook
export const useJobSearch = () => {
  const [filters, setFilters] = useState({ categoryId: "", provinceId: "" });

  const searchJobs = useCallback(async () => {
    return jobsService.searchJobs(filters);
  }, [filters]);

  return { filters, setFilters, searchJobs };
};

export const JobFilters = () => {
  const { filters, setFilters, searchJobs } = useJobSearch();
  return <div>{/* ... */}</div>;
};
```

#### 2. Không useEffect cho việc có thể tính được

```typescript
// ❌ Sai
const JobListHeader = ({ jobs, selectedCategoryId }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(jobs.length); // Có thể tính từ props luôn!
  }, [jobs]);

  return <div>Tổng: {count}</div>;
};

// ✅ Đúng
const JobListHeader = ({ jobs, selectedCategoryId }) => {
  const count = jobs.length; // Tính trực tiếp
  return <div>Tổng: {count}</div>;
};
```

#### 3. Comment: giải thích _tại sao_, không giải thích _cái gì_

```typescript
// ❌ Sai: comment rõ ràng (code tự nói)
export const compareSalary = (job: Job, benchmark: SalaryBenchmark) => {
  // Nếu benchmark không có, trả về null
  if (!benchmark) return null;

  // Quy đổi lương sang giờ
  const hourly = jobToHourly(job);

  // Tính percentile
  return calculatePercentile(hourly, benchmark);
};

// ✅ Đúng: comment giải thích lý do
export const compareSalary = (job: Job, benchmark: SalaryBenchmark) => {
  // Trả về null vì không có dữ liệu để so sánh, chứ không phải error
  if (!benchmark) return null;

  const hourly = jobToHourly(job);

  // Percentile cao = lương thấp hơn thị trường (counterintuitive nhưng khớp Viecoday)
  return calculatePercentile(hourly, benchmark);
};
```

#### 4. Validation schema (Zod) nằm ở `features/<x>/schema/`

```typescript
// app/src/features/auth/schema/auth.schema.ts
import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
```

Dùng trong component:

```typescript
import { LoginSchema } from "@/features/auth/schema/auth.schema";

const { handleSubmit, formState } = useForm({
  resolver: zodResolver(LoginSchema),
});
```

#### 5. Query key dùng chung nằm ở `features/shared/query-keys.ts`

Khi một feature cần invalidate cache của feature khác, **không** import chéo.
Định nghĩa toàn bộ query key ở `features/shared/query-keys.ts` (điểm neo duy nhất),
mỗi feature chỉ re-export phần của mình.

```typescript
// ❌ Sai: import chéo giữa các feature
// app/src/features/notifications/hooks/invalidate.ts
import { APPLICATION_KEYS } from "@/features/applications/hooks";
import { REVIEW_KEYS } from "@/features/reviews/hooks";

// ✅ Đúng: import từ shared
import { APPLICATION_KEYS, REVIEW_KEYS } from "@/features/shared/query-keys";
```

Trong feature, re-export key của mình để giữ import path cũ hoạt động:

```typescript
// app/src/features/jobs/hooks/useJobs.ts
import { JOB_KEYS } from "@/features/shared/query-keys";

export { JOB_KEYS };
```

Tương tự, `ApiResponse` là wrapper chung của **mọi** endpoint nên nằm ở
`features/shared/types` — không phải `features/auth/types`. `auth/types` chỉ
re-export để tương thích.

### Backend

#### 1. Entity không chứa business logic

```java
// ❌ Sai
@Entity
public class JobPost {
  public List<Student> getQualifiedApplicants() {
    // ... logic phức tạp ...
  }
}

// ✅ Đúng
@Entity
public class JobPost {
  // Chỉ chứa @Column, @JoinColumn, getter/setter
  @Column(name = "title")
  private String title;
}

// Logic ở service
@Service
public class JobService {
  public List<Student> getQualifiedApplicants(JobPost job) {
    // ... logic phức tạp ...
  }
}
```

#### 2. Service luôn @Transactional khi ghi

```java
// ❌ Sai
@Service
public class JobService {
  public JobPost createJob(JobUpsertRequest req) {
    JobPost job = new JobPost();
    jobRepository.save(job); // Có thể fail nếu không trong transaction
    // ...
  }
}

// ✅ Đúng
@Service
public class JobService {
  @Transactional
  public JobPost createJob(JobUpsertRequest req) {
    JobPost job = new JobPost();
    jobRepository.save(job);
    // ... mọi save/delete đều atomic ...
  }
}
```

#### 3. Mọi endpoint trả ApiResponse<T>

```java
// ❌ Sai
@GetMapping("/jobs/{id}")
public JobDetailResponse getJobDetail(@PathVariable String id) {
  return jobService.getJobDetail(id); // Nếu error -> 500 stack trace
}

// ✅ Đúng
@GetMapping("/jobs/{id}")
public ResponseEntity<ApiResponse<JobDetailResponse>> getJobDetail(@PathVariable String id) {
  try {
    JobDetailResponse data = jobService.getJobDetail(id);
    return ResponseEntity.ok(ApiResponse.success(data));
  } catch (ResourceNotFoundException e) {
    return ResponseEntity.status(404).body(
      ApiResponse.error("Tin tuyển dụng không tồn tại", e.getMessage())
    );
  }
}

// Hoặc dùng @ControllerAdvice (global exception handler)
@ControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiResponse<?>> handleNotFound(ResourceNotFoundException e) {
    return ResponseEntity.status(404).body(
      ApiResponse.error("Không tìm thấy", e.getMessage())
    );
  }
}
```

#### 4. DTO cho request/response

```java
// Request
public class JobUpsertRequest {
  private String title;
  private String description;
  @Valid private List<String> requirements;
  // ... validation annotation ...
}

// Response
public class JobDetailResponse {
  private String id;
  private String title;
  private EmployerSummary employer;
  // ... không expose internal entity ...
}

// Mapping: dùng MapStruct hoặc manual
@Mapper
public interface JobMapper {
  JobDetailResponse toDetailResponse(JobPost entity);
  JobPost toEntity(JobUpsertRequest request);
}
```

---

## Comment

### Luật chung

1. **Giải thích _tại sao_, không giải thích _cái gì_** — code đã nói rõ cái gì.
2. **Cấm biện minh cho workaround** — nếu làm hack, viết ADR trước.
3. **Tiếng Việt cho comment/JSDoc** — khớp codebase hiện tại.

### Ví dụ

```typescript
// ❌ Sai: comment rõ ràng
const salary = job.salaryMin * hours; // Nhân lương tối thiểu với số giờ

// ✅ Đúng: comment giải thích lý do
// Dùng salaryMin thay vì avg vì giả sử employer sẽ trả ít nhất mức này
const salary = job.salaryMin * hours;
```

```java
// ❌ Sai: hack mà không giải thích
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");

// ✅ Đúng: giải thích tại sao cần format lạ
// Backend trả ISO-8601 với timezone UTC, nhưng Postgres không parse .SSS'Z' được
// nên phải cắt bớt rồi append UTC suffix riêng
DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
```

---

## Quy tắc không thể lint

### 1. Type safety

Sử dụng TypeScript/Java type system tối đa:

```typescript
// ❌ Sai
const handleFilter = (filterKey, filterValue) => {};

// ✅ Đúng
type FilterKey = "categoryId" | "provinceId" | "salaryMin";
const handleFilter = (filterKey: FilterKey, filterValue: string | number) => {};
```

### 2. Naming conventions

- **Boolean prefix**: `is`, `has`, `should`, `can`

  ```typescript
  const isVerified = true; // ✅
  const verified = true; // ❌ (mơ hồ)
  ```

- **Function/method**: verb + noun
  ```typescript
  const getUserById = (id: number) => {}; // ✅
  const getUser = (id: number) => {}; // ❌ (mơ hồ)
  ```

### 3. Giãn cách logic (Separation of Concerns)

Mỗi hàm/class: **một trách nhiệm duy nhất**.

```typescript
// ❌ Sai: hàm vừa lấy data vừa tính toán
export const getJobsWithRanking = async (categoryId: string) => {
  const jobs = await jobsService.getJobs(categoryId);
  const benchmarks = await salaryService.getBenchmarks(categoryId);
  const withRanking = jobs.map((job) => ({
    ...job,
    ranking: calculateRanking(job, benchmarks),
  }));
  return withRanking;
};

// ✅ Đúng: tách riêng
export const getJobs = async (categoryId: string) => {
  return jobsService.getJobs(categoryId);
};

export const enrichWithRanking = (
  jobs: Job[],
  benchmarks: SalaryBenchmark[],
) => {
  return jobs.map((job) => ({
    ...job,
    ranking: calculateRanking(job, benchmarks),
  }));
};
```

---

## Test

Ngoài code chính, hãy viết test cho:

- **Frontend**: các hàm thuần, hook custom, schema validation.
- **Backend**: business logic ở service, không cần test repository (JPA + H2 đủ rồi).

```typescript
// ✅ Hàm thuần dễ test
export const jobToHourly = (job: Job): number => {
  if (job.salaryType === "NEGOTIABLE") return 0;
  return job.salaryMin / HOURS_PER_UNIT[job.salaryType];
};

// Test
describe("jobToHourly", () => {
  it("should convert monthly salary to hourly", () => {
    const job = { salaryType: "MONTHLY", salaryMin: 160 };
    expect(jobToHourly(job)).toBe(1); // 160 / 160
  });
});
```

---

## Khác

- **Không magic number**: dùng named constant hoặc enum.
- **Không hardcode URL**: dùng `PATHS` config hoặc biến môi trường.
- **Lỗi phải readable**: message lỗi từ API nên tiếng Việt rõ ràng (ví dụ: "Email không hợp lệ", không "Invalid email format").
