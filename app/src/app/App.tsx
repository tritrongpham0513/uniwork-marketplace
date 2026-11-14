import { RouterProvider } from "react-router";
import { router } from "./router";
import { ThemeProvider } from "@/provider/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toast";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Toaster phải được mount ĐÚNG 1 LẦN ở gốc ứng dụng */}
      <Toaster>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <RouterProvider router={router} />
        </ThemeProvider>
      </Toaster>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;
