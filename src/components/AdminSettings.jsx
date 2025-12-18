import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pencil } from "lucide-react";

const AdminSettings = () => {
  const storedUser = JSON.parse(localStorage.getItem("user")) || {};
  const userId = storedUser.id;
  const role = storedUser.role;

  const [user, setUser] = useState({
    fullname: "",
    email: "",
    password: "",
    image: null,
    imageFile: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editable, setEditable] = useState({ fullname: false, email: false });

  // Fetch admin profile from backend
  const fetchProfile = async () => {
    if (!userId || role !== "admin") {
      setMessage("No admin ID found. Please log in.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get("http://localhost:5000/admin/profile", {
        headers: { "x-user-id": userId },
      });
      const data = res.data;

      setUser({
        fullname: data.fullname || "",
        email: data.email || "",
        password: "",
        image: data.profile_picture || null,
        imageFile: null,
      });

      // Update localStorage with current profile
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          fullname: data.fullname,
          email: data.email,
          profile_picture: data.profile_picture,
        })
      );
      // Notify listeners (dashboard) that profile updated
      try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fullname: data.fullname, profile_picture: data.profile_picture } })); } catch(e){}
    } catch (err) {
      console.error("Error fetching profile:", err.response?.data || err.message);
      setMessage("Failed to fetch profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => setUser({ ...user, [e.target.name]: e.target.value });

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = URL.createObjectURL(e.target.files[0]);
      setUser({ ...user, image: file, imageFile: e.target.files[0] });
    }
  };

  const toggleEditable = (field) => setEditable({ ...editable, [field]: !editable[field] });

  const handleSave = async () => {
    if (!userId) return setMessage("No admin ID found. Please log in.");
    setSaving(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("fullname", user.fullname);
      formData.append("email", user.email);

      if (user.password.trim() !== "") formData.append("password", user.password);
      if (user.imageFile) formData.append("profile_picture", user.imageFile);

      const res = await axios.put("http://localhost:5000/admin/profile", formData, {
        headers: { "x-user-id": userId, "Content-Type": "multipart/form-data" },
      });

      setMessage(res.data.message || "Profile updated successfully!");

      // Clear password and imageFile
      setUser((prev) => ({ ...prev, password: "", imageFile: null }));

      // Reset editable
      setEditable({ fullname: false, email: false });

      // Update localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          fullname: res.data.user.fullname,
          email: res.data.user.email,
          profile_picture: res.data.user.profile_picture,
        })
      );

      // Notify other parts of the app that profile changed
      try { window.dispatchEvent(new CustomEvent('profileUpdated', { detail: { fullname: res.data.user.fullname, profile_picture: res.data.user.profile_picture } })); } catch(e){}

      // Re-fetch profile to ensure latest data
      fetchProfile();
    } catch (err) {
      console.error("Error updating profile:", err.response?.data || err.message);
      setMessage(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };



  if (loading)
    return <div className="p-6 text-center text-gray-600">Loading profile...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-blue-700 mb-8">👤 Admin Settings</h1>
      <div className="bg-white shadow-lg rounded-2xl p-6 border border-gray-200">
        {/* Profile Image */}
        <div className="flex items-center gap-6 mb-8">
          <img
            src={user.image || "https://via.placeholder.com/100"}
            alt="Profile"
            className="w-28 h-28 rounded-full border-4 border-blue-500 object-cover shadow-md"
          />
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl shadow-md transition">
            Change Photo
            <input
              type="file"
              className="hidden"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>
        </div>

        {/* Full Name */}
        <div className="mb-6 relative">
          <label className="block text-gray-700 font-semibold mb-1">Full Name</label>
          <input
            type="text"
            name="fullname"
            value={user.fullname}
            onChange={handleChange}
            readOnly={!editable.fullname}
            className={`w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition ${
              editable.fullname ? "bg-white" : "bg-gray-100 cursor-not-allowed"
            }`}
          />
          <Pencil
            className="absolute right-3 top-9 w-5 h-5 text-gray-500 cursor-pointer hover:text-blue-600"
            onClick={() => toggleEditable("fullname")}
          />
        </div>

        {/* Email */}
        <div className="mb-6 relative">
          <label className="block text-gray-700 font-semibold mb-1">Email</label>
          <input
            type="email"
            name="email"
            value={user.email}
            onChange={handleChange}
            readOnly={!editable.email}
            className={`w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition ${
              editable.email ? "bg-white" : "bg-gray-100 cursor-not-allowed"
            }`}
          />
          <Pencil
            className="absolute right-3 top-9 w-5 h-5 text-gray-500 cursor-pointer hover:text-blue-600"
            onClick={() => toggleEditable("email")}
          />
        </div>

        {/* Password */}
        <div className="mb-6">
          <label className="block text-gray-700 font-semibold mb-1">New Password</label>
          <input
            type="password"
            name="password"
            value={user.password}
            onChange={handleChange}
            placeholder="Leave blank to keep current password"
            className="w-full border px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition"
          />
        </div>

        {/* Save */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-700 hover:bg-blue-600 text-white px-10 py-4 rounded-xl shadow-xl font-semibold transition transform hover:-translate-y-1 disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>

        </div>

        {message && <p className="mt-4 text-green-600 font-medium">{message}</p>}
      </div>
    </div>
  );
};

export default AdminSettings;
