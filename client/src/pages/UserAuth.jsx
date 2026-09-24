import "./UserAuth.css";

import { useState } from "react";
import {
  GoogleLogin
} from "@react-oauth/google";

import {
  Link,
  useLocation,
  useNavigate
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  loginWithGoogle,
  loginUser,
  requestPasswordOtp,
  registerUser,
  resetUserPassword,
  verifyPasswordOtp,
  requestRegistrationOtp,
  verifyRegistrationOtp
} from "../utils/auth";

import logo from "../assets/logo.png";

const emptyForm = {
  name: "",
  identifier: "",
  email: "",
  phone: "",
  otp: "",
  password: "",
  confirmPassword: ""
};

function getAuthErrorMessage(error) {
  const message =
    error?.message || "Authentication failed";

  const normalized =
    message.toLowerCase();

  if (normalized.includes("invalid otp")) {
    return "Invalid OTP";
  }

  if (
    normalized.includes("invalid credentials") ||
    normalized.includes("invalid email") ||
    normalized.includes("invalid phone") ||
    normalized.includes("incorrect password")
  ) {
    return "Invalid credentials";
  }

  if (
    normalized.includes("email") &&
    (
      normalized.includes("exists") ||
      normalized.includes("already")
    )
  ) {
    return "Email already exists";
  }

  if (
    (
      normalized.includes("phone") ||
      normalized.includes("mobile")
    ) &&
    (
      normalized.includes("exists") ||
      normalized.includes("already")
    )
  ) {
    return "Phone number already exists";
  }

  return message;
}

