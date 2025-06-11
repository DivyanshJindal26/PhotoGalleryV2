import "./About.css";

const About = () => {
  return (
    <div className="about-wrapper">
      <h1 className="about-title">About Us</h1>

      <div className="about-content">
        <div className="about-left">
          <div className="about-section">
            <h2 className="about-heading">Developer</h2>
            <p className="about-name">Divyansh Jindal</p>
            <p>Email: <a href="mailto:b24121@students.iitmandi.ac.in">b24121@students.iitmandi.ac.in</a></p>
            <p>Phone: +91 76260 40100</p>
          </div>

          <div className="about-section">
            <h2 className="about-heading">Technical Secretary</h2>
            <p className="about-name">Vaibhav Kesharwani</p>
            <p>Email: <a href="mailto:technical_secretary@students.iitmandi.ac.in">technical_secretary@students.iitmandi.ac.in</a></p>
            <p>Phone: +91 93690 80567</p>
          </div>

          <div className="about-section">
            <h2 className="about-heading">Contributors</h2>
            <p>
              <span className="about-name">Dhairya Sharma</span> – 
              <a href="mailto:b24241@students.iitmandi.ac.in"> b24241@students.iitmandi.ac.in</a><br />
              <span className="about-name">Ojasvi Jain</span> – 
              <a href="mailto:b24208@students.iitmandi.ac.in"> b24208@students.iitmandi.ac.in</a>
            </p>
          </div>
        </div>

        <div className="about-right">
          <h2 className="about-heading">Our Location</h2>
          <iframe
            title="IIT Mandi Location"
            className="about-map"
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.5589766691!2d76.99657057642452!3d31.782512574095023!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3904e5ca553f4a27%3A0xe0c4d446cc9584ca!2sIIT%20Mandi!5e0!3m2!1sen!2sin!4v1739101004547!5m2!1sen!2sin"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default About;
