import { Link, useLocation } from "wouter";
import { Waves, Heart, User, MapPin } from "lucide-react";

const tabs = [
  { label: "Spots",   icon: Waves,  href: "/" },
  { label: "Saved",   icon: Heart,  href: "/favorites" },
  { label: "Profile", icon: User,   href: "/profile" },
];

export default function BottomNav() {
  const [location] = useLocation();

  const isActive = (href: string) => {
    if (href === "/") return location === "/" || location === "/conditions";
    return location.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-safe">
      <div className="w-full max-w-lg mx-3 mb-3 bg-background/95 backdrop-blur-md border border-border rounded-2xl px-2 py-2 flex items-center justify-around shadow-2xl">
        {tabs.map(({ label, icon: Icon, href }) => {
          const active = isActive(href);
          return (
            <Link key={label} href={href}>
              <button className={`flex flex-col items-center gap-0.5 px-5 py-1.5 rounded-xl transition-colors ${active ? "bg-emerald-500/15" : "hover:bg-muted/60"}`}>
                <Icon className={`h-5 w-5 ${active ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`} />
                <span className={`text-[10px] font-medium ${active ? "text-emerald-500 dark:text-emerald-400" : "text-muted-foreground"}`}>
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
