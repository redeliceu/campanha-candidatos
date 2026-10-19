import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import whiteLogo from "@/assets/rede-liceu-white-cropped.png";

export default function SiteHeader() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [logoVisible, setLogoVisible] = useState(pathname !== "/");

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 40);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateScrolled);
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") {
      setLogoVisible(true);
      return;
    }

    setLogoVisible(false);
    const heroLogo = document.querySelector(".hero-logo");
    if (!heroLogo) {
      setLogoVisible(true);
      return;
    }

    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 0;
    const observer = new IntersectionObserver(
      ([entry]) => setLogoVisible(!entry.isIntersecting),
      { rootMargin: `-${headerHeight}px 0px 0px 0px` },
    );
    observer.observe(heroLogo);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <header className={`site-header ${scrolled ? "site-header-scrolled" : ""}`}>
      <div className="w site-header-inner">
        <Link aria-label="Rede Liceu - início" aria-hidden={!logoVisible} className={logoVisible ? "" : "site-header-brand-hidden"} tabIndex={logoVisible ? undefined : -1} to="/">
          <img alt="Rede Liceu" className="site-header-logo" src={whiteLogo} />
        </Link>
        <nav aria-label="Navegação principal">
          <a href="/#vagas">Vagas</a>
          <a href="/#sobre">Sobre a rede</a>
          <a className="site-header-cta" href="/#vagas">Ver vagas</a>
        </nav>
      </div>
    </header>
  );
}
