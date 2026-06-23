import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import {
  Upload,
  Share2,
  MessageSquare,
  CheckCheck,
  LayoutDashboard,
  Image,
  Smartphone,
  Palette,
  ArrowRight,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Features', href: '#studios' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Studios', href: '#studios' },
];

const TRUST_INDICATORS = [
  'No client account required',
  'Mobile Friendly',
  'Secure Album Sharing',
] as const;

const HOW_IT_WORKS = [
  {
    icon: Upload,
    title: 'Upload',
    text: 'Create a project and upload your album pages.',
  },
  {
    icon: Share2,
    title: 'Share',
    text: 'Generate a secure review link for your client.',
  },
  {
    icon: MessageSquare,
    title: 'Review',
    text: 'Clients leave feedback directly on album pages.',
  },
  {
    icon: CheckCheck,
    title: 'Approve',
    text: 'Finalize revisions and receive approval before printing.',
  },
];

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Organized Feedback',
    description: 'Keep all client comments attached to the correct album pages.',
  },
  {
    icon: CheckCheck,
    title: 'Faster Approvals',
    description: 'Reduce review cycles and finalize albums quicker.',
  },
  {
    icon: Smartphone,
    title: 'Mobile Friendly',
    description: 'Review and approve albums from any device.',
  },
  {
    icon: Palette,
    title: 'Studio Branding',
    description: 'Present albums professionally with your studio identity.',
  },
];

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('h-8 w-8', className)}
    >
      <rect x="2" y="2" width="28" height="28" rx="6" fill="#4F46E5" />
      <rect x="7" y="9" width="8" height="14" rx="1.5" fill="white" opacity="0.9" />
      <rect x="17" y="9" width="8" height="8" rx="1.5" fill="white" opacity="0.9" />
      <rect x="17" y="19" width="8" height="4" rx="1.5" fill="white" opacity="0.6" />
    </svg>
  );
}

function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
}

