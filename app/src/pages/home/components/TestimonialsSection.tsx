import { Star, CheckCircle2 } from "lucide-react";
import { TESTIMONIALS, type Testimonial } from "../data/mock-data";
import { cn } from "cn";

export function TestimonialsSection() {
  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto text-center space-y-3 mb-12">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
          <Star className="size-3.5 fill-current" />
          Người thật, việc thật
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
          Được tin tưởng bởi hơn 45.000 sinh viên toàn quốc
        </h2>
        <p className="text-sm text-muted-foreground">
          Lắng nghe những chia sẻ chân thực từ các bạn sinh viên đã tìm được việc làm và các đối tác tuyển dụng gắn bó cùng UniWork.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {TESTIMONIALS.map((t: Testimonial) => (
          <div
            key={t.id}
            className="flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-xs hover:border-amber-500/30 transition-all space-y-6"
          >
            <div className="space-y-4">
              {/* Star Rating */}
              <div className="flex items-center justify-between">
                <div className="flex text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="size-4 fill-current" />
                  ))}
                </div>
                {t.income && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {t.income}
                  </span>
                )}
              </div>

              {/* Review Content */}
              <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed">
                &ldquo;{t.content}&rdquo;
              </p>
            </div>

            {/* Author Info */}
            <div className="flex items-center gap-3 pt-4 border-t border-border/60">
              <div
                className={cn(
                  "flex size-11 items-center justify-center rounded-2xl font-bold text-white text-sm shadow-xs",
                  t.avatarBg
                )}
              >
                {t.name
                  .split(" ")
                  .slice(-2)
                  .map((w) => w[0])
                  .join("")}
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground truncate flex items-center gap-1">
                  {t.name}
                  <CheckCircle2 className="size-3.5 text-emerald-500 inline" />
                </h4>
                <p className="text-xs text-muted-foreground truncate">{t.role}</p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">
                  {t.schoolOrOrg}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
