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
