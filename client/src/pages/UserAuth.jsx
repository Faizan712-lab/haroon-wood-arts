import "./UserAuth.css";

import { useEffect, useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaEye, FaEyeSlash } from "react-icons/fa";

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

const DESKTOP_GOOGLE_BUTTON_WIDTH = 320;
const MOBILE_GOOGLE_BUTTON_WIDTH = 250;
const NARROW_GOOGLE_BUTTON_WIDTH = 220;

function getGoogleButtonWidth() {
  if (typeof window === "undefined") {
    return DESKTOP_GOOGLE_BUTTON_WIDTH;
  }

  if (window.matchMedia("(max-width: 360px)").matches) {
    return NARROW_GOOGLE_BUTTON_WIDTH;
  }

  if (window.matchMedia("(max-width: 480px)").matches) {
    return MOBILE_GOOGLE_BUTTON_WIDTH;
  }

  return DESKTOP_GOOGLE_BUTTON_WIDTH;
}

function getAuthErrorMessage(error) {
  const message = error?.message || "Authentication failed";
  const normalized = message.toLowerCase();

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
    (normalized.includes("exists") || normalized.includes("already"))
  ) {
    return "Email already exists";
  }

  if (
    (normalized.includes("phone") || normalized.includes("mobile")) &&
    (normalized.includes("exists") || normalized.includes("already"))
  ) {
    return "Phone number already exists";
  }

  return message;
}

