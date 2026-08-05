import { SignUp } from "@clerk/clerk-react";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function ClerkSignUp() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030a14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        paddingTop: "clamp(20px, 8vh, 60px)",
        paddingBottom: "24px",
        paddingLeft: "24px",
        paddingRight: "24px",
        gap: "24px",
        overflowY: "auto",
      }}
    >
      <img src={logoImage} alt="LiveSwell" style={{ height: 36, objectFit: "contain" }} />
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/" />
    </div>
  );
}
