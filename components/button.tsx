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

export const Button = forwardRef(function Button(
  {onClick, className, ...props}: LinkAttributes | ButtonAttributes,
  ref: ForwardedRef<HTMLAnchorElement> | ForwardedRef<HTMLButtonElement>,
): ReactElement {

  // if onClick returns a promise, then disable the button until the promise resolves
  const [tmpDisabled, setTmpDisabled] = useState(false);
  const disabled = props.disabled || tmpDisabled;
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

  className = classNames({
    [css.base]: true,
    [css.disabled]: disabled,
  }, className);

  if ("href" in props) {
    ref = ref as ForwardedRef<HTMLAnchorElement>;
    return (
      <Link role="button" ref={ref}
            {...props}
            prefetch={props.prefetch ?? (!disabled || undefined)}
            onClick={disabled ? undefined : onClick as (e: MouseEvent<HTMLAnchorElement>) => void}
            className={className} aria-disabled={disabled || undefined}/>
    );
  } else {
    ref = ref as ForwardedRef<HTMLButtonElement>;
    return (
      <button type="button" ref={ref}
              {...props}
              onClick={disabled ? undefined : onClick as (e: MouseEvent<HTMLButtonElement>) => void}
              className={className} disabled={disabled || undefined}/>
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
