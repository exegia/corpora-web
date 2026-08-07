import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
} from "lucide-react";
import type * as React from "react";
import type { AlertBlockProps, AlertVariant } from "@/components/blocks/types";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

const variantIcons: Record<AlertVariant, React.ComponentType<{ className?: string }>> = {
  error: CircleAlertIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
};

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
