import { Outlet } from "react-router";
import { Header } from "./header";

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header điều hướng chung với User Dropdown */}
      <Header />

      {/* Nội dung trang */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer tối giản */}
      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <p>© {new Date().getFullYear()} UniWork Marketplace. Nền tảng việc làm linh hoạt cho sinh viên.</p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;

