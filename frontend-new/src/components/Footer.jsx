import "./Footer.css";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <p className="footer-text">
        &copy; {year}, Photography Club, IIT Mandi. All rights reserved.
      </p>
    </footer>
  );
};

export default Footer;
