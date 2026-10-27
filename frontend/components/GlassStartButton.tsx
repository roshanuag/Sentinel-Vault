import React from "react";
import { playClick } from "../lib/sound";

interface GlassStartButtonProps {
  href?: string;
  onClick?: () => void;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const GlassStartButton: React.FC<GlassStartButtonProps> = ({
  href = "#vault-soc",
  onClick,
  label = "Get started",
  style,
  className = "",
}) => {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    playClick();
    if (onClick) {
      onClick();
    } else if (href && href.startsWith("#")) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    } else if (href) {
      window.location.href = href;
    }
  };

  return (
    <div className={`glass-btn-container ${className}`}>
      <div className="container fx-layer">
        <div className="top">
          <div
            className="box start-btn"
            style={
              {
                "--w": "260px",
                "--h": "75px",
                "--tr": "15%",
                ...style,
              } as React.CSSProperties
            }
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleClick(e as unknown as React.MouseEvent<HTMLDivElement>);
              }
            }}
            aria-label={label}
          >
            <span className="text">{label}</span>
            <div className="btn-icon">
              <svg
                className="svg"
                viewBox="0 0 1024 1024"
                version="1.1"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path d="M779.180132 473.232045 322.354755 16.406668c-21.413706-21.413706-56.121182-21.413706-77.534887 0-21.413706 21.413706-21.413706 56.122205 0 77.534887l418.057421 418.057421L244.819868 930.057421c-21.413706 21.413706-21.413706 56.122205 0 77.534887 10.706853 10.706853 24.759917 16.059767 38.767955 16.059767s28.061103-5.353938 38.767955-16.059767L779.180132 550.767955C800.593837 529.35425 800.593837 494.64575 779.180132 473.232045z" />
              </svg>
            </div>
            <div className="circle-overlay" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlassStartButton;
