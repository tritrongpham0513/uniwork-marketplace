/**
 * Bộ 7 mẫu tin tuyển dụng để đánh giá tay chất lượng AI.
 *
 * Nguồn sự thật: `.scratch/ai-moderation/spec.md` mục "Bộ mẫu dùng để đánh giá tay
 * chất lượng AI" và `PROMPT.md` mục 6.
 *
 * Vì sao nội dung tiếng Việt có dấu: prompt kiểm duyệt phải chạy trên nội dung
 * thật của nhà tuyển dụng (tiếng Việt có dấu). Nếu mẫu viết không dấu thì ta
 * đang kiểm tra sai thứ — bản ASCII trong PROMPT.md chỉ áp dụng cho phần CHỈ DẪN
 * mà backend Java lưu dạng source.
 *
 * Mỗi mẫu khai báo `expected` — kết quả mong đợi để đối chiếu tay khi có lượt chạy
 * thật. `expected` KHÔNG phải dữ liệu đưa vào prompt (nếu đưa vào thì AI sẽ
 * "nghe lời" và bài kiểm tra trở nên vô nghĩa).
 */

/**
 * @typedef {Object} Benchmark
 * @property {number} avg Mức lương trung bình của nhóm việc × tỉnh (đồng/giờ).
 * @property {number} min Mức lương thấp nhất (đồng/giờ).
 * @property {number} max Mức lương cao nhất (đồng/giờ).
 * @property {number} sampleSize Số tin tuyển dụng dùng để tính trung bình.
 */

/**
 * @typedef {Object} Sample
 * @property {string} id Định danh mẫu (dùng cho `--sample <id>`).
 * @property {string} title Tiêu đề tin tuyển dụng.
 * @property {string} description Mô tả công việc.
 * @property {string[]} requirements Yêu cầu.
 * @property {string[]} benefits Quyền lợi.
 * @property {string} salaryType Đơn vị trả lương.
 * @property {number} salaryMin Mức lương tối thiểu.
 * @property {number} salaryMax Mức lương tối đa.
 * @property {string} location Địa điểm làm việc.
 * @property {string} category Nhóm việc.
 * @property {Object} employer Thông tin nhà tuyển dụng.
 * @property {Benchmark} [benchmark] Bảng xếp hạng lương của nhóm việc × tỉnh.
 * @property {string} expected Kết quả mong đợi (chỉ dùng để đối chiếu tay).
 */

