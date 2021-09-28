import classNames from "classnames";
import {ButtonHTMLAttributes, ForwardedRef, forwardRef, HTMLAttributes, MouseEvent, ReactElement, useState} from "react";
import css from "./button.module.css";
import {Link, LinkProps} from "./link";

// <a href> buttons extensions
export interface LinkAttributes extends LinkProps {
  href: string; // enforce href for identification

  onClick?: (e: MouseEvent<HTMLAnchorElement>) => Promise<void> | void,
  disabled?: boolean; // fixates disabled style
  active?: boolean; // fixates hover style
}

// <button> buttons extensions
export interface ButtonAttributes extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void,
  disabled?: boolean; // fixates disabled attribute and style
  active?: boolean; // fixates hover style
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
  {onClick, disabled, active, className, ...props}: LinkAttributes | ButtonAttributes,
  ref: ForwardedRef<HTMLAnchorElement> | ForwardedRef<HTMLButtonElement>,
): ReactElement {

  const [tmpDisabled, setTmpDisabled] = useState(false);
  const isDisabled = disabled || tmpDisabled;

  // if onClick returns a promise, then disable the button until the promise resolves
  if (onClick !== undefined) {
    const originalClickHandler = onClick;
    onClick = (event: any) => {
      const promise = originalClickHandler(event);
      if (promise && "finally" in promise) {
        setTmpDisabled(true);
        promise.finally(() => {
          setTmpDisabled(false);
        });
      }
    };
  }

  const classes = classNames(css.base, className, {
    [css.active]: active,
    [css.disabled]: isDisabled,
  });

  if ("href" in props) {
    return (
      <Link {...props}
            role={props.role ?? "button"}
            ref={ref as ForwardedRef<HTMLAnchorElement>}
            prefetch={props.prefetch ?? !isDisabled}
            href={isDisabled ? undefined : props.href}
            onClick={isDisabled ? undefined : onClick as (e: MouseEvent<HTMLAnchorElement>) => void}
            className={classes}
            aria-disabled={isDisabled ? true : undefined}/>
    );
  } else {
    return (
      <button {...props}
              type={props.type ?? "button"}
              ref={ref as ForwardedRef<HTMLButtonElement>}
              onClick={isDisabled ? undefined : onClick as (e: MouseEvent<HTMLButtonElement>) => void}
              className={classes}
              disabled={isDisabled ? true : undefined}/>
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
