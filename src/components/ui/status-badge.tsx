import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        draft: "bg-muted text-muted-foreground",
        applied: "bg-info/10 text-info",
        interview: "bg-warning/10 text-warning",
        offer: "bg-success/10 text-success",
        rejected: "bg-destructive/10 text-destructive",
        withdrawn: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      status: "draft",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  className?: string;
  children: React.ReactNode;
}

export function StatusBadge({ status, className, children }: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {children}
    </span>
  );
}
