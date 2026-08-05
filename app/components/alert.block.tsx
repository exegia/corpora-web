import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type * as React from "react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const variantIcons = {
  error: CircleAlertIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
} as const;

export interface AlertBlockProps {
  variant: keyof typeof variantIcons;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode[] | React.ReactNode;
  className?: string;
}

export default function AlertBlock({
  variant,
  title,
  description,
  actions,
  className,
}: AlertBlockProps): React.ReactElement {
  const Icon = variantIcons[variant];
  return (
    <Alert variant={variant} className={className}>
      <Icon />
      <AlertTitle className="capitalize">{title}</AlertTitle>
      {description ? <AlertDescription className="text-primary">{description}</AlertDescription> : null}
      {actions ? Array.isArray(actions) ? actions.map((action, index) => <AlertAction key={index}>{action}</AlertAction>) : <AlertAction>{actions}</AlertAction> : null}
    </Alert>
  );
}
