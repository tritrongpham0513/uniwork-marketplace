import { Outlet } from "react-router";
import { Header } from "./header";
import { Footer } from "./footer";

export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header điều hướng chung với User Dropdown */}
      <Header />

      {/* Nội dung trang */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer đầy đủ uy tín */}
      <Footer />
    </div>
  );
}

export default MainLayout;
