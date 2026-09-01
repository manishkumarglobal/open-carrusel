"use client";

import { useState } from "react";
import { Download, Loader2, Check, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  carouselId: string;
  slideCount: number;
}

export function ExportButton({ carouselId, slideCount }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    if (exporting || slideCount === 0) return;
    setExporting(true);
    setDone(false);
    setError(null);

    try {
      const response = await fetch(`/api/carousels/${carouselId}/export`, {
        method: "POST",
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ||
            `The export failed with status ${response.status}.`
        );
      }

      // The route renders every slide and answers with the finished ZIP in one
      // response. There is no progress stream to read, so the button reports an
      // indeterminate state rather than a slide counter that never moves.
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `carousel-${carouselId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The export failed. See the server console for details."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative">
      <Button
        onClick={handleExport}
        disabled={exporting || slideCount === 0}
        variant="accent"
        size="sm"
      >
        <span
          key={exporting ? "exporting" : done ? "done" : "idle"}
          className="oc-enter-pop inline-flex items-center gap-2"
        >
          {exporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                Exporting {slideCount} slide{slideCount === 1 ? "" : "s"}…
              </span>
            </>
          ) : done ? (
            <>
              <Check className="h-4 w-4" />
              <span>Downloaded!</span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              <span>Export PNG</span>
            </>
          )}
        </span>
      </Button>

      {error && (
        <div
          role="alert"
          className="oc-enter-pop absolute right-0 top-full mt-2 z-30 w-80 rounded-lg border border-destructive/30 bg-surface p-3 shadow-lg"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-destructive">
                Export failed
              </p>
              <p className="text-xs text-muted-foreground mt-1 break-words">
                {error}
              </p>
            </div>
            <button
              onClick={() => setError(null)}
              className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
              aria-label="Dismiss export error"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
