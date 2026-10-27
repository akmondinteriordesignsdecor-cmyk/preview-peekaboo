import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
          src?: string | undefined;
          poster?: string | undefined;
          "camera-controls"?: boolean | undefined;
          "auto-rotate"?: boolean | undefined;
          ar?: boolean | undefined;
        };
      }
    }
  }
}

export {};
