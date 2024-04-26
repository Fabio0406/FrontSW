import React from 'react';
import "./header.css";

const Header: React.FC = () =>  {
  return (
    <div className="header">
      <div className="headerImgContainer">
        <img
          className="headerImg"
          src="/imagen2.png"
        />
      </div>
    </div>
  );
};

export default Header;


