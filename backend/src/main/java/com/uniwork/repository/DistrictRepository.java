package com.uniwork.repository;

import com.uniwork.entity.District;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DistrictRepository extends JpaRepository<District, Integer> {

    List<District> findByProvinceIdOrderByNameAsc(Short provinceId);

    List<District> findByProvinceCodeOrderByNameAsc(String provinceCode);

    List<District> findAllByOrderByNameAsc();

    Optional<District> findByCode(String code);
}

