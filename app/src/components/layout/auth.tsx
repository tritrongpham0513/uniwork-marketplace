import { CloudShader } from "@/components/ui/cloud-shader";
import { Outlet } from "react-router";
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
            <div className="w-full max-w-sm space-y-4">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </CloudShader>
  );
}

export default AuthLayout;
