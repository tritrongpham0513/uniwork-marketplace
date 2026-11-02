import { AuroraBackground } from "@/components/ui/aurora-background";
import { Outlet } from "react-router";

function AuthLayout() {
  return (
    <AuroraBackground>
      <div className="relative flex min-h-dvh w-full items-center justify-center">
        <div className="grid w-full max-w-4xl grid-cols-2 gap-0 overflow-hidden rounded-4xl bg-card p-2 text-card-foreground">
          <div className="min-h-140 rounded-2xl bg-amber-400"></div>
          <div className="flex flex-col items-center justify-center p-10">
            <div className="mt-6 w-full max-w-sm space-y-4">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </AuroraBackground>
  );
}

export default AuthLayout;
