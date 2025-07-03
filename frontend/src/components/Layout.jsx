import React from "react";
import Navbar from "./Navbar"; // Impor komponen Navbar
import "../App.css";

const Layout = ({ children }) => {
  return (
    <div className="container">
      <Navbar />
      <main>{children}</main>
    </div>
  );
};

export default Layout;