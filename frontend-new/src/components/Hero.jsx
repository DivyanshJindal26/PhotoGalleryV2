import React from "react";
import "./Hero.css";

const Hero = () => {
  return (
    <div className="hero-container">
      <div className="hero-section">
        
        <div className="content">
          <svg className="hero-decor-svg" width="100%" height="100%" viewBox="0 0 1440 400" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="200" cy="220" r="60" fill="#6ddcff33" />
            <circle cx="1200" cy="180" r="40" fill="#7e60ff33" />
            <circle cx="700" cy="350" r="80" fill="#6ddcff22" />
            <circle cx="400" cy="450" r="30" fill="#7e60ff22" />
          </svg>
          <div className="hero-content">
            <h1 className="hero-title">Capture Moments, Create Memories</h1>
            <p className="hero-subtitle">
              Join the IIT Mandi Photography Club and explore the art of visual storytelling.
            </p>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Hero;
