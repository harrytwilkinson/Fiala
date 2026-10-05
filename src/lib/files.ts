import { isNative } from "./platform";

// Saving a file works differently in a browser (download link or Web Share)
// and in the native app (write to a cache file, then open the share sheet).

export type SaveResult = "shared" | "downloaded" | "cancelled";

function isAbort(e: unknown): boolean {
  if (e instanceof DOMException && e.name === "AbortError") return true;
  // Capacitor's Share plugin rejects with "Share canceled" when the sheet is dismissed.
  return e instanceof Error && /cancel/i.test(e.message);
}

export function canShareFiles(): boolean {
  if (isNative) return true;
  try {
    const probe = new File(["{}"], "probe.json", { type: "application/json" });
    return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
}

export async function saveFile(filename: string, contents: string, type: string, opts: { preferShare?: boolean; title?: string } = {}): Promise<SaveResult> {
  if (isNative) {
    const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([import("@capacitor/filesystem"), import("@capacitor/share")]);
    const { uri } = await Filesystem.writeFile({ path: filename, data: contents, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title: opts.title ?? filename, files: [uri] });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
      throw e;
    }
  }

  if (opts.preferShare && canShareFiles()) {
    try {
      await navigator.share({ files: [new File([contents], filename, { type })], title: opts.title ?? filename });
      return "shared";
    } catch (e) {
      if (isAbort(e)) return "cancelled";
      // Fall through to a download.
    }
  }

  const url = URL.createObjectURL(new Blob([contents], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  // Some browsers (Firefox) only honour clicks on links that are in the document.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return "downloaded";
}
