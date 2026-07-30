import { Button as CorporaButton, type ButtonProps } from "@exegia/corpora-ui";

export { buttonVariants } from "@exegia/corpora-ui";
export type { ButtonProps };

// The app opts into cuelume pointer feedback on every button (see lib/sounds.ts),
// so `sound` defaults on here rather than per call site.
export function Button({ sound = true, ...props }: ButtonProps) {
  return <CorporaButton sound={sound} {...props} />;
}
