import "./Admin.css";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaCloudUploadAlt,
  FaEnvelope,
  FaExclamationTriangle,
  FaIdBadge,
  FaImage,
  FaLock,
  FaShieldAlt,
  FaUser
} from "react-icons/fa";
import toast from "react-hot-toast";

import {
  deleteAdminAccount,
  getActiveAdminSession,
  logoutAdmin,
  updateAdminAccount
} from "../../utils/auth";

function formatDate(value) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(new Date(value));
}

function AdminAvatar({ image, name, className = "" }) {
  return (
    <div className={`admin-profile-avatar ${className}`}>
      {image ? <img src={image} alt={name || "Admin"} /> : <FaUser />}
    </div>
  );
}

function AdminSettings() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [form, setForm] = useState({
    name: "",
    designation: "Administrator",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    profileImage: ""
  });

  useEffect(() => {
    let active = true;

    async function loadAdmin() {
      try {
        const session = await getActiveAdminSession();
        if (!active) return;
        setAdmin(session);
        setForm(current => ({
          ...current,
          name: session?.name || "",
          designation: session?.designation || "Administrator",
          email: session?.email || "",
          profileImage: session?.profileImage || ""
        }));
      } catch (error) {
        toast.error(error.message || "Unable to load admin settings");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAdmin();

    return () => {
      active = false;
    };
  }, []);

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }));
  }

  function readImage(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile image must be 5MB or smaller.");
      return;
    }

    setProfileImageFile(file);
    updateField("profileImage", URL.createObjectURL(file));
    toast.success("Profile picture selected.");
  }

  function handleImageChange(event) {
    readImage(event.target.files?.[0]);
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);
    readImage(event.dataTransfer.files?.[0]);
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);

    try {
      if (form.newPassword || form.confirmPassword || form.currentPassword) {
        if (!form.currentPassword || !form.newPassword) {
          toast.error("Current password and new password are required.");
          return;
        }
        if (form.newPassword !== form.confirmPassword) {
          toast.error("Passwords do not match.");
          return;
        }
      }

      const payload = profileImageFile ? new FormData() : {};
      const fields = {
        name: form.name,
        designation: form.designation,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      };

      if (payload instanceof FormData) {
        Object.entries(fields).forEach(([key, value]) => payload.append(key, value));
        payload.append("profileImage", profileImageFile);
      } else {
        Object.assign(payload, fields);
      }

      const updatedAdmin = await updateAdminAccount(payload);

      setAdmin(updatedAdmin);
      setForm(current => ({
        ...current,
        name: updatedAdmin?.name || current.name,
        designation: updatedAdmin?.designation || current.designation,
        profileImage: updatedAdmin?.profileImage || current.profileImage,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      }));
      setProfileImageFile(null);
      toast.success("Admin settings updated.");
    } catch (error) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setSaving(true);

    try {
      await deleteAdminAccount({ password: deletePassword });
      await logoutAdmin().catch(() => null);
      toast.success("Admin account deleted.");
      navigate("/admin-login", { replace: true });
    } catch (error) {
      toast.error(error.message || "Failed to delete account");
    } finally {
      setSaving(false);
      setDeleteOpen(false);
      setDeletePassword("");
    }
  }

  if (loading) {
    return <div className="admin-page admin-settings-page">Loading...</div>;
  }

  const verified = Boolean(admin?.isEmailVerified);
  const active = admin?.isActive !== false;
  const designation = form.designation || "Administrator";

  return (
    <div className="admin-page admin-settings-page">
      <section className="admin-account-overview">
        <AdminAvatar image={form.profileImage} name={form.name} className="admin-overview-avatar" />
        <div className="admin-overview-main">
          <span className="admin-overview-kicker">Account Overview</span>
          <h2>{form.name || "Admin"}</h2>
          <p>{designation}</p>
          <a href={`mailto:${form.email}`}>{form.email}</a>
          <div className="admin-overview-badges">
            <span className={active ? "admin-status-badge active" : "admin-status-badge inactive"}>
              {active ? "Active Account" : "Inactive Account"}
            </span>
            <span className={verified ? "admin-verify-badge verified" : "admin-verify-badge pending"}>
              {verified ? (
                <>
                  <FaCheckCircle /> Verified Admin
                </>
              ) : (
                <>
                  <FaExclamationTriangle /> Verification Pending
                </>
              )}
            </span>
          </div>
        </div>
        <div className="admin-overview-meta">
          <span>Last Login</span>
          <strong>{formatDate(admin?.lastLogin)}</strong>
        </div>
      </section>

      <form className="admin-settings-form" onSubmit={handleSave}>
        <section className="admin-settings-panel">
          <div className="admin-settings-panel-heading">
            <FaIdBadge />
            <div>
              <h2>Profile Information</h2>
              <p>Update the identity shown across the admin panel.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label className="admin-form-field">
              <span><FaUser /> Name</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Admin name"
              />
            </label>

            <label className="admin-form-field">
              <span><FaShieldAlt /> Designation</span>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => updateField("designation", e.target.value)}
                placeholder="Administrator"
              />
            </label>

            <label className="admin-form-field admin-form-field-wide">
              <span><FaEnvelope /> Email</span>
              <input type="email" value={form.email} readOnly />
            </label>
          </div>
        </section>

        <section className="admin-settings-panel">
          <div className="admin-settings-panel-heading">
            <FaImage />
            <div>
              <h2>Profile Picture</h2>
              <p>Drag an image here or browse from your device.</p>
            </div>
          </div>

          <label
            className={dragging ? "admin-upload-zone dragging" : "admin-upload-zone"}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <AdminAvatar image={form.profileImage} name={form.name} />
            <input type="file" accept="image/*" onChange={handleImageChange} />
            <span><FaCloudUploadAlt /> Drop image or choose file</span>
            <small>Recommended square image for the cleanest avatar crop.</small>
          </label>
        </section>

        <section className="admin-settings-panel">
          <div className="admin-settings-panel-heading">
            <FaLock />
            <div>
              <h2>Security</h2>
              <p>Change your password without affecting profile details.</p>
            </div>
          </div>

          <div className="admin-form-grid">
            <label className="admin-form-field">
              <span>Current Password</span>
              <input
                type="password"
                value={form.currentPassword}
                onChange={(e) => updateField("currentPassword", e.target.value)}
                placeholder="Current password"
              />
            </label>

            <label className="admin-form-field">
              <span>New Password</span>
              <input
                type="password"
                value={form.newPassword}
                onChange={(e) => updateField("newPassword", e.target.value)}
                placeholder="New password"
              />
            </label>

            <label className="admin-form-field admin-form-field-wide">
              <span>Confirm Password</span>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={(e) => updateField("confirmPassword", e.target.value)}
                placeholder="Confirm new password"
              />
            </label>
          </div>
        </section>

        <section className="admin-settings-panel admin-danger-panel">
          <div className="admin-settings-panel-heading">
            <FaExclamationTriangle />
            <div>
              <h2>Danger Zone</h2>
              <p>Deactivate this admin account and end access immediately.</p>
            </div>
          </div>

          <button
            type="button"
            className="admin-danger-btn"
            onClick={() => setDeleteOpen(true)}
            disabled={saving}
          >
            Delete Account
          </button>
        </section>

        <div className="admin-settings-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>

      {deleteOpen && (
        <div className="admin-modal-backdrop">
          <div className="admin-settings-modal" role="dialog" aria-modal="true">
            <h2>Delete Admin Account</h2>
            <p>Enter your current password to confirm soft deletion.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Current password"
            />
            <div className="admin-modal-actions">
              <button type="button" className="admin-modal-cancel" onClick={() => setDeleteOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="admin-modal-save" onClick={handleDeleteAccount} disabled={saving || !deletePassword}>
                {saving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