function UserAuth() {
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(getGoogleButtonWidth);
  const [resetStep, setResetStep] = useState(1);
  const [signupStep, setSignupStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const narrowQuery = window.matchMedia("(max-width: 360px)");
    const mobileQuery = window.matchMedia("(max-width: 480px)");

    const updateGoogleButtonWidth = () => {
      if (narrowQuery.matches) {
        setGoogleButtonWidth(NARROW_GOOGLE_BUTTON_WIDTH);
      } else if (mobileQuery.matches) {
        setGoogleButtonWidth(MOBILE_GOOGLE_BUTTON_WIDTH);
      } else {
        setGoogleButtonWidth(DESKTOP_GOOGLE_BUTTON_WIDTH);
      }
    };

    narrowQuery.addEventListener("change", updateGoogleButtonWidth);
    mobileQuery.addEventListener("change", updateGoogleButtonWidth);
    window.addEventListener("resize", updateGoogleButtonWidth);

    return () => {
      narrowQuery.removeEventListener("change", updateGoogleButtonWidth);
      mobileQuery.removeEventListener("change", updateGoogleButtonWidth);
      window.removeEventListener("resize", updateGoogleButtonWidth);
    };
  }, []);

  const redirectTo =
    new URLSearchParams(location.search).get("next") || "/";

  function updateField(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  function setAuthMode(nextMode) {
    setMode(nextMode);
    setIsLoading(false);
    setIsGoogleLoading(false);
    setResetStep(1);
    setSignupStep(1);
    setShowPassword(false);
    setShowConfirmPassword(false);
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

      await requestPasswordOtp(form.email.trim());

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

  const isSignup = mode === "signup";
  const isReset = mode === "reset";

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
        {/* Top-Center Brand Header */}
        <header className="auth-brand-header">
          <Link to="/" className="auth-brand-link" title="Return to Haroon Stores Home">
            <img src={logo} alt="Haroon Stores logo" className="auth-brand-logo" />
            <span className="auth-brand-name">Haroon Stores</span>
          </Link>
        </header>

        {/* Centered Authentication Card */}
        <div className="auth-card">
          {/* Mode Switcher Tabs */}
          {!isReset && (
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "active" : ""}
                onClick={() => setAuthMode("login")}
              >
                Login
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={isSignup}
                className={isSignup ? "active" : ""}
                onClick={() => setAuthMode("signup")}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form Header */}
          <div className="auth-form-header">
            <h1>
              {isSignup && (signupStep === 1 ? "Create Account" : "Verify Email")}
              {mode === "login" && "Welcome Back"}
              {isReset && (
                resetStep === 1
                  ? "Reset Password"
                  : resetStep === 2
                    ? "Verify OTP"
                    : "Set New Password"
              )}
            </h1>

            <p className="auth-intro">
              {isSignup
                ? signupStep === 1
                  ? "Create an account to track orders and save favourites."
                  : `Enter the 6-digit verification code sent to ${form.email}.`
                : isReset
                  ? resetStep === 1
                    ? "Enter your email address to receive a recovery code."
                    : resetStep === 2
                      ? `Enter the 6-digit code sent to ${form.email}.`
                      : "Choose a strong new password for your account."
                  : "Sign in with your email and password to continue."}
            </p>
          </div>

          {/* Form */}
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
            {/* Sign Up Step 1: Full Name */}
            {isSignup && signupStep === 1 && (
              <label className="auth-field-label">
                <span>Full Name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={updateField}
                  disabled={isLoading}
                  required
                />
              </label>
            )}

            {/* Email Field */}
            {mode === "login" ? (
              <label className="auth-field-label">
                <span>Email Address</span>
                <input
                  type="email"
                  name="identifier"
                  placeholder="name@example.com"
                  value={form.identifier}
                  onChange={updateField}
                  disabled={isLoading}
                  required
                />
              </label>
            ) : (
              <label className="auth-field-label">
                <span>Email Address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={updateField}
                  disabled={
                    isLoading ||
                    (isReset && resetStep > 1) ||
                    (isSignup && signupStep > 1)
                  }
                  required
                />
              </label>
            )}

            {/* Sign Up Step 1: Phone */}
            {!isReset && isSignup && signupStep === 1 && (
              <label className="auth-field-label">
                <span>Phone Number</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="10 digit mobile number"
                  value={form.phone}
                  onChange={updateField}
                  disabled={isLoading}
                  required
                />
              </label>
            )}

            {/* Password Field (Login & Sign Up Step 1) */}
            {!isReset && (mode === "login" || (isSignup && signupStep === 1)) && (
              <label className="auth-field-label">
                <span>Password</span>
                <div className="auth-password-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={updateField}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                  </button>
                </div>
              </label>
            )}

            {/* Sign Up Step 1: Confirm Password */}
            {isSignup && signupStep === 1 && (
              <label className="auth-field-label">
                <span>Confirm Password</span>
                <div className="auth-password-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={form.confirmPassword}
                    onChange={updateField}
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowConfirmPassword(v => !v)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                  </button>
                </div>
              </label>
            )}

            {/* OTP Field (Signup Step 2 or Reset Step 2) */}
            {((isReset && resetStep === 2) || (isSignup && signupStep === 2)) && (
              <label className="auth-field-label">
                <span>6-Digit Verification Code</span>
                <input
                  type="text"
                  name="otp"
                  inputMode="numeric"
                  maxLength="6"
                  placeholder="Enter 6-digit code"
                  value={form.otp}
                  onChange={e => {
                    const clean = e.target.value.replace(/\D/g, "");
                    setForm({ ...form, otp: clean });
                  }}
                  disabled={isLoading}
                  required
                />
              </label>
            )}

            {/* Reset Step 3: New & Confirm Password */}
            {isReset && resetStep === 3 && (
              <>
                <label className="auth-field-label">
                  <span>New Password</span>
                  <div className="auth-password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={updateField}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                    </button>
                  </div>
                </label>

                <label className="auth-field-label">
                  <span>Confirm New Password</span>
                  <div className="auth-password-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      placeholder="Confirm new password"
                      value={form.confirmPassword}
                      onChange={updateField}
                      disabled={isLoading}
                      required
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
                    </button>
                  </div>
                </label>
              </>
            )}

            {/* Forgot Password Link (Login mode) */}
            {mode === "login" && (
              <button
                type="button"
                className="auth-forgot-link"
                disabled={isLoading}
                onClick={() => setAuthMode("reset")}
              >
                Forgot password?
              </button>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              className="auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                "Please wait..."
              ) : (
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

            {/* Step 2 Back action for Signup */}
            {isSignup && signupStep === 2 && (
              <button
                type="button"
                className="auth-link-btn"
                disabled={isLoading}
                onClick={() => setSignupStep(1)}
              >
                Change details / Back
              </button>
            )}

            {/* Google OAuth & Divider */}
            {!isReset && (mode === "login" || (isSignup && signupStep === 1)) && (
              <>
                <div className="auth-divider">
                  <span>OR</span>
                </div>

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
                    width={googleButtonWidth}
                  />
                </div>
              </>
            )}

            {/* Reset navigation buttons */}
            {isReset && (
              <button
                type="button"
                className="auth-link-btn"
                disabled={isLoading}
                onClick={() => setAuthMode("login")}
              >
                Back to login
              </button>
            )}

            {/* Mode switch footer text */}
            {mode === "login" && (
              <p className="auth-switch-prompt">
                Don't have an account?{" "}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => setAuthMode("signup")}
                >
                  Sign Up
                </button>
              </p>
            )}

            {isSignup && signupStep === 1 && (
              <p className="auth-switch-prompt">
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-switch-link"
                  onClick={() => setAuthMode("login")}
                >
                  Login
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserAuth;
