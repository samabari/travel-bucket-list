import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./auth/AuthContext";
import { TravelAuthApp } from "./components/TravelAuthApp";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <TravelAuthApp />
    </AuthProvider>
  </React.StrictMode>,
);
