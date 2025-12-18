import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FaSpinner } from "react-icons/fa";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // ✅ get token from URL
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const showTempMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleReset = async () => {
    if (!newPassword) {
      showTempMessage("Enter a new password");
      return;
    }
    if (!token) {
      showTempMessage("Invalid or missing token");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }), // ✅ include token
      });

      const result = await res.json();
      if (res.ok) {
        showTempMessage(result.message || "Password updated!");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        showTempMessage(result.message || "Failed to reset password");
      }
    } catch (err) {
      console.error(err);
      showTempMessage("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="bg-blue-100/40 p-8 rounded shadow w-96">
        <h2 className="text-2xl font-bold text-center mb-6">Reset Password</h2>
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />
        <button
          onClick={handleReset}
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded flex justify-center items-center gap-2"
        >
          {loading && <FaSpinner className="animate-spin" />}
          {loading ? "Processing..." : "Reset Password"}
        </button>

        {message && <p className="mt-4 text-center text-red-600">{message}</p>}
      </div>
    </div>
  );
}
