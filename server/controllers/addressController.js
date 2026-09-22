const db = require("../config/db");

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function mapAddress(row) {
  return {
    id: row.id,
    name: row.full_name,
    phone: row.phone,
    street: row.street,
    locality: row.locality,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    landmark: row.landmark || ""
  };
}

function normalizeAddress(body) {
  const clean = (value, maxLength) => String(value || "").trim().slice(0, maxLength);
  return {
    fullName: clean(body.name || body.fullName, 100),
    phone: clean(body.phone, 30),
    street: clean(body.street, 255),
    locality: clean(body.locality, 255),
    city: clean(body.city, 100),
    state: clean(body.state, 100),
    pincode: clean(body.pincode, 20),
    landmark: clean(body.landmark, 255)
  };
}

function validateAddress(address) {
  return (
    address.fullName &&
    address.phone &&
    address.street &&
    address.locality &&
    address.city &&
    address.state &&
    address.pincode &&
    /^[0-9A-Za-z -]{3,20}$/.test(address.pincode) &&
    /^[+0-9() -]{7,30}$/.test(address.phone)
  );
}

async function listAddresses(req, res) {
  try {
    const [rows] = await runQuery(
      `
        SELECT id, full_name, phone, street, locality, city, state, pincode, landmark
        FROM user_addresses
        WHERE user_id = ?
        ORDER BY updated_at DESC, id DESC
      `,
      [req.auth.id]
    );

    res.json({
      success: true,
      addresses: rows.map(mapAddress)
    });
  } catch (error) {
    console.error("List addresses failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to load addresses"
    });
  }
}

async function createAddress(req, res) {
  try {
    const address = normalizeAddress(req.body);

    if (!validateAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required address fields."
      });
    }

    const [result] = await runQuery(
      `
        INSERT INTO user_addresses
        (user_id, full_name, phone, street, locality, city, state, pincode, landmark)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        req.auth.id,
        address.fullName,
        address.phone,
        address.street,
        address.locality,
        address.city,
        address.state,
        address.pincode,
        address.landmark || null
      ]
    );

    const [rows] = await runQuery(
      `
        SELECT id, full_name, phone, street, locality, city, state, pincode, landmark
        FROM user_addresses
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
      [result.insertId, req.auth.id]
    );

    res.status(201).json({
      success: true,
      address: mapAddress(rows[0])
    });
  } catch (error) {
    console.error("Create address failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save address"
    });
  }
}

async function updateAddress(req, res) {
  try {
    const addressId = Number(req.params.id);
    const address = normalizeAddress(req.body);

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid address."
      });
    }

    if (!validateAddress(address)) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required address fields."
      });
    }

    const [result] = await runQuery(
      `
        UPDATE user_addresses
        SET full_name = ?,
            phone = ?,
            street = ?,
            locality = ?,
            city = ?,
            state = ?,
            pincode = ?,
            landmark = ?
        WHERE id = ? AND user_id = ?
      `,
      [
        address.fullName,
        address.phone,
        address.street,
        address.locality,
        address.city,
        address.state,
        address.pincode,
        address.landmark || null,
        addressId,
        req.auth.id
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    const [rows] = await runQuery(
      `
        SELECT id, full_name, phone, street, locality, city, state, pincode, landmark
        FROM user_addresses
        WHERE id = ? AND user_id = ?
        LIMIT 1
      `,
      [addressId, req.auth.id]
    );

    res.json({
      success: true,
      address: mapAddress(rows[0])
    });
  } catch (error) {
    console.error("Update address failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update address"
    });
  }
}

async function deleteAddress(req, res) {
  try {
    const addressId = Number(req.params.id);

    if (!Number.isInteger(addressId) || addressId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid address."
      });
    }

    const [result] = await runQuery(
      "DELETE FROM user_addresses WHERE id = ? AND user_id = ?",
      [addressId, req.auth.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }

    res.json({
      success: true,
      message: "Address deleted"
    });
  } catch (error) {
    console.error("Delete address failed:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete address"
    });
  }
}

module.exports = {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress
};
