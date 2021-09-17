import classNames from "classnames";
import Link from "next/link";
import {AnchorHTMLAttributes, ButtonHTMLAttributes, ForwardedRef, forwardRef, HTMLAttributes, ReactElement} from "react";
import css from "./button.module.css";

interface LinkAttributes<T> extends AnchorHTMLAttributes<T> {
  href: string;
  prefetch?: boolean;
}

export const Button = forwardRef(function Button(
  {className, ...props}: LinkAttributes<HTMLAnchorElement> | ButtonHTMLAttributes<HTMLButtonElement>,
  ref: ForwardedRef<HTMLAnchorElement> | ForwardedRef<HTMLButtonElement>,
): ReactElement {

  const classes = classNames(className, {
    [css.base]: true,
  });

  if ("href" in props) {
    const {href, prefetch, ...linkProps} = props;
    ref = ref as ForwardedRef<HTMLAnchorElement>;
    return (
      <Link href={href} prefetch={prefetch}>
        <a rel="noreferrer" ref={ref} className={classes} role="button" {...linkProps} />
      </Link>
    );
  } else {
    ref = ref as ForwardedRef<HTMLButtonElement>;
    return (
      <button type="button" ref={ref} className={classes} {...props} />
    );
  }
});

export function Toolbar({className, children, ...props}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={classNames(className, css.toolbar)} role="toolbar" {...props}>
      {children}
    </div>
  );
}
