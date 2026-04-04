"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { TwoFactorState } from "@/lib/security/two-factor";

type TwoFactorEnrollmentCardProps = {
  initialState: TwoFactorState;
};

type EnrollmentState = TwoFactorState & {
  isLoading: boolean;
  isVerifying: boolean;
  verificationCode: string;
  error: string;
  success: string;
};

function formatEnrollmentDate(value: string | null): string {
  if (!value) {
    return "Just now";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return "Recently";
  }

  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function TwoFactorEnrollmentCard({ initialState }: TwoFactorEnrollmentCardProps) {
  const router = useRouter();
  const [state, setState] = useState<EnrollmentState>({
    ...initialState,
    isLoading: false,
    isVerifying: false,
    verificationCode: "",
    error: "",
    success: ""
  });

  async function startEnrollment() {
    setState((current) => ({
      ...current,
      isLoading: true,
      error: "",
      success: ""
    }));

    const response = await fetch("/api/security/2fa/enroll", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      twoFactor?: Partial<TwoFactorState>;
    };

    if (!response.ok || !payload.twoFactor) {
      setState((current) => ({
        ...current,
        isLoading: false,
        error: payload.error ?? "Could not start 2FA setup.",
        success: ""
      }));
      return;
    }

    setState((current) => ({
      ...current,
      ...payload.twoFactor,
      isLoading: false,
      isVerifying: false,
      verificationCode: "",
      error: "",
      success: "Scan the QR code, then enter the latest 6-digit code to finish setup."
    }));
  }

  async function verifyEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState((current) => ({
      ...current,
      isVerifying: true,
      error: "",
      success: ""
    }));

    const response = await fetch("/api/security/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: state.verificationCode })
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      twoFactor?: Partial<TwoFactorState>;
    };

    if (!response.ok || !payload.twoFactor) {
      setState((current) => ({
        ...current,
        isVerifying: false,
        error: payload.error ?? "Could not verify the authenticator code.",
        success: ""
      }));
      return;
    }

    setState((current) => ({
      ...current,
      ...payload.twoFactor,
      pendingSecret: null,
      pendingQrCodeDataUrl: null,
      pendingOtpAuthUri: null,
      pendingStartedAt: null,
      isLoading: false,
      isVerifying: false,
      verificationCode: "",
      error: "",
      success: "Two-factor authentication is enabled."
    }));
    router.refresh();
  }

  if (state.isEnabled) {
    return (
      <div className="two-factor-card" data-testid="security-2fa-card-enabled">
        <div className="two-factor-summary">
          <div>
            <span className="settings-label">Authenticator app</span>
            <strong data-testid="security-2fa-enabled-label">Enabled</strong>
            <p className="auth-subtitle">Your account now requires a time-based authenticator code during login.</p>
          </div>
          <div className="two-factor-summary-meta">
            <span data-testid="security-2fa-masked-secret">{state.maskedSecret}</span>
            <span data-testid="security-2fa-enabled-at">Enrolled {formatEnrollmentDate(state.enrolledAt)}</span>
          </div>
        </div>
        {state.success ? (
          <p role="status" className="auth-success" data-testid="security-2fa-success">
            {state.success}
          </p>
        ) : null}
      </div>
    );
  }

  const hasPendingSetup = Boolean(state.pendingQrCodeDataUrl && state.pendingSecret);

  return (
    <div className="two-factor-card" data-testid="security-2fa-card-pending">
      <p className="security-placeholder-copy">
        Set up an authenticator app now. Enforcement on login lands in the next slice, but enrollment is live here.
      </p>

      {!hasPendingSetup ? (
        <button
          type="button"
          className="dashboard-note-save"
          data-testid="security-2fa-start"
          onClick={startEnrollment}
          disabled={state.isLoading}
        >
          {state.isLoading ? "Preparing QR code..." : "Set up authenticator app"}
        </button>
      ) : null}

      {hasPendingSetup ? (
        <div className="two-factor-setup-grid" data-testid="security-2fa-setup-panel">
          <div className="two-factor-qr-panel">
            {state.pendingQrCodeDataUrl ? (
              <img
                src={state.pendingQrCodeDataUrl}
                alt="Two-factor authenticator QR code"
                width={220}
                height={220}
                data-testid="security-2fa-qr"
              />
            ) : null}
            <p className="dashboard-note-limit">Scan with Google Authenticator, 1Password, or another TOTP app.</p>
          </div>
          <form className="auth-form two-factor-verify-form" onSubmit={verifyEnrollment}>
            <div className="two-factor-secret-box" data-testid="security-2fa-secret-box">
              <span className="settings-label">Manual setup key</span>
              <code data-testid="security-2fa-secret">{state.pendingSecret}</code>
            </div>
            <label htmlFor="verificationCode">
              Verification code
              <input
                id="verificationCode"
                name="verificationCode"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                data-testid="security-2fa-code-input"
                value={state.verificationCode}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    verificationCode: event.target.value.replace(/\D+/g, "").slice(0, 6)
                  }))
                }
              />
            </label>
            <button
              type="submit"
              data-testid="security-2fa-verify"
              disabled={state.isVerifying || state.verificationCode.length !== 6}
            >
              {state.isVerifying ? "Verifying..." : "Verify and enable"}
            </button>
          </form>
        </div>
      ) : null}

      {state.error ? (
        <p role="alert" className="auth-error" data-testid="security-2fa-error">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="auth-success" data-testid="security-2fa-success">
          {state.success}
        </p>
      ) : null}
    </div>
  );
}
