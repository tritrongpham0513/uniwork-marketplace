package com.uniwork.repository;

import com.uniwork.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SkillRepository extends JpaRepository<Skill, Integer> {

    List<Skill> findByIsActiveTrueOrderByNameAsc();

    Optional<Skill> findBySlug(String slug);
}

