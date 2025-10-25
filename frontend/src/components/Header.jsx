import React from "react";
import { Heart, Send } from "lucide-react";
import "../styles/header.css";

const Header = () => {
  return (
    <header className="header">
      <div className="logo">Instagram</div>
      <div className="actions">
        <Heart />
        <Send />
      </div>
    </header>
  );
};

export default Header;