/** @type {Sample[]} */
export const SAMPLES = [
  {
    id: "mau-01-dat-coc",
    title: "Nhân viên phục vụ quán cà phê ban tối",
    description:
      "Quán cà phê tuyển nhân viên phục vụ ca tối, làm việc ngay tại quán trung tâm thành phố. " +
      "Công việc gồm nhận order, pha đồ uống và dọn bàn.",
    requirements: [
      "Đặt cọc 500.000đ để giữ chỗ làm, hoàn lại khi làm xong.",
      "Có kinh nghiệm pha cà phê là một lợi thế.",
      "Sẵn sàng làm ca tối từ 18h đến 23h.",
    ],
    benefits: ["Ăn uống trong ca", "Thưởng tháng theo doanh thu quán"],
    salaryType: "HOURLY",
    salaryMin: 25000,
    salaryMax: 30000,
    location: "Quận 1, Hồ Chí Minh",
    category: "Nhà hàng - Dịch vụ ăn uống",
    employer: {
      name: "Quán cà phê Anh",
      isVerified: false,
      avgRating: 3.6,
      ratingCount: 4,
    },
    benchmark: { avg: 28000, min: 22000, max: 35000, sampleSize: 42 },
    expected: 'SUSPECT + FEE_ADVANCE (bằng chứng chứa cụm "đặt cọc")',
  },
  {
    id: "mau-02-khong-can-cccd",
    title: "Cần người phụ việc kho gấp trong tuần",
    description:
      "Kho hàng cần thêm người phụ việc để chia và dán hàng trong tuần này. " +
      "Công việc nhẹ nhàng, làm xong là nhận tiền ngay.",
    requirements: [
      "Không cần CCCD, không ký hợp đồng, làm thì công.",
      "Không cần hồ sơ, không cần bằng cấp.",
      "Có thể bắt đầu ngay hôm nay.",
    ],
    benefits: ["Trả lương theo ngày", "Ăn cơm trưa trong ca"],
    salaryType: "DAILY",
    salaryMin: 200000,
    salaryMax: 250000,
    location: "Quận 12, Hồ Chí Minh",
    category: "Kho - Vận chuyển - Giao nhận",
    employer: {
      name: "Công ty TNHH Vận tải An Phú",
      isVerified: false,
      avgRating: 3.1,
      ratingCount: 2,
    },
    expected: "SUSPECT + UNREGISTERED_WORK",
  },
  {
    id: "mau-03-tuyen-qua-zalo",
    title: "Tuyển nhân viên lễ tân sự kiện",
    description:
      "Bạn iu khiêm tắc làm lễ tân sự kiện, hỗ trợ khách mời và đón tiếp khách. " +
      "Công việc linh hoạt theo lịch sự kiện.",
    requirements: [
      "Ứng viên liên hệ Zalo 0903 456 789, gửi CV qua email nangcong123@gmail.com, không cần lên nền tảng.",
      "Nhanh tay, có thể làm cuối tuần.",
      "Ngoại hình ưa, nói lưu loát.",
    ],
    benefits: ["Được mặc đồng phục", "Cơm trưa mỗi ngày làm"],
    salaryType: "HOURLY",
    salaryMin: 30000,
    salaryMax: 35000,
    location: "Quận 7, Hồ Chí Minh",
    category: "Sự kiện - Tiệc cưới",
    employer: {
      name: "Trung tâm tổ chức sự kiện Minh Phát",
      isVerified: false,
      avgRating: 3.4,
      ratingCount: 7,
    },
    expected: "SUSPECT + OFF_PLATFORM",
  },
  {
    id: "mau-04-chi-nam-duoi-20-tui",
    title: "Tuyển nhân viên bán hàng nam tại showroom",
    description:
      "Showroom thiết bị gia dụng cần nhân viên bán hàng hỗ trợ khách trưng bày sản phẩm " +
      "và tư vấn mức giá.",
    requirements: [
      "Chỉ tuyển nam.",
      "Không ở trọ, phải tự tìm chỗ ở.",
      "Dưới 20 tuổi không xét.",
      "Ưu tiên người có hộ chiếu Hồng Kông.",
    ],
    benefits: ["Lương cứng + hoa hồng", "Được mua sản phẩm giá nội bộ"],
    salaryType: "MONTHLY",
    salaryMin: 6000000,
    salaryMax: 8000000,
    location: "Quận 3, Hồ Chí Minh",
    category: "Bán hàng - Kinh doanh",
    employer: {
      name: "Showroom Gia Dục Việt Hưng",
      isVerified: true,
      avgRating: 4.0,
      ratingCount: 11,
    },
    expected: "SUSPECT + DISCRIMINATION",
  },
  {
    id: "mau-05-lien-quan-mai-dam",
    title: "Tuyển host tiệc quay bar đêm khu vực Phú Nhuận",
    description:
      "Đội quay bar đêm cần tìm host nữ xinh cho các buổi tiệc sinh viên. " +
      "Công việc liên quan mại dâm, đánh giá và đưa khách đi giải trí.",
    requirements: [
      "Nhanh tay, sẵn sàng đi làm khuya.",
      "Không cần CCCD.",
      "Gọi điện trao đổi trực tiếp.",
    ],
    benefits: ["Hoàn tiền ngay sau mỗi buổi", "Được chia % doanh thu"],
    salaryType: "PER_TASK",
    salaryMin: 1500000,
    salaryMax: 3000000,
    location: "Quận Phú Nhuận, Hồ Chí Minh",
    category: "Nhà hàng - Dịch vụ ăn uống",
    employer: {
      name: "Quán bar XYZ",
      isVerified: false,
      avgRating: 2.8,
      ratingCount: 5,
    },
    expected: "SUSPECT + ILLEGAL_WORK",
  },
  {
    id: "mau-06-luong-anh",
    title: "Phục vụ nhà hàng lương cao, tuyển nhiều người",
    description:
      "Nhà hàng đông khách cần tuyển nhiều phục vụ và thu ngân làm ca gấp. " +
      "Mức lương hấp dẫn hơn mặt bằng chung, phù hợp sinh viên làm thêm.",
    requirements: [
      "Không yêu cầu kinh nghiệm, đào tạo tại chỗ.",
      "Sẵn sàng làm cuối tuần.",
      "Ưu tiên sinh viên năm 1, năm 2.",
    ],
    benefits: ["Ăn uống trong ca", "Thưởng thêm cho ca đêm"],
    salaryType: "HOURLY",
    salaryMin: 500000,
    salaryMax: 500000,
    location: "Quận 1, Hồ Chí Minh",
    category: "Nhà hàng - Dịch vụ ăn uống",
    employer: {
      name: "Nhà hàng Hải Yến",
      isVerified: true,
      avgRating: 4.3,
      ratingCount: 26,
    },
    benchmark: { avg: 28000, min: 22000, max: 35000, sampleSize: 42 },
    expected: "WARN hoặc SUSPECT + SALARY_ANOMALY",
  },
  {
    id: "mau-07-tin-binh-thuong",
    title: "Nhân viên phục vụ bán trà sữa part-time",
    description:
      "Quán trà sữa tuyển nhân viên phục vụ bán thời gian, làm 4 tiếng/ngày vào khung giờ vắng khách. " +
      "Công việc gồm lấy đồ, pha trà và dọn bàn. Cửa hàng nằm ngay mặt tiền đường lớn, đi lại thuận tiện.",
    requirements: [
      "Đang là sinh viên hoặc học sinh.",
      "Nói chuyện lịch sự, chịu được ca đông khách.",
      "Ưu tiên biết cơ bản về trà sữa, không có vẫn được đào tạo.",
    ],
    benefits: ["Được ăn uống miễn phí trong ca", "Tăng thêm 5.000đ/giờ nếu làm trên 3 tháng"],
    salaryType: "HOURLY",
    salaryMin: 30000,
    salaryMax: 30000,
    location: "Quận 3, Hồ Chí Minh",
    category: "Nhà hàng - Dịch vụ ăn uống",
    employer: {
      name: "Trà sữa Tộc Mộc",
      isVerified: true,
      avgRating: 4.5,
      ratingCount: 38,
    },
    benchmark: { avg: 28000, min: 22000, max: 35000, sampleSize: 42 },
    expected: "OK, reasons rỗng",
  },
];
