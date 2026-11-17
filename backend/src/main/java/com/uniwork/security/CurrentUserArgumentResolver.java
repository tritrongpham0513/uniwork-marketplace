package com.uniwork.security;

import com.uniwork.entity.User;
import com.uniwork.util.ApiErrors;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.util.Optional;

/**
 * Argument resolver cho annotation {@link CurrentUser}.
 *
 * <p>Inject entity {@link User} của người đang đăng nhập vào controller.
 * Nếu chưa đăng nhập thì trả lỗi 401 đúng envelope.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    private final CurrentUserResolver currentUserResolver;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && User.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Object resolveArgument(MethodParameter parameter,
                                  ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest,
                                  WebDataBinderFactory binderFactory) {
        return currentUserResolver.findCurrent()
                .orElseThrow(() -> ApiErrors.unauthorized("Vui lòng đăng nhập để tiếp tục."));
    }

    /** Tiện ích đọc principal từ SecurityContext (không cần bean). */
    public static Optional<User> currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }
        Object principal = authentication.getPrincipal();
        return principal instanceof User user ? Optional.of(user) : Optional.empty();
    }
}
