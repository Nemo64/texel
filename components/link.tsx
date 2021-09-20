import NextLink from "next/link";
import {AnchorHTMLAttributes, ForwardedRef, forwardRef} from "react";

// <a href> buttons extensions
interface LinkAttributes extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string | undefined;
  prefetch?: boolean;
}

export const Link = forwardRef(function Link(
  {href, prefetch, ...props}: LinkAttributes,
  ref: ForwardedRef<HTMLAnchorElement>,
) {
  if (!href?.startsWith('/')) {
    return (
      <a rel="noreferrer" ref={ref} href={href} target="_blank" {...props}/>
    );
  }

  return (
    <NextLink href={href} prefetch={prefetch ? undefined : false}>
      <a rel="noreferrer" ref={ref} {...props}/>
    </NextLink>
  );
});
