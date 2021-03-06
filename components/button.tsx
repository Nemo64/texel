import classNames from "classnames";
import {ButtonHTMLAttributes, ForwardedRef, forwardRef, HTMLAttributes, MouseEvent, ReactElement, useState} from "react";
import css from "./button.module.css";
import {Link, LinkProps} from "./link";

type Variants = "primary" | "secondary";

// <a href> buttons extensions
export interface LinkAttributes extends LinkProps {
  href: string; // enforce href for identification

  onClick?: (e: MouseEvent<HTMLAnchorElement>) => Promise<void> | void,
  disabled?: boolean; // fixates disabled style
  active?: boolean; // fixates hover style
  flat?: boolean; // removes margins
  variant?: Variants;
}

// <button> buttons extensions
export interface ButtonAttributes extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void,
  disabled?: boolean; // fixates disabled attribute and style
  active?: boolean; // fixates hover style
  flat?: boolean; // removes margins
  variant?: Variants;
}

/**
 * This abstracts the html away from the concept of a "button".
 *
 * - <Button href="https://www.example.com">Link Text</Button>
 * - <Button href="/local/page">Link text</Button>
 * - <Button onClick={() => alert("hi")}>Button text</Button>
 * - <Button type="submit">Submit text</Button>
 *
 * All those 4 example create fairly different html but look and feel the same.
 * Also, onClick handlers, that return a promise, will disable the button until it resolves.
 *
 * Don't use this for inline links, use {@see Link} instead.
 */
export const Button = forwardRef(function Button(
  {onClick, disabled, active, flat, className, variant, ...props}: LinkAttributes | ButtonAttributes,
  ref: ForwardedRef<HTMLAnchorElement> | ForwardedRef<HTMLButtonElement>,
): ReactElement {

  const [busy, setBusy] = useState(false);
  const disabledOrBusy = disabled || busy;

  // if onClick returns a promise, then disable the button until the promise resolves
  if (onClick !== undefined) {
    const originalClickHandler = onClick;
    onClick = (event: any) => {
      const promise = originalClickHandler(event);
      if (promise && "finally" in promise) {
        setBusy(true);
        promise.finally(() => {
          setBusy(false);
        });
      }
    };
  }

  const classes = classNames({
    [css.base]: true,
    [css.active]: active,
    [css.disabled]: disabledOrBusy,
    [css.flat]: flat,
    [css.secondary]: variant === 'secondary',
  }, className);

  if ("href" in props) {
    return (
      <Link {...props}
            role={props.role ?? "button"}
            ref={ref as ForwardedRef<HTMLAnchorElement>}
            prefetch={props.prefetch ?? !disabledOrBusy}
            href={disabledOrBusy ? undefined : props.href}
            onClick={disabledOrBusy ? undefined : onClick as (e: MouseEvent<HTMLAnchorElement>) => void}
            className={classes}
            aria-busy={busy ? true : undefined}
            aria-disabled={disabledOrBusy ? true : undefined}/>
    );
  } else {
    return (
      <button {...props}
              type={props.type ?? "button"}
              ref={ref as ForwardedRef<HTMLButtonElement>}
              onClick={disabledOrBusy ? undefined : onClick as (e: MouseEvent<HTMLButtonElement>) => void}
              className={classes}
              aria-busy={busy ? true : undefined}
              disabled={disabledOrBusy ? true : undefined}/>
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
