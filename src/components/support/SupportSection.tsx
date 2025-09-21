import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SupportDialog } from "./SupportDialog";

export const SupportSection = () => {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section className="mt-10 sm:mt-14">
      <div className="relative overflow-hidden rounded-2xl border border-purple-200/60 bg-gradient-to-br from-purple-100/80 via-white to-indigo-100/70 p-6 dark:border-purple-800/40 dark:from-purple-950/50 dark:via-gray-900/60 dark:to-indigo-950/40">
        <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-amber-200/40 blur-2xl dark:bg-amber-500/20"></div>
        <div className="absolute -right-12 -bottom-12 h-48 w-48 rounded-full bg-orange-200/40 blur-3xl dark:bg-orange-500/10"></div>
        <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-300">
              {t("home.supportHeader")}
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 sm:text-3xl">
              {t("home.supportTitle")}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 sm:text-base">
              {t("home.supportDescription")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="group relative flex h-14 w-full max-w-xs items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 px-6 text-base font-semibold text-white shadow-lg transition hover:from-amber-500 hover:to-orange-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 dark:from-amber-500 dark:to-orange-500 sm:h-16 sm:max-w-[280px] sm:text-lg md:max-w-[320px]"
          >
            <span className="z-10">{t("home.buyCoffeeCta")}</span>
            <span aria-hidden className="z-10 text-xl sm:text-2xl">☕️</span>
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-amber-500/30 to-orange-500/30 transition-transform duration-300 ease-in-out group-hover:translate-x-0"></div>
          </button>
        </div>
      </div>
      <SupportDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
};
