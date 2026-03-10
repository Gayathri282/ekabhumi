import React from 'react';
import './Footer.css';

const Footer = () => {
  // Social media data with actual account links
  const socialLinks = [
    { 
      id: 1, 
      name: 'Facebook', 
      icon: 'fab fa-facebook-f', 
      url: 'https://www.facebook.com/ekabhumih' 
    },
    { 
      id: 2, 
      name: 'Twitter', 
      icon: 'fab fa-twitter', 
      url: 'https://twitter.com/ekabhumih' 
    },
    { 
      id: 3, 
      name: 'Instagram', 
      icon: 'fab fa-instagram', 
      url: 'https://www.instagram.com/ekabhumih' 
    },
   
   
    
  ];

  
 

  return (
    <footer id="footer" className="footer">
      <div className="footer-top">
        <div className="container">
          <div className="footer-grid">
            
            {/* Column 1: About */}
            <div className="footer-column">
              <div className="footer-logo">
                <span className="brand">
                  eka<span>Bhumih</span>
                </span>
              </div>
             
              
                <div className="color-items">
                  
                  
                  
                
              </div>
            </div>

           

            

            {/* Column 4: Contact & Social */}
            <div className="footer-column">
              <h3 className="footer-title">bhumihlifestyle@gmail.com</h3>
              <div className="contact-info">
                <div className="contact-item">
                  <i className="fas fa-map-marker-alt"></i>
                  <span>kaloor,kochi</span>
                </div>
                <div className="contact-item">
                  <i className="fas fa-phone"></i>
                  <span>+91 7829033319</span>
                </div>
                <div className="contact-item">
                  <i className="fas fa-envelope"></i>
                  <span>bhumihlifestyle@gmail.com</span>
                </div>
                <div className="contact-item">
              
                </div>
              </div>

              <h3 className="footer-title">Follow Us</h3>
              <div className="social-links">
                {socialLinks.map(social => (
                  <a 
                    key={social.id} 
                    href={social.url} 
                    className="social-link"
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label={social.name}
                    title={social.name}
                  >
                    <i className={social.icon}></i>
                  </a>
                ))}
              </div>

              <div className="newsletter">
                <h4>Newsletter</h4>
                <p>Subscribe for updates and offers</p>
                <div className="newsletter-form">
                  <input type="email" placeholder="Your email address" />
                  <button type="submit" aria-label="Subscribe">
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          <div className="footer-bottom-content">
            
<p className="copyright">
  © {new Date().getFullYear()} Eka Bhumih. All Rights Reserved.
  <a href="/terms-and-conditions"> Terms & Conditions</a> •
  <a href="/privacy-policy"> Privacy Policy</a> •
  <a href="/refund-policy"> Refund Policy</a> •
  <a href="/cancellation-policy"> Cancellation Policy</a> •
  <a href="/shipping-and-delivery"> Shipping & Delivery</a>
</p>
            <div className="payment-methods">
              <i className="fab fa-cc-visa"></i>
              <i className="fab fa-cc-mastercard"></i>
              <i className="fab fa-cc-paypal"></i>
              <i className="fab fa-cc-apple-pay"></i>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;