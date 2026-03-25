import React from "react";
import { cn } from "@/lib/utils";

type PageShellProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Responsive content wrapper to keep pages centered and readable
 * on large screens while respecting mobile padding.
 */
const PageShell = ({ children, className }: PageShellProps) => {
  return <div className={cn("app-shell", className)}>{children}</div>;
};

export default PageShell;
