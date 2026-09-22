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
    } catch (error) { toast.error(error.message || "Failed to update profile"); }
    finally { setSaving(false); }
  }

  async function requestOtp(event) {
    event.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) return toast.error("New passwords do not match");
    setSaving(true);
    try {
      await requestAuthenticatedPasswordChange({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      setStep("verify");
      toast.success("Verification code sent to your email");
    } catch (error) { toast.error(error.message || "Unable to send verification code"); }
    finally { setSaving(false); }
  }

  async function confirmOtp(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await confirmAuthenticatedPasswordChange({ otp: passwords.otp, newPassword: passwords.newPassword });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "", otp: "" });
      setStep("details");
      toast.success("Password changed successfully");
    } catch (error) { toast.error(error.message || "Unable to change password"); }
    finally { setSaving(false); }
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

  return <main className="user-settings-page">
    <button className="settings-back" type="button" onClick={() => navigate("/profile")}>← Back to Profile</button>
    <section className="user-settings-card">
      <h1>Settings</h1>
      <form onSubmit={saveProfile} className="settings-form">
        <h2>Profile Information</h2>
        {[["name", "Name", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"]].map(([key, label, type]) => <label key={key}>{label}<input type={type} value={profile[key]} onChange={e => setProfile({ ...profile, [key]: e.target.value })} required /></label>)}
        <button disabled={saving}>Save Profile</button>
      </form>
      <form id="security" onSubmit={step === "verify" ? confirmOtp : step === "forgotVerify" ? verifyForgotOtp : step === "forgotReset" ? resetForgotPassword : requestOtp} className="settings-form settings-security">
        <h2>{step === "verify" || step === "forgotVerify" ? "Verify Email" : step === "forgotReset" ? "Set New Password" : "Security"}</h2>
        {step === "verify" ? <>
          <p>We sent a verification code to <strong>{session?.email}</strong>.</p>
          <label>Verification code<input inputMode="numeric" maxLength="6" value={passwords.otp} onChange={e => setPasswords({ ...passwords, otp: e.target.value.replace(/\D/g, "") })} required /></label>
          <button disabled={saving}>Verify OTP</button>
          <button type="button" className="settings-secondary" disabled={saving} onClick={requestOtp}>Resend OTP</button>
        </> : step === "forgotVerify" ? <>
          <p>We sent a verification code to <strong>{session?.email}</strong>.</p>
          <label>Verification code<input inputMode="numeric" maxLength="6" value={passwords.otp} onChange={e => setPasswords({ ...passwords, otp: e.target.value.replace(/\D/g, "") })} required /></label>
          <button disabled={saving}>Verify OTP</button>
          <button type="button" className="settings-secondary" disabled={saving} onClick={startForgotPassword}>Resend OTP</button>
        </> : step === "forgotReset" ? <>
          <p>Choose a new password for your account.</p>
          <label>New Password<input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength="6" /></label>
          <label>Confirm New Password<input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required minLength="6" /></label>
          <button className="settings-dark-action" disabled={saving}>Change Password</button>
        </> : <>
          <label>Current Password<input type="password" value={passwords.currentPassword} onChange={e => setPasswords({ ...passwords, currentPassword: e.target.value })} required /></label>
          <button type="button" className="settings-forgot-password" onClick={startForgotPassword} disabled={saving}>Forgot Password?</button>
          <label>New Password<input type="password" value={passwords.newPassword} onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })} required minLength="6" /></label>
          <label>Confirm New Password<input type="password" value={passwords.confirmPassword} onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })} required minLength="6" /></label>
          <button className="settings-dark-action" disabled={saving}>Change Password</button>
        </>}
      </form>
      <section className="settings-account"><h2>Account</h2><button type="button" className="settings-danger" onClick={async () => { await logoutUser(); navigate("/"); }}>Logout</button></section>
    </section>
  </main>;
}
