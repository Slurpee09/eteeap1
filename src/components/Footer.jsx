// src/components/Footer.jsx
import React from "react";
import { Link } from "react-router-dom";
import logoImage from "../assets/ETEEAP_LOGO.png";
import LCCB_LOGO from "../assets/LCCB_LOGO.png";

const Footer = () => {
  return (
    <footer className="bg-blue-800 text-white pt-12 pb-6 relative overflow-hidden">
      {/* removed floating facebook icon - logos arranged inline below */}

      {/* Footer Columns */}
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        {/* Left: logos inline to match navbar order (LCCB then ETEEAP) and description below */}
        <div className="flex-1 flex flex-col items-start justify-start gap-4">
          <div className="flex items-center gap-4">
            <img src={LCCB_LOGO} alt="LCCB Logo" className="w-28 h-auto" />
            <img src={logoImage} alt="ETEEAP Logo" className="w-28 h-auto" />
          </div>
          <p className="text-gray-300 leading-relaxed max-w-sm mt-2">
            Empowering working adults to earn a degree through recognition of prior learning and professional experience.
          </p>
        </div>

        {/* Center: Contact Us - centered for balance */}
        <div className="flex-1 flex flex-col items-center text-center mt-4 md:mt-6">
          <h4 className="text-xl font-semibold mb-2">Contact Us</h4>
          <p className="text-gray-300 hover:text-white transition">📧 eteeap@lccbonline.edu.ph</p>
          <p className="text-gray-300 hover:text-white transition">☎ (034) 434–9661 local 317</p>
          <a href="https://www.facebook.com/people/LCC-B-Eteeap/100063975547608/" target="_blank" rel="noopener noreferrer" className="mt-2 text-gray-300 hover:text-white transition">
            Visit our facebook page
          </a>
        </div>

        {/* Right: spacer to balance layout */}
        <div className="flex-5 flex items-center justify-end text-right">
          {/* intentionally left blank to keep layout balanced */}
        </div>
      </div>

      {/* Divider & Copyright */}
      <div className="mt-12 border-t border-blue-700 pt-4 text-center text-gray-400 text-sm">
        © 2025 LCCB ETEEAP. All rights reserved.
      </div>

      {/* Floating Animation Style */}
      <style>
        {`
          @keyframes floatIcon {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
            100% { transform: translateY(0px); }
          }
          .animate-float-icon { animation: floatIcon 3s ease-in-out infinite; }
        `}
      </style>
    </footer>
  );
};

export default Footer;
