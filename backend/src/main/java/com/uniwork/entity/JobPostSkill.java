package com.uniwork.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Entity ánh xạ bảng `job_post_skills` — kỹ năng yêu cầu của 1 tin tuyển dụng.
 */
@Entity
@Table(name = "job_post_skills")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class JobPostSkill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_post_id", nullable = false)
    private JobPost jobPost;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "skill_id", nullable = false)
    private Skill skill;
}
