"use client";

import { ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "punch";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

const variantStyles: Record<ButtonVariant, { bg: string; color: string; border?: string; shadow?: string }> = {
  primary: {
    bg: "var(--accent)",
    color: "var(--accent-ink)",
    border: "1px solid var(--accent)",
    shadow: "0 2px 0 #b33917",
  },
  secondary: {
    bg: "var(--bg-elevated)",
    color: "var(--text-primary)",
    border: "1px solid var(--border-default)",
    shadow: "0 1px 0 var(--border-strong)",
  },
  ghost: {
    bg: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-default)",
  },
  danger: {
    bg: "transparent",
    color: "var(--danger)",
    border: "1px solid var(--danger)",
  },
  punch: {
    bg: "var(--accent)",
    color: "var(--accent-ink)",
    border: "2px dashed var(--accent-ink)",
    shadow: "0 3px 0 #942b0f",
  },
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs font-semibold gap-1.5",
  md: "px-4 py-2 text-sm font-bold gap-2",
  lg: "px-6 py-3 text-base font-bold gap-2.5",
};

/**
 * Archetype Z · Card stack tactile button.
 * Emulates physical card-stock pressable loyalty buttons with punch indicators and distinct stamp styling.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      children,
      className = "",
      style,
      ...rest
    },
    ref,
  ) => {
    const config = variantStyles[variant] || variantStyles.primary;
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`relative inline-flex items-center justify-center font-heading select-none transition-all active:translate-y-0.5 disabled:opacity-45 disabled:pointer-events-none disabled:transform-none cursor-pointer rounded-lg ${sizeClasses[size]} ${className}`}
        style={{
          backgroundColor: config.bg,
          color: config.color,
          border: config.border,
          boxShadow: isDisabled ? "none" : config.shadow,
          ...style,
        }}
        {...rest}
      >
        {loading ? (
          <span
            className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin"
            aria-hidden="true"
          />
        ) : (
          leftIcon
        )}
        <span className="truncate">{children}</span>
        {!loading && rightIcon}
      </button>
    );
  },
);

Button.displayName = "PunchcardButton";
export default Button;
