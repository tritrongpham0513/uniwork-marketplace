import { CloudShader } from "@/components/ui/cloud-shader";
import { Link, Outlet } from "react-router";
import { PATHS } from "@/config/paths";
import authBanner from "@/assets/images/auth-banner.png";

function AuthLayout() {
  return (
    <CloudShader className="min-h-dvh w-full">
      <div className="relative flex min-h-dvh w-full items-center justify-center p-4 py-8">
        <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-border/60 bg-card/95 p-3 text-card-foreground shadow-2xl backdrop-blur-md md:grid-cols-2">
          {/* Banner minh họa bên trái */}
          <div className="relative hidden min-h-145 overflow-hidden rounded-2xl md:block">
            <img
              src={authBanner}
              alt="Minh họa VieJob - Nền tảng việc làm bán thời gian cho sinh viên"
              className="size-full object-cover"
              loading="eager"
            />
          </div>

          {/* Form bên phải */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-sm space-y-6">
              <div className="flex justify-center">
                <Link
                  to={PATHS.HOME}
                  className="group inline-flex items-center gap-2.5 transition-opacity hover:opacity-80"
                  title="Quay về trang chủ"
                >
                  <img
                    src="/favicon.png"
                    alt="VieJob"
                    className="size-9 shrink-0 rounded-xl object-contain shadow-xs transition-transform group-hover:scale-105"
                  />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight text-foreground">
                      Vie<span className="text-primary">Job</span>
                    </span>
                    <span className="-mt-1 text-[10px] font-medium text-muted-foreground">
                      Việc làm sinh viên
                    </span>
                  </div>
                </Link>
              </div>
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </CloudShader>
  );
}

export default AuthLayout;
