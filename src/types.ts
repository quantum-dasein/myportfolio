export interface Link {
  title: string;
  url: string;
  target?: string;
  /** i18n key so the client switcher can re-translate nav labels in place. */
  i18n?: string;
  /** deck chapter id — clicking dispatches `rb:goto` instead of navigating. */
  goto?: string;
  /** overlay id — clicking dispatches `rb:overlay-open` instead of navigating. */
  overlay?: string;
  /** play the warp tunnel transition before navigating to `url`. */
  tunnel?: boolean;
}

export interface Image {
  width?: string | number;
  height?: string | number;
  src: string;
  alt: string;
}
