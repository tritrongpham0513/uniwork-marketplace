import type { District } from "@/features/shared/types";

/**
 * Quận/Huyện — mirror bảng `districts`.
 * Chỉ khai báo các tỉnh có dữ liệu trong job mock.
 */
export const DISTRICTS: District[] = [
  // TP. Hồ Chí Minh
  { id: "q1", provinceId: "hcm", name: "Quận 1" },
  { id: "q3", provinceId: "hcm", name: "Quận 3" },
  { id: "q4", provinceId: "hcm", name: "Quận 4" },
  { id: "q5", provinceId: "hcm", name: "Quận 5" },
  { id: "q6", provinceId: "hcm", name: "Quận 6" },
  { id: "q7", provinceId: "hcm", name: "Quận 7" },
  { id: "q8", provinceId: "hcm", name: "Quận 8" },
  { id: "q10", provinceId: "hcm", name: "Quận 10" },
  { id: "q11", provinceId: "hcm", name: "Quận 11" },
  { id: "q12", provinceId: "hcm", name: "Quận 12" },
  { id: "btanh", provinceId: "hcm", name: "Quận Bình Thạnh" },
  { id: "td", provinceId: "hcm", name: "Thành phố Thủ Đức" },
  { id: "pn", provinceId: "hcm", name: "Quận Phú Nhuận" },
  { id: "gv", provinceId: "hcm", name: "Quận Gò Vấp" },
  { id: "tb", provinceId: "hcm", name: "Quận Tân Bình" },
  { id: "bt", provinceId: "hcm", name: "Quận Bình Tân" },
  { id: "tp", provinceId: "hcm", name: "Quận Tân Phú" },
  // Hà Nội
  { id: "cg", provinceId: "hn", name: "Quận Cầu Giấy" },
  { id: "tx", provinceId: "hn", name: "Quận Thanh Xuân" },
  { id: "dd", provinceId: "hn", name: "Quận Đống Đa" },
  { id: "hbt", provinceId: "hn", name: "Quận Hai Bà Trưng" },
  { id: "hd", provinceId: "hn", name: "Quận Hà Đông" },
  { id: "bd", provinceId: "hn", name: "Quận Ba Đình" },
  { id: "hk", provinceId: "hn", name: "Quận Hoàn Kiếm" },
  { id: "ntl", provinceId: "hn", name: "Quận Nam Từ Liêm" },
  { id: "btl", provinceId: "hn", name: "Quận Bắc Từ Liêm" },
  { id: "lb", provinceId: "hn", name: "Quận Long Biên" },
  { id: "hm", provinceId: "hn", name: "Quận Hoàng Mai" },
  { id: "th", provinceId: "hn", name: "Quận Tây Hồ" },
  // Đà Nẵng
  { id: "dn-hai", provinceId: "dn", name: "Quận Hải Châu" },
  { id: "dn-thanh", provinceId: "dn", name: "Quận Thanh Khê" },
  { id: "dn-son", provinceId: "dn", name: "Quận Sơn Trà" },
  // Cần Thơ
  { id: "ct-ninh", provinceId: "ct", name: "Quận Ninh Kiều" },
  { id: "ct-binh", provinceId: "ct", name: "Quận Bình Thủy" },
  // Bình Dương
  { id: "bd-thuan", provinceId: "bd", name: "Thành phố Thủ Dầu Một" },
  { id: "bd-di", provinceId: "bd", name: "Thị xã Dĩ An" },
  // Đắk Lắk
  { id: "dak-bmt", provinceId: "dak", name: "Phường Buôn Ma Thuột" },
];

export const getDistrict = (id: string): District | undefined =>
  DISTRICTS.find((d) => d.id === id);

export const getDistrictsByProvince = (provinceId: string): District[] =>
  DISTRICTS.filter((d) => d.provinceId === provinceId);
