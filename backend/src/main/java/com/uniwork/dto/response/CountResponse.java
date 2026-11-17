package com.uniwork.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Kết quả đếm — dùng cho `unread-count` và `read-all` của thông báo.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CountResponse {

    private Long count;
}
