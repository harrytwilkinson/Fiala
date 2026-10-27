import { isNative } from "./platform";

// A light tap of feedback in the phone apps when something is logged. Browsers get nothing:
// web vibration is patchy and easy to find annoying.

export function tapFeedback(kind: "light" | "success" = "light") {
  if (!isNative) return;
  void import("@capacitor/haptics")
    .then(({ Haptics, ImpactStyle, NotificationType }) =>
      kind === "success" ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: ImpactStyle.Light }),
    )
    .catch(() => {
      // Haptics are a nicety; ignore devices without them.
    });
}
