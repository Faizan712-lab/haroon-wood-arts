import "./Admin.css";

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaEnvelope, FaEye, FaEyeSlash, FaKey, FaShieldAlt, FaUserShield } from "react-icons/fa";
import toast from "react-hot-toast";

import logo from "../../assets/logo.png";
import heroImage from "../../assets/hero1.png";
import {
  getAdminRegistrationStatus,
  getActiveAdminSession,
  loginAdmin,
  registerAdmin,
  resendAdminLoginOtp,
  requestAdminForgotPasswordOtp,
  verifyAdminForgotPasswordOtp,
  verifyAdminLoginOtp,
  verifyAdminRegistration
} from "../../utils/auth";

const OTP_SECONDS = 60;
const ENDPOINTS = {
  loginOtp: "/api/admin/verify-device",
  signupOtp: "/api/admin/register/verify-otp",
  forgotOtp: "/api/admin/forgot-password/verify-otp",
  forgotPassword: "/api/admin/forgot-password/verify-otp"
};

function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTab = useMemo(() => {
    if (location.pathname === "/admin/register") return "signup";
    const tab = new URLSearchParams(location.search).get("tab");
    return tab === "signup" || tab === "forgot" ? tab : "signin";
  }, [location.pathname, location.search]);

  const [tab, setTab] = useState(initialTab);
  const [step, setStep] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fields, setFields] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    secretKey: "",
    otp: "",
    newPassword: ""
  });

  useEffect(() => {
    let active = true;
    async function checkSession() {
      const session = await getActiveAdminSession();
      if (active && session) {
        navigate("/admin/dashboard", { replace: true });
      }
    }
    checkSession();
    return () => {
      active = false;
    };
  }, [navigate]);

  useEffect(() => {
    let active = true;
    async function loadStatus() {
      try {
        const data = await getAdminRegistrationStatus();
        if (active) setRegistrationOpen(Boolean(data.registrationOpen));
      } catch {
        if (active) setRegistrationOpen(true);
      }
    }
    loadStatus();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!countdown) return undefined;
    const timer = window.setInterval(() => {
      setCountdown(current => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (step === "loginOtp" || step === "signupOtp" || step === "forgotOtp") {
      setCountdown(OTP_SECONDS);
    } else {
      setCountdown(0);
    }
  }, [step]);

  useEffect(() => {
    if (step !== "registrationSuccess") {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      resetAuthState("signin");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [step]);

  function updateField(field, value) {
    setFields(current => ({ ...current, [field]: value }));
  }

  function resetAuthState(nextTab) {
    setTab(nextTab);
    setStep("idle");
    setLoading(false);
    setCountdown(0);
    setFields({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      secretKey: "",
      otp: "",
      newPassword: ""
    });
  }

  function switchTab(nextTab) {
    resetAuthState(nextTab);
  }

  function startCountdown() {
    setCountdown(OTP_SECONDS);
  }

  function logOtpSubmit(endpoint) {
  }

  async function handleSignInSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginAdmin({
        email: fields.email.trim(),
        password: fields.password,
        secretKey: fields.secretKey
      });
      if (result?.otpRequired) {
        setStep("loginOtp");
        startCountdown();
        toast.success("OTP sent to your email.");
        return;
      }
      toast.success("Signed in successfully.");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUpSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (fields.password !== fields.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      await registerAdmin({
        name: fields.name.trim(),
        email: fields.email.trim(),
        password: fields.password,
        confirmPassword: fields.confirmPassword,
        secretKey: fields.secretKey
      });
      setStep("signupOtp");
      startCountdown();
      toast.success("OTP sent to your email.");
    } catch (error) {
      toast.error(error.message || "Admin registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyLoginOtp(e) {
    e.preventDefault();
    setLoading(true);
    logOtpSubmit(ENDPOINTS.loginOtp);
    try {
      await verifyAdminLoginOtp({
        email: fields.email.trim(),
        otp: fields.otp.trim()
      });
      toast.success("Device verified successfully.");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifySignupOtp(e) {
    e.preventDefault();
    setLoading(true);
    logOtpSubmit(ENDPOINTS.signupOtp);
    try {
      await verifyAdminRegistration({
        email: fields.email.trim(),
        otp: fields.otp.trim()
      });
      toast.success("Admin account created successfully.");
      setStep("registrationSuccess");
    } catch (error) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendForgotOtp(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestAdminForgotPasswordOtp({
        email: fields.email.trim()
      });
      setStep("forgotOtp");
      startCountdown();
      toast.success("OTP sent to your email.");
    } catch (error) {
      toast.error(error.message || "Unable to send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyForgotOtp(e) {
    e.preventDefault();
    setLoading(true);
    logOtpSubmit(ENDPOINTS.forgotOtp);
    try {
      await verifyAdminForgotPasswordOtp({
        email: fields.email.trim(),
        otp: fields.otp.trim()
      });
      setStep("forgotPassword");
      toast.success("OTP verified successfully. Please create a new password.");
    } catch (error) {
      toast.error(error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setLoading(true);
    logOtpSubmit(ENDPOINTS.forgotPassword);
    try {
      if (fields.newPassword !== fields.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      await verifyAdminForgotPasswordOtp({
        email: fields.email.trim(),
        otp: fields.otp.trim(),
        password: fields.newPassword,
        confirmPassword: fields.confirmPassword
      });
      toast.success("Password reset successfully.");
      resetAuthState("signin");
    } catch (error) {
      toast.error(error.message || "Password reset failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    try {
      if (step === "loginOtp") {
        await resendAdminLoginOtp({
          email: fields.email.trim(),
          password: fields.password,
          secretKey: fields.secretKey
        });
      } else if (step === "signupOtp") {
        await registerAdmin({
          name: fields.name.trim(),
          email: fields.email.trim(),
          password: fields.password,
          confirmPassword: fields.confirmPassword,
          secretKey: fields.secretKey
        });
      } else if (step === "forgotOtp") {
        await requestAdminForgotPasswordOtp({
          email: fields.email.trim()
        });
      }
      startCountdown();
      toast.success("OTP sent again.");
    } catch (error) {
      toast.error(error.message || "Unable to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  const otpStep = step === "loginOtp" || step === "signupOtp" || step === "forgotOtp";
  const successStep = step === "registrationSuccess";
  const submitHandler =
    step === "loginOtp"
      ? handleVerifyLoginOtp
      : step === "signupOtp"
        ? handleVerifySignupOtp
        : step === "forgotOtp"
          ? handleVerifyForgotOtp
          : step === "forgotPassword"
            ? handleResetPassword
          : tab === "signin"
            ? handleSignInSubmit
            : tab === "signup"
              ? handleSignUpSubmit
              : handleSendForgotOtp;

  return (
    <div className="admin-login">
      <div className="admin-login-shell">
        <div
          className="admin-login-hero"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(62, 39, 35, 0.72), rgba(62, 39, 35, 0.84)), url(${heroImage})`
          }}
        >
          <img src={logo} alt="Haroon Stores" className="admin-login-logo" />
          <div className="admin-hero-badge">
            <FaShieldAlt />
            Secure Admin Access
          </div>
          <h1>Haroon Stores</h1>
          <p>
            Protected admin access for trusted staff, one-time passwords,
            and account recovery.
          </p>
        </div>

        <form className="admin-box admin-auth-card" onSubmit={submitHandler}>
          <div className="admin-auth-tabs">
            <button
              type="button"
              className={tab === "signin" ? "active-admin-tab" : ""}
              onClick={() => switchTab("signin")}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              className={tab === "signup" ? "active-admin-tab" : ""}
              onClick={() => {
                if (!registrationOpen) {
                  toast.error("Maximum number of admins has been reached.");
                  return;
                }
                switchTab("signup");
              }}
              disabled={loading || !registrationOpen}
            >
              Sign Up
            </button>
            <button
              type="button"
              className={tab === "forgot" ? "active-admin-tab" : ""}
              onClick={() => switchTab("forgot")}
              disabled={loading}
            >
              Forgot Password
            </button>
          </div>

          <div className="admin-auth-header">
            <FaUserShield className="admin-auth-icon" />
            <div>
              <h2>
                {tab === "signin"
                  ? otpStep
                    ? "Verify Sign In"
                    : "Sign In"
                  : tab === "signup"
                    ? otpStep
                      ? "Verify Sign Up"
                      : "Create Admin Account"
                  : successStep
                    ? "Account Created"
                  : step === "forgotPassword"
                    ? "Create New Password"
                    : otpStep
                      ? "Reset Password"
                      : "Recover Account"}
              </h2>
              <p>
                {tab === "forgot"
                  ? "We will send a recovery OTP to your admin email."
                  : "Use the same secret key shared by the ownership team."}
              </p>
            </div>
          </div>

          {successStep && (
            <div className="admin-auth-success">
              <strong>Admin account created successfully.</strong>
              <span>You can now sign in using your email, password, and secret key.</span>
            </div>
          )}

          {step === "idle" && tab === "signin" && (
            <>
              <label className="admin-auth-field">
                <span><FaEnvelope /> Email</span>
                <input
                  type="email"
                  value={fields.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="admin@example.com"
                  required
                />
              </label>
              <label className="admin-auth-field">
                <span><FaKey /> Password</span>
                <div className="admin-secret-row">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={fields.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Enter password"
                    required
                  />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowPassword(v => !v)} disabled={loading}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
              <label className="admin-auth-field">
                <span><FaShieldAlt /> Secret Key</span>
                <div className="admin-secret-row">
                  <input
                    type={showSecret ? "text" : "password"}
                    value={fields.secretKey}
                    onChange={(e) => updateField("secretKey", e.target.value)}
                    placeholder="Enter secret key"
                    required
                  />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowSecret(v => !v)} disabled={loading}>
                    {showSecret ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
            </>
          )}

          {step === "idle" && tab === "signup" && (
            <>
              <label className="admin-auth-field">
                <span>Name</span>
                <input type="text" value={fields.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Admin name" required />
              </label>
              <label className="admin-auth-field">
                <span><FaEnvelope /> Email</span>
                <input type="email" value={fields.email} onChange={(e) => updateField("email", e.target.value)} placeholder="admin@example.com" required />
              </label>
              <label className="admin-auth-field">
                <span><FaKey /> Password</span>
                <div className="admin-secret-row">
                  <input type={showPassword ? "text" : "password"} value={fields.password} onChange={(e) => updateField("password", e.target.value)} placeholder="Create password" required />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowPassword(v => !v)} disabled={loading}>
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
              <label className="admin-auth-field">
                <span>Confirm Password</span>
                <div className="admin-secret-row">
                  <input type={showConfirmPassword ? "text" : "password"} value={fields.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="Repeat password" required />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowConfirmPassword(v => !v)} disabled={loading}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
              <label className="admin-auth-field">
                <span><FaShieldAlt /> Secret Key</span>
                <div className="admin-secret-row">
                  <input type={showSecret ? "text" : "password"} value={fields.secretKey} onChange={(e) => updateField("secretKey", e.target.value)} placeholder="Enter secret key" required />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowSecret(v => !v)} disabled={loading}>
                    {showSecret ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
            </>
          )}

          {tab === "forgot" && step === "idle" && (
            <label className="admin-auth-field">
              <span><FaEnvelope /> Email</span>
              <input type="email" value={fields.email} onChange={(e) => updateField("email", e.target.value)} placeholder="admin@example.com" required />
            </label>
          )}

          {tab === "forgot" && step === "forgotPassword" && (
            <>
              <label className="admin-auth-field">
                <span>New Password</span>
                <div className="admin-secret-row">
                  <input type={showNewPassword ? "text" : "password"} value={fields.newPassword} onChange={(e) => updateField("newPassword", e.target.value)} placeholder="New password" required />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowNewPassword(v => !v)} disabled={loading}>
                    {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
              <label className="admin-auth-field">
                <span>Confirm Password</span>
                <div className="admin-secret-row">
                  <input type={showConfirmPassword ? "text" : "password"} value={fields.confirmPassword} onChange={(e) => updateField("confirmPassword", e.target.value)} placeholder="Confirm password" required />
                  <button type="button" className="admin-ghost-btn" onClick={() => setShowConfirmPassword(v => !v)} disabled={loading}>
                    {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
            </>
          )}

          {otpStep && (
            <>
              <label className="admin-auth-field">
                <span>OTP</span>
                <input
                  className="admin-otp-input"
                  type="text"
                  inputMode="numeric"
                  maxLength="6"
                  value={fields.otp}
                  onChange={(e) => updateField("otp", e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter 6-digit OTP"
                  required
                />
              </label>
              <div className="admin-otp-row">
                <button type="button" className="admin-link-btn" onClick={handleResend} disabled={loading || countdown > 0}>
                  {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
                </button>
                <span className="admin-otp-hint">
                  Loading while we verify or resend your code.
                </span>
              </div>
            </>
          )}

          {!successStep && (
            <button type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : tab === "signin"
                  ? otpStep
                    ? "Verify OTP"
                    : "Sign In"
                : tab === "signup"
                  ? otpStep
                    ? "Create Account"
                    : "Send OTP"
                : step === "forgotPassword"
                  ? "Reset Password"
                  : otpStep
                    ? "Continue"
                    : "Send OTP"}
            </button>
          )}

          {tab !== "forgot" && !successStep && (
            <button type="button" className="admin-link-btn" onClick={() => switchTab("forgot")} disabled={loading}>
              Forgot Password?
            </button>
          )}

          <p className="admin-auth-note">
            OTP expires in 10 minutes. Trusted devices keep you signed in.
          </p>

          <p className="admin-auth-footer">
            AUTHORIZED PERSONNEL ONLY
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
