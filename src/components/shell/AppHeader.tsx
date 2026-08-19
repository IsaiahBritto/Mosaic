import Link from "next/link";
import { cn } from "@/lib/utils/cn";

type AppHeaderProps = {
  title: string;
  exitHref?: string;
  onExit?: () => void;
  onSave?: () => void;
  saveLabel?: string;
  saveFormId?: string;
  className?: string;
};

export function AppHeader({
  title,
  exitHref = "/month",
  onExit,
  onSave,
  saveLabel = "Save",
  saveFormId,
  className,
}: AppHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between px-4 py-3 text-xs font-medium uppercase tracking-widest",
        className,
      )}
    >
      {onExit ? (
        <button type="button" onClick={onExit} className="text-text-primary hover:text-accent">
          Exit
        </button>
      ) : (
        <Link href={exitHref} className="text-text-primary hover:text-accent">
          Exit
        </Link>
      )}
      <h1 className="text-sm font-bold text-text-secondary">{title}</h1>
      {saveFormId ? (
        <button
          type="submit"
          form={saveFormId}
          className="text-text-primary hover:text-accent"
        >
          {saveLabel}
        </button>
      ) : onSave ? (
        <button type="button" onClick={onSave} className="text-text-primary hover:text-accent">
          {saveLabel}
        </button>
      ) : (
        <span className="text-text-primary">{saveLabel}</span>
      )}
    </header>
  );
}
