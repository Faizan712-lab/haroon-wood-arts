import {
  getApiUrl
}
from "./api";

async function authRequest(path, options = {}) {
  let response;
  const isMultipart = options.body instanceof FormData;
  const headers = {
    ...(options.headers || {})
  };

  if (!isMultipart && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  try {
    response = await fetch(
      getApiUrl(path),
      {
        credentials: "include",
        ...options,
        headers
      }
    );
  } catch (error) {
    throw new Error(
      "Unable to reach the authentication server. Check that the backend is running and reachable on this network."
    );
  }

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok && import.meta.env.DEV) {
    console.error("Authentication API error:", {
      status: response.status,
      url: getApiUrl(path),
      body: data
    });
  }

  if (!response.ok || data.success === false) {
    if (response.status === 401) {
      throw new Error(data.message || "Your session is not authorized.");
    }

    if (response.status >= 500) {
      throw new Error("The authentication server encountered an error. Please try again.");
    }

    throw new Error(
      data.message || "Authentication request failed"
    );
  }

  return data;
}

export async function registerUser(user) {
  const data = await authRequest(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(user)
    }
  );

  window.dispatchEvent(
    new CustomEvent("userAuthChanged")
  );

  return data.user;
}

export async function requestRegistrationOtp(user) {
  return authRequest(
    "/api/auth/register/send-otp",
    {
      method: "POST",
      body: JSON.stringify(user)
    }
  );
}

export async function verifyRegistrationOtp(payload) {
  const data = await authRequest(
    "/api/auth/register/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  window.dispatchEvent(
    new CustomEvent("userAuthChanged")
  );

  return data.user;
}

export async function loginUser(credentials) {
  const data = await authRequest(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({
        ...credentials,
        role: "user"
      })
    }
  );

  window.dispatchEvent(
    new CustomEvent("userAuthChanged")
  );

  return data.user;
}

export async function loginAdmin(credentials) {
  const data = await authRequest(
    "/api/admin/login",
    {
      method: "POST",
      body: JSON.stringify(credentials)
    }
  );

  if (data.otpRequired) {
    return data;
  }

  window.dispatchEvent(
    new CustomEvent("adminAuthChanged")
  );

  return data.user;
}

export async function verifyAdminLoginOtp(payload) {
  const data = await authRequest(
    "/api/admin/verify-device",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  window.dispatchEvent(
    new CustomEvent("adminAuthChanged")
  );

  return data.user;
}

export async function resendAdminLoginOtp(credentials) {
  return authRequest(
    "/api/admin/login",
    {
      method: "POST",
      body: JSON.stringify(credentials)
    }
  );
}

export async function getAdminRegistrationStatus() {
  return authRequest(
    "/api/admin/status",
    {
      method: "GET"
    }
  );
}

export async function registerAdmin(payload) {
  return authRequest(
    "/api/admin/register/send-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function verifyAdminRegistration(payload) {
  const data = await authRequest(
    "/api/admin/register/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  window.dispatchEvent(
    new CustomEvent("adminAuthChanged")
  );

  return data.user;
}

export async function requestAdminForgotPasswordOtp(payload) {
  return authRequest(
    "/api/admin/forgot-password/send-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function verifyAdminForgotPasswordOtp(payload) {
  return authRequest(
    "/api/admin/forgot-password/verify-otp",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function loginWithGoogle(credential) {
  const data = await authRequest(
    "/api/auth/google",
    {
      method: "POST",
      body: JSON.stringify({ credential })
    }
  );

  window.dispatchEvent(
    new CustomEvent("userAuthChanged")
  );

  return data.user;
}

export async function getActiveUserSession() {
  try {
    const data = await authRequest(
      "/api/auth/me?role=user",
      {
        method: "GET"
      }
    );

    return data.user?.role === "user"
      ? data.user
      : null;
  } catch {
    return null;
  }
}

export async function getActiveAdminSession() {
  try {
    const data = await authRequest(
      "/api/admin/me",
      {
        method: "GET"
      }
    );

    return data.user?.role === "admin"
      ? data.user
      : null;
  } catch {
    return null;
  }
}

export async function updateUserAccount(updates) {
  const data = await authRequest(
    "/api/auth/me",
    {
      method: "PUT",
      body: updates instanceof FormData
        ? updates
        : JSON.stringify(updates)
    }
  );

  window.dispatchEvent(
    new CustomEvent("userAuthChanged")
  );

  return data.user;
}

export async function resetUserPassword(payload) {
  const data = await authRequest(
    "/api/password/reset",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  return data;
}

export async function requestPasswordOtp(email) {
  return authRequest(
    "/api/password/forgot",
    {
      method: "POST",
      body: JSON.stringify({ email })
    }
  );
}

export async function verifyPasswordOtp(payload) {
  return authRequest(
    "/api/password/verify",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}

export async function requestAuthenticatedPasswordChange(payload) {
  return authRequest("/api/password/change/request", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function confirmAuthenticatedPasswordChange(payload) {
  return authRequest("/api/password/change/confirm", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function logoutUser() {
  await authRequest(
    "/api/auth/logout",
    {
      method: "POST"
    }
  ).catch(() => null);

  window.dispatchEvent(
    new CustomEvent("userAuthChanged")
  );
}

export async function logoutAdmin() {
  await authRequest(
    "/api/admin/logout",
    {
      method: "POST"
    }
  ).catch(() => null);

  window.dispatchEvent(
    new CustomEvent("adminAuthChanged")
  );
}

export async function updateAdminAccount(payload) {
  const data = await authRequest(
    "/api/admin/account",
    {
      method: "PUT",
      body: payload instanceof FormData
        ? payload
        : JSON.stringify(payload)
    }
  );

  window.dispatchEvent(
    new CustomEvent("adminAuthChanged")
  );

  return data.user;
}

export async function deleteAdminAccount(payload) {
  const data = await authRequest(
    "/api/admin/account",
    {
      method: "DELETE",
      body: JSON.stringify(payload)
    }
  );

  window.dispatchEvent(
    new CustomEvent("adminAuthChanged")
  );

  return data;
}
