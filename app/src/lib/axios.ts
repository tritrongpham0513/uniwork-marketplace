import { env } from "@/config/env";
import axios, { AxiosError } from "axios";

const axiosInstance = axios.create({
  baseURL: env.API_URL_DEV,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
