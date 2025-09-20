// WidgetTemplate.js
import './Widget.css';

export default function WidgetTemplate({ 
  theme = 'light', 
  className = '', 
  title, 
  description, 
  buttonText, 
  imageUrl, 
  handleButtonClick 
}) {
  return (
    <div className={`widget-card widget-card--${theme} ${className}`}>
      {/* Left Content */}
      <div className="widget-card__content">
        <h2 className="widget-card__title">
          {title}
        </h2>
        <p className="widget-card__description">
          {description}
        </p>
        <button 
          onClick={handleButtonClick}
          className={`widget-card__button widget-card__button--${theme}`}
        >
          {buttonText}
        </button>
      </div>
      
      {/* Right Image */}
      <div className="widget-card__image-container">
        <img 
          src={imageUrl}
          alt="Widget illustration"
          className="widget-card__image"
        />
      </div>
    </div>
  );
}