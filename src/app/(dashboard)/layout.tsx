"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  label: string;
  href: string;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

const navigation: NavSection[] = [
  {
    label: "Main",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
      },
    ],
  },

  {
    label: "Sales",
    items: [
      {
        label: "New Sale",
        href: "/sales/new",
      },
      {
        label: "Sales Overview",
        href: "/sales",
      },
      {
        label: "Sales History",
        href: "/sales/history",
      },
    ],
  },

  {
    label: "Production",
    items: [
      {
        label: "New Production",
        href: "/production",
      },
      {
        label: "Production History",
        href: "/production/history",
      },
    ],
  },

  {
    label: "Inventory",
    items: [
      {
        label: "Inventory",
        href: "/inventory",
      },
    ],
  },

  {
    label: "Customers",
    items: [
      {
        label: "Customers",
        href: "/customers",
      },
    ],
  },

  {
    label: "Products",
    items: [
      {
        label: "Products",
        href: "/products",
      },
    ],
  },

  {
    label: "Invoices",
    items: [
      {
        label: "Invoices",
        href: "/invoices",
      },
    ],
  },
];

function isActivePath(
  pathname: string,
  href: string
): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (href === "/sales") {
    return pathname === "/sales";
  }

  if (href === "/production") {
    return pathname === "/production";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`)
  );
}

function getPageTitle(
  pathname: string
): string {
  if (pathname === "/dashboard") {
    return "Dashboard";
  }

  if (pathname === "/sales/new") {
    return "New Sale";
  }

  if (pathname === "/sales/history") {
    return "Sales History";
  }

  if (pathname === "/sales") {
    return "Sales";
  }

  if (pathname === "/production/history") {
    return "Production History";
  }

  if (pathname === "/production") {
    return "Production";
  }

  if (pathname.startsWith("/inventory")) {
    return "Inventory";
  }

  if (pathname.startsWith("/customers")) {
    return "Customers";
  }

  if (pathname.startsWith("/products")) {
    return "Products";
  }

  if (pathname.startsWith("/invoices")) {
    return "Invoices";
  }

  return "Rexy Blocks Factory";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      const response = await fetch(
        "/api/auth/logout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Unable to log out."
        );
      }

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div
      className="relative min-h-screen bg-cover bg-center bg-fixed"
      style={{
        backgroundImage:
          'url("/rexy-background.png")',
      }}
    >
      {/* ======================================================
          BACKGROUND OVERLAY
      ====================================================== */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-black/60"
      />

      {/* ======================================================
          MOBILE HEADER
      ====================================================== */}
      <header className="sticky top-0 z-50 border-b border-gray-800/30 bg-black/85 text-white backdrop-blur-md lg:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <Link
            href="/dashboard"
            className="text-lg font-bold tracking-tight"
          >
            Rexy Blocks Factory
          </Link>

          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen(
                !mobileMenuOpen
              )
            }
            aria-label={
              mobileMenuOpen
                ? "Close navigation"
                : "Open navigation"
            }
            className="rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold hover:bg-white/10"
          >
            {mobileMenuOpen
              ? "Close"
              : "Menu"}
          </button>
        </div>
      </header>

      {/* ======================================================
          MOBILE NAVIGATION
      ====================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-gray-800/30 bg-white shadow-xl lg:hidden">
          <nav className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
            <Navigation
              pathname={pathname}
              onNavigate={() =>
                setMobileMenuOpen(false)
              }
            />

            <div className="mt-6 border-t pt-4">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loggingOut
                  ? "Logging out..."
                  : "Logout"}
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* ======================================================
          DESKTOP SIDEBAR
      ====================================================== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-gray-200 bg-white/95 shadow-xl backdrop-blur-md lg:block">
        <div className="flex h-full flex-col">
          {/* ==================================================
              BRAND
          ================================================== */}
          <div className="border-b px-6 py-5">
            <Link
              href="/dashboard"
              className="block"
            >
              <div className="text-xl font-extrabold tracking-tight">
                REXY BLOCKS
              </div>

              <div className="text-sm font-semibold text-gray-600">
                FACTORY
              </div>

              <div className="mt-1 text-xs text-gray-500">
                Management System
              </div>
            </Link>
          </div>

          {/* ==================================================
              NAVIGATION
          ================================================== */}
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <Navigation
              pathname={pathname}
            />
          </div>

          {/* ==================================================
              LOGOUT
          ================================================== */}
          <div className="border-t bg-gray-50/80 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-lg border border-red-200 bg-white px-4 py-2.5 text-left text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </aside>

      {/* ======================================================
          MAIN APPLICATION AREA
      ====================================================== */}
      <div className="lg:pl-64">
        {/* ====================================================
            DESKTOP TOP BAR
        ==================================================== */}
        <header className="hidden h-16 items-center justify-between border-b border-white/20 bg-black/75 px-6 text-white shadow-lg backdrop-blur-md lg:flex">
          <div>
            <p className="text-sm font-bold">
              REXY BLOCKS FACTORY
            </p>

            <p className="text-xs text-gray-300">
              Block Factory Management System
            </p>
          </div>

          <div className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
            {getPageTitle(pathname)}
          </div>
        </header>

        {/* ====================================================
            PAGE CONTENT
        ==================================================== */}
        <div className="min-h-[calc(100vh-4rem)] bg-white/10">
          <div className="min-h-[calc(100vh-4rem)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function Navigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-6">
      {navigation.map((section) => (
        <div key={section.label}>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            {section.label}
          </p>

          <div className="space-y-1">
            {section.items.map((item) => {
              const active =
                isActivePath(
                  pathname,
                  item.href
                );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={[
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-black text-white shadow-md"
                      : "text-gray-700 hover:bg-gray-100",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}