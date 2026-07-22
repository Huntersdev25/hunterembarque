export function LandingFooter() {
  return (
    <footer className="bg-maritime-dark border-t border-primary/10 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <img
          src="/lovable-uploads/25395886-eba9-4c0a-9c0e-59af5a00eabc.png"
          alt="Hunters Manpower"
          width="128"
          height="32"
          loading="lazy"
          className="h-8 w-auto mx-auto mb-4 filter brightness-0 invert"
        />
        <p className="text-sm text-primary-foreground/50">
          © {new Date().getFullYear()} Hunters Manpower. O sistema operacional do embarque offshore.
        </p>
      </div>
    </footer>
  );
}
