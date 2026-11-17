package com.uniwork.repository;

import com.uniwork.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ProvinceRepository extends JpaRepository<Province, Short> {

    List<Province> findAllByOrderByNameAsc();

    Optional<Province> findByCode(String code);
}

