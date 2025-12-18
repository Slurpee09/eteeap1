import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    const fetchApps = async () => {
      if (!user) return setLoading(false);
      try {
        const res = await axios.get("http://localhost:5000/profile/applications", { withCredentials: true });
        setApps(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to fetch applications:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchApps();
  }, [user]);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <main className="max-w-4xl mx-auto px-4 py-20">
      <h1 className="text-2xl font-bold mb-4">My Applications</h1>
      <div className="bg-white rounded shadow p-4">
        {apps.length === 0 ? (
          <p className="text-gray-600">You have not submitted any applications yet.</p>
        ) : (
          <ul className="divide-y">
            {apps.map((a) => (
              <li key={a.id} className="py-3 flex justify-between items-center">
                <div>
                  <div className="font-semibold">{a.program_name}</div>
                  <div className="text-sm text-gray-600">Submitted: {new Date(a.created_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 items-center">
                  <Link to={`/applications/${a.id}`} className="px-3 py-1 bg-blue-600 text-white rounded">View</Link>
                  <button onClick={() => navigate(`/applications/${a.id}`)} className="px-3 py-1 border rounded">Progress</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default MyApplications;
