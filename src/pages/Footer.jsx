import React from "react";
import "./Footer.css";

const Footer = () => {
  const socialLinks = [
    {
      id: 1,
      name: "Facebook",
      icon: "fab fa-facebook-f",
      url: "https://www.facebook.com/ekabhumih",
    },
    {
      id: 2,
      name: "Twitter",
      icon: "fab fa-twitter",
      url: "https://twitter.com/ekabhumih",
    },
    {
      id: 3,
      name: "Instagram",
      icon: "fab fa-instagram",
      url: "https://www.instagram.com/ekabhumih",
    },
  ];

  const legalLinks = [
    { label: "Terms", href: "/terms-and-conditions.html" },
    { label: "Privacy", href: "/privacy-policy.html" },
    { label: "Refunds", href: "/refund-policy.html" },
    { label: "Cancellation", href: "/cancellation-policy.html" },
    { label: "Shipping", href: "/shipping-and-delivery.html" },
  ];

  return (
    <footer id="footer" className="footer">
      <div className="footer-strip">
        <div className="footer-strip__brand">
          <img src="/images/logo-white.png" alt="Eka Bhumih" className="footer-brand-logo" />
          {/* <span className="footer-copy">Copyright {new Date().getFullYear()} Ekabhumih</span> */}
        </div>

        <div className="footer-strip__contact">
          <a href="mailto:bhumihlifestyle@gmail.com">bhumihlifestyle@gmail.com</a>
          <span>Kaloor, Kochi</span>
          <a href="tel:+917829033319">+91 7829033319</a>
        </div>

        <div className="footer-strip__links">
          {legalLinks.map((link) => (
            <a key={link.href} href={link.href}>{link.label}</a>
          ))}
        </div>

        <div className="footer-strip__social">
          {socialLinks.map((social) => (
            <a
              key={social.id}
              href={social.url}
              className="footer-social"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.name}
              title={social.name}
            >
              <i className={social.icon}></i>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
