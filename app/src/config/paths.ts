// src/config/paths.ts

export const PATHS = {
  HOME: "/",
  ABOUT: "/about",
  AUTH: {
    LOGIN: "/login",
    REGISTER: "/register",
  },
  // Hỗ trợ cả route có param động cho sau này (job detail, profile, v.v.)
  JOBS: {
    ROOT: "/jobs",
    DETAIL: (id: string | number = ":id") => `/jobs/${id}`,
  },
} as const;
