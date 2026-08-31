// Minimal browser-only typing for the `qrcode` package. Deliberately avoids
// @types/qrcode / @types/node: this project's TypeScript version is too old
// for the @types/node release that npm otherwise resolves, and Node-oriented
// typings (Buffer, streams) aren't needed here — we only use the browser
// data-URL API.
declare module 'qrcode' {
  export interface QRCodeToDataURLOptions {
    width?: number;
    margin?: number;
    color?: { dark?: string; light?: string };
  }

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
}
