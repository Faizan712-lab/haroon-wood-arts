import "./UserSettings.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  confirmAuthenticatedPasswordChange,
  getActiveUserSession,
  logoutUser,
  requestPasswordOtp,
  requestAuthenticatedPasswordChange,
  resetUserPassword,
  updateUserAccount,
  verifyPasswordOtp
} from "../utils/auth";
import {
  FaArrowLeft,
  FaSignOutAlt
} from "react-icons/fa";

export default function UserSettings() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
  const [step, setStep] = useState("details");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getActiveUserSession().then(user => {
      setSession(user);
      setProfile({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
    });
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const user = await updateUserAccount(profile);
      setSession(user);
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function requestOtp(event) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error("New passwords do not match");
    }
    setSaving(true);
    try {
      await requestAuthenticatedPasswordChange({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword
      });
      setStep("verify");
      toast.success("Verification code sent to your email");
    } catch (error) {
      toast.error(error.message || "Unable to send verification code");
    } finally {
      setSaving(false);
    }
  }

  async function confirmOtp(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await confirmAuthenticatedPasswordChange({
        otp: passwords.otp,
        newPassword: passwords.newPassword
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setStep("details");
      toast.success("Password changed successfully");
    } catch (error) {
      toast.error(error.message || "Unable to change password");
    } finally {
      setSaving(false);
    }
  }

  async function startForgotPassword() {
    if (!session?.email) {
      toast.error("Your account email is unavailable. Please sign in again.");
      return;
    }

    setSaving(true);
    try {
      await requestPasswordOtp(session.email);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setStep("forgotVerify");
      toast.success("Verification code sent to your email");
    } catch (error) {
      toast.error(error.message || "Unable to send verification code");
    } finally {
      setSaving(false);
    }
  }

  async function verifyForgotOtp(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await verifyPasswordOtp({ email: session?.email || "", otp: passwords.otp });
      setStep("forgotReset");
      toast.success("OTP verified successfully");
    } catch (error) {
      toast.error(error.message || "Invalid or expired OTP");
    } finally {
      setSaving(false);
    }
  }

  async function resetForgotPassword(event) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setSaving(true);
    try {
      await resetUserPassword({
        email: session?.email || "",
        otp: passwords.otp,
        password: passwords.newPassword
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setStep("details");
      toast.success("Password reset successfully");
    } catch (error) {
      toast.error(error.message || "Unable to reset password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="user-settings-page">
      <div className="user-settings-container">
        <button
          className="settings-back"
          type="button"
          onClick={() => navigate("/profile")}
        >
          <FaArrowLeft aria-hidden="true" />
          <span>Back to Profile</span>
        </button>

        <section className="user-settings-card">
          <div className="settings-header">
            <h1>Settings</h1>
            <p className="settings-subtitle">
              Manage your personal preferences, credentials, and security.
            </p>
          </div>

          <form onSubmit={saveProfile} className="settings-form">
            <div className="settings-section-title">
              <h2>Profile Information</h2>
              <p>Update the name, email, or contact number associated with your account.</p>
            </div>

            <div className="settings-field-group">
              <label>
                Name
                <input
                  type="text"
                  value={profile.name}
                  onChange={e => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Your full name"
                  required
                />
              </label>

              <label>
                Email
                <input
                  type="email"
                  value={profile.email}
                  onChange={e => setProfile({ ...profile, email: e.target.value })}
                  placeholder="your.email@example.com"
                  required
                />
              </label>

              <label>
                Phone
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={e => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Phone number"
                  required
                />
              </label>
            </div>

            <button type="submit" className="settings-primary-btn" disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>

          <form
            id="security"
            onSubmit={
              step === "verify"
                ? confirmOtp
                : step === "forgotVerify"
                  ? verifyForgotOtp
                  : step === "forgotReset"
                    ? resetForgotPassword
                    : requestOtp
            }
            className="settings-form settings-security"
          >
            <div className="settings-section-title">
              <h2>
                {step === "verify" || step === "forgotVerify"
                  ? "Verify Email"
                  : step === "forgotReset"
                    ? "Set New Password"
                    : "Security"}
              </h2>
              <p>
                {step === "verify" || step === "forgotVerify"
                  ? "Enter the 6-digit confirmation code sent to your email."
                  : step === "forgotReset"
                    ? "Choose a strong password to protect your account."
                    : "Update your password to keep your account secure."}
              </p>
            </div>

            {step === "verify" ? (
              <>
                <p className="settings-instruction">
                  We sent a verification code to <strong>{session?.email}</strong>.
                </p>
                <label>
                  Verification code
                  <input
                    inputMode="numeric"
                    maxLength="6"
                    value={passwords.otp}
                    onChange={e =>
                      setPasswords({
                        ...passwords,
                        otp: e.target.value.replace(/\D/g, "")
                      })
                    }
                    placeholder="Enter 6-digit code"
                    required
                  />
                </label>
                <div className="settings-button-group">
                  <button type="submit" className="settings-primary-btn" disabled={saving}>
                    {saving ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    className="settings-secondary"
                    disabled={saving}
                    onClick={requestOtp}
                  >
                    Resend OTP
                  </button>
                </div>
              </>
            ) : step === "forgotVerify" ? (
              <>
                <p className="settings-instruction">
                  We sent a verification code to <strong>{session?.email}</strong>.
                </p>
                <label>
                  Verification code
                  <input
                    inputMode="numeric"
                    maxLength="6"
                    value={passwords.otp}
                    onChange={e =>
                      setPasswords({
                        ...passwords,
                        otp: e.target.value.replace(/\D/g, "")
                      })
                    }
                    placeholder="Enter 6-digit code"
                    required
                  />
                </label>
                <div className="settings-button-group">
                  <button type="submit" className="settings-primary-btn" disabled={saving}>
                    {saving ? "Verifying..." : "Verify OTP"}
                  </button>
                  <button
                    type="button"
                    className="settings-secondary"
                    disabled={saving}
                    onClick={startForgotPassword}
                  >
                    Resend OTP
                  </button>
                </div>
              </>
            ) : step === "forgotReset" ? (
              <>
                <p className="settings-instruction">
                  Choose a new password for your account.
                </p>
                <label>
                  New Password
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={e =>
                      setPasswords({ ...passwords, newPassword: e.target.value })
                    }
                    placeholder="At least 6 characters"
                    required
                    minLength="6"
                  />
                </label>
                <label>
                  Confirm New Password
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={e =>
                      setPasswords({ ...passwords, confirmPassword: e.target.value })
                    }
                    placeholder="Re-enter new password"
                    required
                    minLength="6"
                  />
                </label>
                <button
                  type="submit"
                  className="settings-dark-action settings-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Change Password"}
                </button>
              </>
            ) : (
              <>
                <label>
                  Current Password
                  <input
                    type="password"
                    value={passwords.currentPassword}
                    onChange={e =>
                      setPasswords({ ...passwords, currentPassword: e.target.value })
                    }
                    placeholder="Enter your current password"
                    required
                  />
                </label>
                <button
                  type="button"
                  className="settings-forgot-password"
                  onClick={startForgotPassword}
                  disabled={saving}
                >
                  Forgot Password?
                </button>
                <label>
                  New Password
                  <input
                    type="password"
                    value={passwords.newPassword}
                    onChange={e =>
                      setPasswords({ ...passwords, newPassword: e.target.value })
                    }
                    placeholder="At least 6 characters"
                    required
                    minLength="6"
                  />
                </label>
                <label>
                  Confirm New Password
                  <input
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={e =>
                      setPasswords({ ...passwords, confirmPassword: e.target.value })
                    }
                    placeholder="Re-enter new password"
                    required
                    minLength="6"
                  />
                </label>
                <button
                  type="submit"
                  className="settings-dark-action settings-primary-btn"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Change Password"}
                </button>
              </>
            )}
          </form>

          <section className="settings-account">
            <div className="settings-section-title">
              <h2>Account</h2>
              <p>Sign out of your Haroon Stores account on this device.</p>
            </div>
            <button
              type="button"
              className="settings-danger"
              onClick={async () => {
                await logoutUser();
                navigate("/");
              }}
            >
              <FaSignOutAlt aria-hidden="true" />
              <span>Logout</span>
            </button>
          </section>
        </section>
      </div>
    </main>
  );
}
