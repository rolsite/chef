import React, { memo } from 'react';
import { classNames } from '~/utils/classNames';

export const PanelHeaderButton = memo(function PanelHeaderButton({
  className,
  disabledClassName,
  disabled = false,
  children,
  onClick,
}: React.PropsWithChildren<{
  className?: string;
  disabledClassName?: string;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}>) {
  return (
    <button
      className={classNames(
        'flex items-center shrink-0 gap-1.5 px-1.5 rounded-md py-0.5 text-content-secondary bg-transparent enabled:hover:text-bolt-elements-item-contentActive enabled:hover:bg-bolt-elements-item-backgroundActive disabled:cursor-not-allowed',
        {
          [classNames('opacity-30', disabledClassName)]: disabled,
        },
        className,
      )}
      disabled={disabled}
      onClick={(event) => {
        if (disabled) {
          return;
        }

        onClick?.(event);
      }}
    >
      {children}
    </button>
  );
});
