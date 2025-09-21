import * as Dialog from "@radix-ui/react-dialog";
import { SUPPORT_QR_CODES } from "../../constants/support";
import { useTranslation } from "react-i18next";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SupportDialog = ({ open, onOpenChange }: SupportDialogProps) => {
  const { t } = useTranslation();
  const qrCodes = SUPPORT_QR_CODES.filter((code) => Boolean(code.imageSrc));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-1/2 left-1/2 w-[min(95vw,620px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-purple-200/60 bg-white p-6 shadow-xl focus:outline-none dark:border-purple-800/40 dark:bg-gray-900">
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t("support.dialogTitle")}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            {t("support.dialogDescription")}
          </Dialog.Description>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {qrCodes.length > 0 ? (
              qrCodes.map((code) => {
                const label = t(code.labelKey);
                return (
                  <div
                    key={code.id}
                    className="flex flex-col items-center gap-4 rounded-xl border border-purple-100/70 bg-purple-50/40 p-5 text-center dark:border-purple-900/40 dark:bg-purple-900/10"
                  >
                    <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-lg dark:bg-gray-950">
                      <img
                        src={code.imageSrc}
                        alt={t("support.qrAlt", { label })}
                        className="h-56 w-56 max-w-full object-contain sm:h-64 sm:w-64 md:h-72 md:w-72"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                        {label}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t("support.scanTip")}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="col-span-full rounded-lg bg-gray-100 p-4 text-sm text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                {t("support.noQrConfigured")}
              </p>
            )}
          </div>

          <Dialog.Close asChild>
            <button
              type="button"
              className="mt-6 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              {t("common.close")}
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
