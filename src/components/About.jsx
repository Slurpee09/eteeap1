import React, { useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AOS from "aos";
import "aos/dist/aos.css";
import heroImage from "../assets/groupic.jpg";
import missionImage from "../assets/groupic.jpg";
import { UserContext } from "./UserContext";

function About() {
  const { user } = useContext(UserContext); // ✅ inside component
  const navigate = useNavigate(); // ✅ inside component

  useEffect(() => {
    AOS.init({ duration: 800, once: true });
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-6 py-20 space-y-16">
      {/* Hero Section */}
      <section data-aos="fade-down" className="relative">
        <img
          src={heroImage}
          alt="ETEEAP Students"
          className="w-full h-64 md:h-96 object-cover rounded-xl shadow-md"
        />
        <h1 className="absolute inset-0 flex items-center justify-center text-4xl md:text-5xl font-bold text-white bg-black bg-opacity-40 rounded-xl">
          About ETEEAP
        </h1>
      </section>

      {/* Overview Section */}
      <section data-aos="fade-up" className="bg-white shadow-md rounded-xl p-6 md:p-12">
        <h2 className="text-2xl font-semibold text-blue-700 mb-4">Overview</h2>
        <p className="text-gray-700 leading-relaxed">
          The Expanded Tertiary Education Equivalency and Accreditation Program (ETEEAP) is an alternative education delivery mode, promulgated through Executive Order 330, which promotes access to continuing quality higher education. It is an effective system of academic equivalency and accreditation of prior learning from relevant work experiences and formal/non-formal educational training. Deputized Higher Educational Institutions (HEIs) are authorized to conduct competency-based evaluation and award appropriate degrees to deserving individuals.
        </p>
        <p className="text-gray-700 leading-relaxed mt-4">
          The Commission on Higher Education deputized LCC Bacolod to offer ETEEAP for Bachelor of Science in Business Administration, Liberal Arts in English Language Studies, and the Bachelor of Science in Hospitality Management. The program follows a revised curriculum based on a 10-month timeframe with classes every Saturday.
        </p>
      </section>

      {/* Mission & Vision */}
      <section data-aos="fade-up" className="bg-blue-50 shadow-md rounded-xl p-6 md:p-12 flex flex-col md:flex-row items-center gap-8">
        <img
          src={missionImage}
          alt="Mission"
          className="w-full md:w-1/2 h-64 object-cover rounded-xl shadow-md"
        />
        <div className="flex-1 space-y-6">
          <h2 className="text-2xl font-semibold text-blue-700">Mission & Vision</h2>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">Mission</h3>
            <p className="text-gray-700 leading-relaxed">
              Guided by the teachings of Christ and inspired by Augustinian and Marian values, LCC Bacolod’s ETEEAP is dedicated to delivering quality, accessible, and transformative academic programs that recognize prior learning and professional experience. It upholds a culture of excellence in instruction, innovation, and nation building to form lifelong learners and professionals who embody integrity, leadership, and service strengthening its role as the leading provider of future and world ready graduates.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-blue-800 mb-2">Vision</h3>
            <p className="text-gray-700 leading-relaxed">
              La Consolacion College Bacolod’s ETEEAP envisions itself as a Catholic academic community committed to excellence and quality education for adult learners. It aspires to be the leading provider of competent, compassionate, and values-driven graduates in the Negros Island Region and beyond who contribute to the creation of a just, humane, and sustainable society.
            </p>
          </div>
        </div>
      </section>

      {/* Why Choose ETEEAP */}
      <section data-aos="fade-up" className="bg-white shadow-md rounded-xl p-6 md:p-12">
        <h2 className="text-2xl font-semibold text-blue-700 mb-6">Why Choose ETEEAP?</h2>
        <ul className="grid md:grid-cols-2 gap-6">
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 text-blue-500 mt-1">🎓</span>
            <span>Opportunity for working adults to complete a degree within 10 months.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 text-blue-500 mt-1">⏰</span>
            <span>Flexible class schedules (every Saturday).</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 text-blue-500 mt-1">📄</span>
            <span>Competency-based evaluation and recognition of prior learning.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-6 h-6 text-yellow-400 mt-1">⭐</span>
            <span>Deputized HEIs ensure quality and official degree accreditation.</span>
          </li>
        </ul>
      </section>

      {/* CTA Section */}
      <section data-aos="fade-up" className="text-center">
        <button
          onClick={() => {
            if (user) {
              navigate("/programs"); // logged in → ProgramDetails
            } else {
              navigate("/login"); // not logged in → Login
            }
          }}
          className="px-8 py-3 bg-blue-800 text-white rounded-md text-lg font-semibold hover:bg-blue-700 transition"
        >
          Apply Now
        </button>
      </section>
    </main>
  );
}

export default About;
