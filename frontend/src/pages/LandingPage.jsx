import React from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaCheckCircle } from "react-icons/fa";
import { MdOutlineAccessTime } from "react-icons/md";
import { SiGmail, SiSlack, SiGooglecalendar } from "react-icons/si";
import "./LandingPage.css";

const LandingPage = () => {
    const navigate = useNavigate();

    useEffect(() => {
      // Tambahkan class body khusus saat masuk Landing Page
      document.body.classList.add("landing-body");
      return () => {
        document.body.classList.remove("landing-body");
      };
    }, []);

  return (
    <div className="landing-container">
      {/* Sticky Note + Check */}
      <div className="sticky-note">
        <p>
          Take notes to keep track of crucial details, and accomplish more
          tasks with ease.
        </p>
        <div className="check-icon">
          <FaCheckCircle />
        </div>
      </div>

      {/* Reminder */}
      <div className="reminder-card">
        <h4>Reminders</h4>
        <p>Today's Meeting</p>
        <div className="reminder-time">
          <MdOutlineAccessTime />
          <span>13:00 - 13:45</span>
        </div>
      </div>

      {/* Hero Content */}
      <div className="hero-section">
        <div className="hero-icon">
            <span>●</span>
        </div>
        <h1 className="hero-title">Think, plan, and track</h1>
        <h2 className="hero-subtitle">all in one place</h2>
        <p className="hero-desc">
            Efficiently manage your tasks and boost productivity.
        </p>
        <button
            className="cta-button"
            onClick={() => navigate("/faktur")}
        >
            Masuk ke Aplikasi
        </button>
      </div>

      {/* Today's tasks (Bottom Left) */}
      <div className="task-card">
        <h4>Today's tasks</h4>
        <div className="mb-2">
          <p className="text-sm font-medium">New Ideas for campaign</p>
          <div className="task-progress">
            <div className="task-bar-blue"></div>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Design PPT #4</p>
          <div className="task-progress">
            <div className="task-bar-red"></div>
          </div>
        </div>
      </div>

      {/* Integrations (Bottom Right) */}
      <div className="integration-card">
        <h4>100+ Integrations</h4>
        <div className="integration-icons">
          <SiGmail className="text-red-500" />
          <SiSlack className="text-purple-500" />
          <SiGooglecalendar className="text-blue-500" />
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
