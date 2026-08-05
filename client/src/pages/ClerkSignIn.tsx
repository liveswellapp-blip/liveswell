import { SignIn } from "@clerk/clerk-react";
import logoImage from "@assets/Live_(1500_x_500_px)_(2)_1780520244305.png";

export default function ClerkSignIn() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#030a14",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        gap: "24px",
      }}
    >
      <img src={logoImage} alt="LiveSwell" style={{ height: 36, objectFit: "contain" }} />
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/" />
    </div>
  );
}
