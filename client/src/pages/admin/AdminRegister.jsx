import "./Admin.css";

import {
  useEffect,
  useState
} from "react";

import {
  useNavigate
} from "react-router-dom";

import toast from "react-hot-toast";

import {
  getAdminRegistrationStatus,
  registerAdmin,
  verifyAdminRegistration
} from "../../utils/auth";

function AdminRegister() {

  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    secretKey: "",
    otp: ""
  });

  useEffect(() => {
    async function loadStatus() {
      try {
        const data = await getAdminRegistrationStatus();
        setStatus(data);
      } catch (error) {
        toast.error(error.message || "Unable to load admin registration.");
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  function updateField(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (!otpSent) {
        await registerAdmin({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          secretKey: form.secretKey
        });
        setOtpSent(true);
        toast.success("OTP sent to your email.");
        return;
      }

      await verifyAdminRegistration({
        email: form.email.trim(),
        otp: form.otp.trim()
      });
      toast.success("Admin account created.");
      navigate("/admin/dashboard", {
        replace: true
      });
    } catch (error) {
      toast.error(error.message || "Admin registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="admin-login">
        <div className="admin-box">
          <p className="admin-auth-note">Loading...</p>
        </div>
      </div>
    );
  }

  if (status && !status.registrationOpen) {
    return (
      <div className="admin-login">
        <div className="admin-box">
          <h1>Haroon Stores</h1>
          <p className="admin-login-subtitle">
            Secure Admin Access
          </p>
          <p className="admin-auth-note">
            Maximum number of admins has been reached.
          </p>
          <button
            type="button"
            onClick={() => navigate("/admin-login")}
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-login">
      <form
        className="admin-box"
        onSubmit={handleSubmit}
      >
        <h1>Haroon Stores</h1>
        <p className="admin-login-subtitle">
          Secure Admin Registration
        </p>

        {!otpSent ? (
          <>
            <label className="admin-auth-field">
              <span>Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                required
              />
            </label>

            <label className="admin-auth-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
              />
            </label>

            <label className="admin-auth-field">
              <span>Password</span>
              <div className="admin-secret-row">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="admin-ghost-btn"
                  onClick={() => setShowPassword(value => !value)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label className="admin-auth-field">
              <span>Secret Key</span>
              <div className="admin-secret-row">
                <input
                  type={showSecret ? "text" : "password"}
                  value={form.secretKey}
                  onChange={(e) => updateField("secretKey", e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="admin-ghost-btn"
                  onClick={() => setShowSecret(value => !value)}
                >
                  {showSecret ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </>
        ) : (
          <label className="admin-auth-field">
            <span>OTP</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength="6"
              value={form.otp}
              onChange={(e) => updateField("otp", e.target.value)}
              required
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Please wait..."
            : otpSent
              ? "Verify OTP"
              : "Create Admin"}
        </button>

        <button
          type="button"
          className="admin-link-btn"
          onClick={() => navigate("/admin-login")}
        >
          Sign In
        </button>
      </form>
    </div>
  );
}

export default AdminRegister;
