import React, { useState } from 'react';
import "./BelowHero.css";
import img1 from "../assets/img1.jpg";
import img2 from "../assets/img2.jpeg";
import img3 from "../assets/img3.jpeg";
import { useNavigate } from "react-router-dom";

const BelowHero = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const images = [img1, img2, img3];

  const handleViewAlbum = (eventName) => {
    navigate(`/gallery?event=${encodeURIComponent(eventName)}`);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <section className="below-hero-section">
      <div className="slider-container">
        <button className="slider-arrow left" onClick={prevSlide}>←</button>
        <div className="slider">
          {images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`Slide ${index + 1}`}
              className={index === currentSlide ? 'active' : ''}
            />
          ))}
        </div>
        <button className="slider-arrow right" onClick={nextSlide}>→</button>
        <div className="slider-dots">
          {images.map((_, index) => (
            <span
              key={index}
              className={`dot ${index === currentSlide ? 'active' : ''}`}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>
      <h2 className="section-title">Explore Our Events</h2>
      <div className="container">
        {/* Box 1 */}
        <div className="box">
          <div className="box-image-wrapper">
            <img src={img1} alt="Exodia Cultural Fest" className="box-image" />
            <div className="box-overlay"></div>
            <div className="box-content">
              <h3
                className="box-title interactive-title"
                onClick={() => handleViewAlbum("Exodia")}
              >
                Exodia - Cultural Fest
              </h3>
            </div>
          </div>
        </div>

        {/* Box 2 */}
        <div className="box">
          <div className="box-image-wrapper">
            <img src={img2} alt="Xpecto Tech Fest" className="box-image" />
            <div className="box-overlay"></div>
            <div className="box-content">
              <h3
                className="box-title interactive-title"
                onClick={() => handleViewAlbum("Xpecto")}
              >
                Xpecto - Tech Fest
              </h3>
            </div>
          </div>
        </div>

        {/* Box 3 */}
        <div className="box">
          <div className="box-image-wrapper">
            <img src={img3} alt="General Photos" className="box-image" />
            <div className="box-overlay"></div>
            <div className="box-content">
              <h3
                className="box-title interactive-title"
                onClick={() => handleViewAlbum("General")}
              >
                General Photos
              </h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BelowHero;
