import { useState } from "react";
import { ChevronDown, HelpCircle, MessageCircleQuestion } from "lucide-react";
import { FAQS, type FaqItem } from "../data/mock-data";
import { cn } from "cn";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
            <HelpCircle className="size-3.5" />
            Giải đáp thắc mắc
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
            Câu hỏi thường gặp
          </h2>
          <p className="text-sm text-muted-foreground">
            Những điều sinh viên và nhà tuyển dụng quan tâm nhất khi lần đầu biết đến UniWork.
          </p>
        </div>

        {/* Accordion list */}
        <div className="space-y-3">
          {FAQS.map((faq: FaqItem, idx: number) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={cn(
                  "rounded-2xl border transition-all duration-200 overflow-hidden",
                  isOpen
                    ? "border-amber-500/40 bg-card shadow-xs"
                    : "border-border/80 bg-card/60 hover:border-border"
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="flex w-full items-center justify-between p-4 sm:p-5 text-left text-sm sm:text-base font-bold text-foreground cursor-pointer gap-4"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageCircleQuestion className="size-4 shrink-0 text-amber-500" />
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                      isOpen && "rotate-180 text-amber-500"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/40">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

