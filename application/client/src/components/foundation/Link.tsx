import { ComponentPropsWithRef, forwardRef } from "react";
import { Link as RouterLink } from "react-router";

type Props = ComponentPropsWithRef<typeof RouterLink>;

export const Link = forwardRef<HTMLAnchorElement, Props>((props, ref) => {
  return <RouterLink ref={ref} {...props} />;
});

Link.displayName = "Link";
