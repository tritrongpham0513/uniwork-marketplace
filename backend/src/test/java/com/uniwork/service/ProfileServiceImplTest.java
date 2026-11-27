package com.uniwork.service;

import com.uniwork.dto.response.EmployerProfileResponse;
import com.uniwork.dto.response.StudentProfileResponse;
import com.uniwork.entity.EmployerProfile;
import com.uniwork.entity.StudentProfile;
import com.uniwork.repository.EmployerProfileRepository;
import com.uniwork.repository.ProvinceRepository;
import com.uniwork.repository.ReviewRepository;
import com.uniwork.repository.StudentExperienceRepository;
import com.uniwork.repository.StudentJobPreferenceRepository;
import com.uniwork.repository.StudentProfileRepository;
import com.uniwork.repository.UserRepository;
import com.uniwork.repository.WorkAssignmentRepository;
import com.uniwork.service.impl.ProfileServiceImpl;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.when;

/**
 * Unit test cho {@link ProfileServiceImpl} — đảm bảo hồ sơ mới tạo (nhiều cột DB
 * còn {@code null}) vẫn trả chuỗi rỗng cho các trường text bắt buộc trên UI.
 */
@ExtendWith(MockitoExtension.class)
class ProfileServiceImplTest {

    @Mock
    private StudentProfileRepository studentProfileRepository;
    @Mock
    private EmployerProfileRepository employerProfileRepository;
    @Mock
    private StudentExperienceRepository experienceRepository;
    @Mock
    private StudentJobPreferenceRepository preferenceRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProvinceRepository provinceRepository;
    @Mock
    private ReviewRepository reviewRepository;
    @Mock
    private WorkAssignmentRepository workAssignmentRepository;
    @Mock
    private JobService jobService;
    @Mock
    private ReviewService reviewService;
    @Mock
    private WorkHistoryService workHistoryService;
    @Mock
    private FileStorageService fileStorageService;

    @InjectMocks
    private ProfileServiceImpl profileService;

    @Test
    @DisplayName("getStudentProfile chuẩn hoá các trường text null thành chuỗi rỗng")
    void getStudentProfile_CoalescesNullTextFields() {
        StudentProfile entity = StudentProfile.builder()
                .userId(10L)
                .slug("stu-new")
                .fullName("Sinh Viên Mới")
                .build();

        when(studentProfileRepository.findById(10L)).thenReturn(Optional.of(entity));
        when(experienceRepository.findByStudentUserIdOrderBySortOrderAsc(10L)).thenReturn(List.of());
        when(workHistoryService.listForStudent(10L)).thenReturn(List.of());
        when(preferenceRepository.findByStudentId(10L)).thenReturn(Optional.empty());

        StudentProfileResponse res = profileService.getStudentProfile(10L);

        assertEquals("", res.getPhone());
        assertEquals("", res.getStudentCode());
        assertEquals("", res.getUniversity());
        assertEquals("", res.getMajor());
        assertEquals("", res.getAddress());
        assertEquals("", res.getBio());
        assertNotNull(res.getSkills());
        assertNull(res.getAvatarUrl());
        assertNull(res.getCvUrl());
    }

    @Test
    @DisplayName("getEmployerProfile chuẩn hoá các trường text null thành chuỗi rỗng")
    void getEmployerProfile_CoalescesNullTextFields() {
        EmployerProfile entity = EmployerProfile.builder()
                .userId(20L)
                .slug("emp-new")
                .employerType("COMPANY")
                .displayName("Công ty Mới")
                .build();

        when(employerProfileRepository.findById(20L)).thenReturn(Optional.of(entity));

        EmployerProfileResponse res = profileService.getEmployerProfile(20L);

        assertEquals("", res.getContactName());
        assertEquals("", res.getContactPhone());
        assertEquals("", res.getDescription());
        assertEquals("", res.getAddress());
        assertNull(res.getLogoUrl());
        assertNull(res.getWebsite());
    }
}
