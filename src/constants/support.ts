export interface SupportQRCode {
  id: string;
  labelKey: string;
  imageSrc: string;
}

export const SUPPORT_QR_CODES: SupportQRCode[] = [
  {
    id: "wechat",
    labelKey: "support.qr.wechat",
    imageSrc: "/support/support-qr-wechat.jpg",
  },
  {
    id: "alipay",
    labelKey: "support.qr.alipay",
    imageSrc: "/support/support-qr-alipay.jpg",
  },
];