function useScrollAnimations() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-animate]');
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-in');
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '-60px' }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function Navbar() {
  const scrollY = useScrollPosition();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [mobileOpen, setMobileOpen] = useState(false);
  const scrolled = scrollY > 40;

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled
          ? 'bg-[#0B0F14]/85 backdrop-blur-xl border-b border-[#1e293b] py-2'
          : 'bg-transparent py-4'
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5">
        <Link to={ROUTES.HOME} className="flex items-center gap-2.5 shrink-0">
          <LogoMark />
          <span
            className={cn(
              'font-bold tracking-tight text-white transition-all duration-300',
              scrolled ? 'text-lg' : 'text-xl'
            )}
          >
            AlbumFlow
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <Link
              to={ROUTES.DASHBOARD}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#4338CA]"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to={ROUTES.LOGIN}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
              >
                Login
              </Link>
              <Link
                to={ROUTES.SIGNUP}
                className="rounded-xl bg-[#4F46E5] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[#4338CA]"
              >
                Get Started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((o) => !o)}
          className="flex items-center justify-center rounded-lg p-2 text-[#94a3b8] transition-colors hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="border-t border-[#1e293b] bg-[#0B0F14] px-5 pb-6 pt-4 md:hidden">
          <div className="flex flex-col gap-3">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMobile}
                className="text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <hr className="border-[#1e293b] my-2" />
            {isAuthenticated ? (
              <Link
                to={ROUTES.DASHBOARD}
                onClick={closeMobile}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-5 py-3 text-sm font-medium text-white"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to={ROUTES.LOGIN}
                  onClick={closeMobile}
                  className="rounded-xl border border-[#1e293b] px-5 py-3 text-center text-sm font-medium text-[#94a3b8] transition-colors hover:text-white"
                >
                  Login
                </Link>
                <Link
                  to={ROUTES.SIGNUP}
                  onClick={closeMobile}
                  className="rounded-xl bg-[#4F46E5] px-5 py-3 text-center text-sm font-medium text-white"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="overflow-hidden rounded-2xl border border-[#1e293b] bg-[#0F172A] shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-[#1e293b] px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#eab308]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            </div>
            <span className="text-xs font-medium text-[#475569]">AlbumFlow</span>
          </div>
          <div className="flex gap-2">
            <div className="h-2 w-12 rounded-full bg-[#1e293b]" />
          </div>
        </div>
        <div className="flex">
          <div className="hidden w-[180px] border-r border-[#1e293b] p-3 sm:block">
            <div className="mb-4 h-6 w-20 rounded-md bg-[#1e293b]" />
            <div className="space-y-2">
              {['Albums', 'Dashboard'].map((label) => (
                <div
                  key={label}
                  className="h-8 rounded-lg bg-[#4F46E5]/20 px-3 flex items-center"
                >
                  <span className="text-[10px] font-medium text-[#4F46E5]">{label}</span>
                </div>
              ))}
              {['Reviews', 'Settings'].map((label) => (
                <div
                  key={label}
                  className="h-8 rounded-lg px-3 flex items-center"
                >
                  <span className="text-[10px] font-medium text-[#475569]">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="h-4 w-24 rounded bg-[#1e293b]" />
              <div className="flex gap-1">
                <div className="h-6 w-6 rounded-md bg-[#1e293b]" />
                <div className="h-6 w-6 rounded-md bg-[#1e293b]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[80, 60, 70, 50].map((h, i) => (
                <div
                  key={i}
                  className="rounded-lg bg-[#1e293b]"
                  style={{ height: `${h}px` }}
                >
                  <div
                    className="h-full w-full rounded-lg bg-gradient-to-br from-[#4F46E5]/10 to-[#1e293b] flex items-center justify-center"
                  >
                    <Image className="h-4 w-4 text-[#475569]" />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-[#1e293b] p-2">
              <div className="h-5 w-5 rounded-full bg-[#4F46E5]/30 flex items-center justify-center">
                <MessageSquare className="h-3 w-3 text-[#4F46E5]" />
              </div>
              <div className="flex-1">
                <div className="h-2 w-28 rounded bg-[#1e293b]" />
                <div className="mt-1 h-1.5 w-20 rounded bg-[#1e293b]" />
              </div>
              <div className="h-3 w-8 rounded bg-[#22c55e]/20 flex items-center justify-center">
                <span className="text-[6px] font-bold text-[#22c55e]">NEW</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 md:pt-36 md:pb-24">
      <div className="pointer-events-none absolute inset-0 -top-40 opacity-30">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#4F46E5]/20 blur-[120px]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <h1
              data-animate
              className="text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              Share Albums.
              <br />
              Collect Feedback.
              <br />
              <span className="text-[#4F46E5]">Get Client Approvals Faster.</span>
            </h1>
            <p
              data-animate
              className="mt-5 max-w-xl text-base leading-relaxed text-[#94a3b8] sm:text-lg"
            >
              AlbumFlow helps photographers and studios share albums, manage client feedback,
              track revisions, and finalize approvals before printing.
            </p>
            <div
              data-animate
              className="mt-8 flex flex-col items-center gap-3 sm:flex-row lg:items-start"
            >
              <Link
                to={ROUTES.SIGNUP}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-6 text-sm font-medium text-white transition-all hover:bg-[#4338CA] sm:w-auto"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#1e293b] px-6 text-sm font-medium text-[#94a3b8] transition-all hover:border-[#334155] hover:text-white sm:w-auto"
              >
                Login
              </Link>
            </div>
            <div
              data-animate
              className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 lg:justify-start"
            >
              {TRUST_INDICATORS.map((text) => (
                <span
                  key={text}
                  className="flex items-center gap-2 text-sm text-[#64748b]"
                >
                  <span className="h-1 w-1 rounded-full bg-[#4F46E5]" />
                  {text}
                </span>
              ))}
            </div>
          </div>
          <div
            data-animate
            className="flex-1"
          >
            <HeroVisual />
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t border-[#1e293b] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center" data-animate>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How AlbumFlow Works
          </h2>
          <p className="mt-3 text-[#94a3b8]">
            A simple workflow from upload to approval.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => (
            <div
              key={step.title}
              data-animate
              className="group rounded-2xl border border-[#1e293b] bg-[#0F172A] p-6 transition-all duration-300 hover:border-[#4F46E5]/40 hover:shadow-lg hover:shadow-[#4F46E5]/5"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5] transition-colors group-hover:bg-[#4F46E5]/20">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-[#94a3b8]">{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section id="studios" className="border-t border-[#1e293b] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center" data-animate>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built For Professional Photography Workflows
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-[#94a3b8]">
            Replace scattered WhatsApp messages, screenshots, and calls with one organized
            review system.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <div
              key={feature.title}
              data-animate
              className="rounded-2xl border border-[#1e293b] bg-[#0F172A] p-6 transition-all duration-300 hover:border-[#4F46E5]/40"
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#4F46E5]/10 text-[#4F46E5]">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-1.5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="text-sm leading-relaxed text-[#94a3b8]">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTASection() {
  return (
    <section className="border-t border-[#1e293b] py-20 md:py-28">
      <div className="mx-auto max-w-3xl px-5 text-center" data-animate>
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 -top-20">
            <div className="mx-auto h-[300px] w-[300px] rounded-full bg-[#4F46E5]/10 blur-[100px]" />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to simplify album approvals?
            </h2>
            <p className="mt-4 text-lg text-[#94a3b8]">
              Create your studio and start sharing albums today.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to={ROUTES.SIGNUP}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4F46E5] px-7 text-sm font-medium text-white transition-all hover:bg-[#4338CA]"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-[#1e293b] px-7 text-sm font-medium text-[#94a3b8] transition-all hover:border-[#334155] hover:text-white"
              >
                Login
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="border-t border-[#1e293b] py-12">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-6 w-6" />
            <span className="text-sm font-semibold text-white">AlbumFlow</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#studios" className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]">
              Features
            </a>
            <Link to={ROUTES.LOGIN} className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]">
              Login
            </Link>
            <Link to={ROUTES.SIGNUP} className="text-xs text-[#64748b] transition-colors hover:text-[#94a3b8]">
              Sign Up
            </Link>
          </div>
        </div>
        <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-[#1e293b] pt-6 md:flex-row">
          <p className="text-xs text-[#475569]">
            &copy; AlbumFlow 2026
          </p>
          <p className="text-xs text-[#475569]">
            Built for photographers and album studios.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  useScrollAnimations();
  return (
    <div className="min-h-dvh bg-[#0B0F14]">
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </div>
  );
}
