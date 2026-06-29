import {
  getApiUrl
}
from "./api";

async function addressRequest(path, options = {}) {
  const response = await fetch(
    getApiUrl(path),
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    }
  );

  const data =
    await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message || "Address request failed"
    );
  }

  return data;
}

export async function getUserAddresses() {
  const data = await addressRequest(
    "/api/addresses",
    {
      method: "GET"
    }
  );

  return data.addresses || [];
}

export async function createUserAddress(address) {
  const data = await addressRequest(
    "/api/addresses",
    {
      method: "POST",
      body: JSON.stringify(address)
    }
  );

  return data.address;
}

export async function updateUserAddress(id, address) {
  const data = await addressRequest(
    `/api/addresses/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(address)
    }
  );

  return data.address;
}

export async function deleteUserAddress(id) {
  await addressRequest(
    `/api/addresses/${id}`,
    {
      method: "DELETE"
    }
  );
}
