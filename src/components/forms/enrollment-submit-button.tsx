"use client";

import { useFormStatus } from "react-dom";

type EnrollmentSubmitButtonProps = {
  className: string;
  disabled?: boolean;
};

export function EnrollmentSubmitButton({
  className,
  disabled = false,
}: EnrollmentSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button className={className} disabled={disabled || pending} type="submit">
      {pending ? "Mendaftarkan..." : "Daftar & langsung diterima"}
      <span aria-hidden="true">→</span>
    </button>
  );
}
