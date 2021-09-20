import classNames from "classnames";
import {AnchorHTMLAttributes, ButtonHTMLAttributes, ForwardedRef, forwardRef, HTMLAttributes, MouseEvent, ReactElement, useState} from "react";
import css from "./button.module.css";
import {Link} from "./link";

// <a href> buttons extensions
interface LinkAttributes extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => Promise<void> | void,
  prefetch?: boolean;
  disabled?: boolean;
}

// <button> buttons extensions
interface ButtonAttributes extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: (e: MouseEvent<HTMLButtonElement>) => Promise<void> | void,
  disabled?: boolean;
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
  {onClick, className, ...props}: LinkAttributes | ButtonAttributes,
  ref: ForwardedRef<HTMLAnchorElement> | ForwardedRef<HTMLButtonElement>,
): ReactElement {

  const [tmpDisabled, setTmpDisabled] = useState(false);
  const disabled = props.disabled || tmpDisabled;

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

  if ("href" in props) {
    return (
      <Link role="button"
            ref={ref as ForwardedRef<HTMLAnchorElement>}
            {...props}
            prefetch={props.prefetch ?? !disabled}
            href={disabled ? undefined : props.href}
            onClick={disabled ? undefined : onClick as (e: MouseEvent<HTMLAnchorElement>) => void}
            className={classNames(css.base, disabled && css.disabled, className)}
            aria-disabled={disabled || undefined}/>
    );
  } else {
    return (
      <button type="button"
              ref={ref as ForwardedRef<HTMLButtonElement>}
              {...props}
              onClick={disabled ? undefined : onClick as (e: MouseEvent<HTMLButtonElement>) => void}
              className={classNames(css.base, className)}
              disabled={disabled || undefined}/>
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
