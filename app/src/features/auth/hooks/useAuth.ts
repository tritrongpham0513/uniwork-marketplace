import { useCurrentUser, AUTH_KEYS } from "./useCurrentUser";
import {
  getLocalAccessToken,
  getLocalUser,
  clearAuthSession,
} from "@/utils/authStorage";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { PATHS } from "@/config/paths";

export const useAuth = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const token = getLocalAccessToken();
  const localUser = getLocalUser();

  const { data: userResponse, isLoading } = useCurrentUser();
  const user = userResponse?.data || localUser;
  const isAuth = Boolean(token && user);

  const logout = () => {
    clearAuthSession();
    queryClient.removeQueries({ queryKey: AUTH_KEYS.all });
    navigate(PATHS.AUTH.LOGIN);
  };

  return {
    user,
    token,
    isAuthenticated: isAuth,
    isLoading: Boolean(token && isLoading && !localUser),
    logout,
  };
};

export default useAuth;

