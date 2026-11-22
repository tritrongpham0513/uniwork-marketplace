package com.uniwork.repository;

import com.uniwork.entity.Ward;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Truy cấp bảng `wards` — đơn vị hành chính cấp xã/phường (cấp 2 từ 01/07/2025).
 *
 * <p>Dùng {@code @EntityGraph} để nạp sẵn quan hệ {@code province}: bảng này có
 * 3.321 dòng, nếu không nạp sẵn thì mỗi dòng sẽ bắn thêm 1 truy vấn (N+1).
 */
@Repository
public interface WardRepository extends JpaRepository<Ward, Integer> {

    @EntityGraph(attributePaths = {"province"})
    List<Ward> findByProvinceCodeOrderByNameAsc(String provinceCode);

    @EntityGraph(attributePaths = {"province"})
    List<Ward> findAllByOrderByNameAsc();

    @EntityGraph(attributePaths = {"province"})
    Optional<Ward> findByCode(String code);
}