function UserAuth() {

  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] =
    useState("login");

  const [form, setForm] =
    useState(emptyForm);

  const [isLoading, setIsLoading] =
    useState(false);

  const [isGoogleLoading, setIsGoogleLoading] =
    useState(false);

  const [resetStep, setResetStep] =
    useState(1);

  const [signupStep, setSignupStep] =
    useState(1);

  const redirectTo =
    new URLSearchParams(location.search)
      .get("next") || "/";

  function updateField(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value
    });
  }

  function setAuthMode(nextMode) {
    setMode(nextMode);
    setIsLoading(false);
    setIsGoogleLoading(false);
    setResetStep(1);
    setSignupStep(1);
    setForm(emptyForm);
  }

  async function handleRequestSignupOtp(e) {
    e.preventDefault();

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.password
    ) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);
      await requestRegistrationOtp({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password
      });

      toast.success("OTP sent successfully");
      setSignupStep(2);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifySignupOtp(e) {
    e.preventDefault();

    if (!/^\d{6}$/.test(form.otp.trim())) {
      toast.error("Invalid OTP");
      return;
    }

    try {
      setIsLoading(true);

      await verifyRegistrationOtp({
        email: form.email.trim(),
        otp: form.otp.trim()
      });

      toast.success("Account created successfully");
      navigate(redirectTo);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();

    try {
      setIsLoading(true);
      await loginUser({
        email: form.identifier.trim(),
        password: form.password
      });

      toast.success("Login successful");
      navigate(redirectTo);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRequestOtp(e) {
    e.preventDefault();

    if (!form.email.trim()) {
      toast.error("Enter your email address.");
      return;
    }

    try {
      setIsLoading(true);

      await requestPasswordOtp(
        form.email.trim()
      );

      toast.success("OTP sent successfully");
      setResetStep(2);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault();

    if (!/^\d{6}$/.test(form.otp.trim())) {
      toast.error("Invalid OTP");
      return;
    }

    try {
      setIsLoading(true);

      await verifyPasswordOtp({
        email: form.email.trim(),
        otp: form.otp.trim()
      });

      toast.success("OTP verified successfully");
      setResetStep(3);
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();

    if (!form.password || form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setIsLoading(true);

      await resetUserPassword({
        email: form.email.trim(),
        otp: form.otp.trim(),
        password: form.password
      });

      toast.success("Password reset successfully");
      setMode("login");
      setResetStep(1);
      setForm({
        ...emptyForm,
        email: form.email
      });
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSuccess(response) {

    if (!response.credential) {
      toast.error("Google did not return a sign-in credential.");
      return;
    }

    try {
      setIsGoogleLoading(true);

      await loginWithGoogle(response.credential);

      toast.success("Login successful");
      navigate(redirectTo);
    } catch (error) {
      toast.error(
        getAuthErrorMessage(error) || "Google authentication failed."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  }

  function handleGoogleFailure() {
    toast.error("Google sign-in was cancelled or failed.");
  }

  const isSignup =
    mode === "signup";

  const isReset =
    mode === "reset";

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">

          <Link
            to="/"
            className="auth-brand-link"
          >
            <img
              src={logo}
              alt="Haroon Stores logo"
            />
            <span>
              Haroon Stores
            </span>
          </Link>

          <p>
            Secure customer account
          </p>

        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() =>
              setAuthMode("login")
            }
          >
            Login
          </button>
          <button
            type="button"
            className={isSignup ? "active" : ""}
            onClick={() =>
              setAuthMode("signup")
            }
          >
            Sign Up
          </button>
        </div>

        <form
          className="auth-form"
          onSubmit={
            isSignup
              ? signupStep === 1
                ? handleRequestSignupOtp
                : handleVerifySignupOtp
              : isReset
                ? resetStep === 1
                  ? handleRequestOtp
                  : resetStep === 2
                    ? handleVerifyOtp
                    : handleReset
                : handleLogin
          }
        >
          <h1>
            {isSignup && "Create Account"}
            {mode === "login" && "Welcome Back"}
            {isReset && "Reset Password"}
          </h1>

          <p className="auth-intro">
            {isSignup
              ? signupStep === 1
                ? "Use your email and mobile number for order updates."
                : "Enter the 6-digit OTP sent to your email."
              : isReset
                ? resetStep === 1
                  ? "Enter your email to receive a password reset OTP."
                  : resetStep === 2
                    ? "Enter the 6-digit OTP sent to your email."
                    : "Create a new password for your account."
                : "Login to continue checkout and view your orders."}
          </p>

          {isSignup && signupStep === 1 && (
            <label>
              Full Name
              <input
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={updateField}
              />
            </label>
          )}

          {mode === "login" ? (
            <label>
              Email
              <input
                type="email"
                name="identifier"
                placeholder="Enter email"
                value={form.identifier}
                onChange={updateField}
                disabled={isLoading}
              />
            </label>
          ) : (
            <label>
              Email Address
              <input
                type="email"
                name="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={updateField}
                disabled={isLoading || (isReset && resetStep > 1) || (isSignup && signupStep > 1)}
              />
            </label>
          )}

          {!isReset && isSignup && signupStep === 1 && (
            <label>
            Phone Number
              <input
                type="tel"
                name="phone"
                placeholder="10 digit mobile number"
                value={form.phone}
                onChange={updateField}
                disabled={isLoading}
              />
            </label>
          )}

          {!isReset && (mode === "login" || (isSignup && signupStep === 1)) && (
            <label>
              Password
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                value={form.password}
                onChange={updateField}
                disabled={isLoading}
              />
            </label>
          )}

          {((isReset && resetStep === 2) || (isSignup && signupStep === 2)) && (
            <label>
              OTP
              <input
                type="text"
                name="otp"
                inputMode="numeric"
                maxLength="6"
                placeholder="Enter 6-digit OTP"
                value={form.otp}
                onChange={updateField}
                disabled={isLoading}
              />
            </label>
          )}

          {isReset && resetStep === 3 && (
            <>
              <label>
                New Password
                <input
                  type="password"
                  name="password"
                  placeholder="Create new password"
                  value={form.password}
                  onChange={updateField}
                  disabled={isLoading}
                />
              </label>

              <label>
                Confirm Password
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm new password"
                  value={form.confirmPassword}
                  onChange={updateField}
                  disabled={isLoading}
                />
              </label>
            </>
          )}

          {isSignup && signupStep === 1 && (
            <label>
              Confirm Password
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm password"
                value={form.confirmPassword}
                onChange={updateField}
                disabled={isLoading}
              />
            </label>
          )}

          {!isReset && (mode === "login" || (isSignup && signupStep === 1)) && (
            <div className="auth-divider">
              <span>
                OR
              </span>
            </div>
          )}

          {!isReset && (mode === "login" || (isSignup && signupStep === 1)) && (
            <div
              className={`auth-google${isGoogleLoading ? " is-loading" : ""}`}
              aria-label="Continue with Google"
              aria-busy={isGoogleLoading}
            >
              <span
                className="auth-google-face"
                aria-hidden="true"
              >
                {isGoogleLoading ? (
                  <span className="auth-google-spinner" />
                ) : (
                  <svg
                    className="auth-google-icon"
                    viewBox="0 0 24 24"
                    focusable="false"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
                    />
                  </svg>
                )}
                <span>
                  {isGoogleLoading
                    ? "Signing in..."
                    : "Continue with Google"}
                </span>
              </span>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleFailure}
                text={isSignup ? "signup_with" : "continue_with"}
                theme="outline"
                size="large"
                shape="pill"
                logo_alignment="left"
                width={400}
              />
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={isLoading}
          >
            {isLoading
              ? "Please wait..."
              : (
                <>
                  {isSignup && signupStep === 1 && "Send OTP"}
                  {isSignup && signupStep === 2 && "Verify & Register"}
                  {mode === "login" && "Login"}
                  {isReset && resetStep === 1 && "Send OTP"}
                  {isReset && resetStep === 2 && "Verify OTP"}
                  {isReset && resetStep === 3 && "Update Password"}
                </>
              )}
          </button>

          {mode === "login" && (
            <button
              type="button"
              className="auth-link-btn"
              disabled={isLoading}
              onClick={() =>
                setAuthMode("reset")
              }
            >
              Forgot password?
            </button>
          )}

          {isReset && (
            <button
              type="button"
              className="auth-link-btn"
              disabled={isLoading}
              onClick={() =>
                setAuthMode("login")
              }
            >
              Back to login
            </button>
          )}
        </form>
      </div>
    </div>
  );

}

export default UserAuth;
