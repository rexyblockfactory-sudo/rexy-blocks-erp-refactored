"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

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
      {
        label: "Website Orders",
        href: "/website-orders",
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
  {
    label: "Payroll",
    items: [
      {
        label: "Payroll & Labour",
        href: "/payroll",
      },
    ],
  },
];

const employeeNavigation: NavSection = {
  label: "Administration",
  items: [
    {
      label: "Employees",
      href: "/employees",
    },
  ],
};

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPageTitle(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname.startsWith("/sales")) return "Sales";
  if (pathname.startsWith("/website-orders")) return "Website Orders";
  if (pathname.startsWith("/production")) return "Production";
  if (pathname.startsWith("/inventory")) return "Inventory";
  if (pathname.startsWith("/customers")) return "Customers";
  if (pathname.startsWith("/products")) return "Products";
  if (pathname.startsWith("/invoices")) return "Invoices";
  if (pathname.startsWith("/payroll")) return "Payroll & Labour";
  if (pathname.startsWith("/employees")) return "Employees";

  return "Rexy Blocks Factory";
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    async function loadUserRole() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setIsAdmin(false);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error(
            "Failed to load user role:",
            error
          );

          setIsAdmin(false);
          return;
        }

        setIsAdmin(
          data?.role?.toLowerCase() === "admin"
        );
      } catch (error) {
        console.error(
          "Failed to check admin role:",
          error
        );

        setIsAdmin(false);
      } finally {
        setRoleLoading(false);
      }
    }

    loadUserRole();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (
      !roleLoading &&
      !isAdmin &&
      pathname.startsWith("/employees")
    ) {
      router.replace("/dashboard");
    }
  }, [
    isAdmin,
    roleLoading,
    pathname,
    router,
  ]);

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await supabase.auth.signOut();

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-gray-900 px-4 text-white lg:hidden">
        <Link
          href="/dashboard"
          className="font-bold"
        >
          REXY BLOCKS
        </Link>

        <button
          type="button"
          onClick={() =>
            setMobileMenuOpen(
              !mobileMenuOpen
            )
          }
          className="rounded-lg border border-white/30 px-3 py-2"
        >
          {mobileMenuOpen
            ? "Close"
            : "Menu"}
        </button>
      </header>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-40 bg-white shadow-xl lg:hidden">
          <div className="max-h-[calc(100vh-4rem)] overflow-y-auto p-4">
            <Navigation
              pathname={pathname}
              isAdmin={isAdmin}
              onNavigate={() =>
                setMobileMenuOpen(false)
              }
            />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-6 w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-white shadow-lg lg:block">
        <div className="flex h-full flex-col">
          <div className="border-b p-6">
            <Link
              href="/dashboard"
              className="block"
            >
              <h1 className="text-xl font-bold">
                REXY BLOCKS
              </h1>

              <p className="text-sm text-gray-500">
                Factory Management
              </p>
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <Navigation
              pathname={pathname}
              isAdmin={isAdmin}
            />
          </div>

          <div className="border-t p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-lg bg-red-600 px-4 py-3 font-semibold text-white"
            >
              {loggingOut
                ? "Logging out..."
                : "Logout"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        <header className="hidden h-16 items-center justify-between bg-white px-8 shadow-sm lg:flex">
          <h2 className="text-lg font-semibold">
            {getPageTitle(pathname)}
          </h2>

          <div className="text-sm text-gray-500">
            Rexy Blocks Factory
          </div>
        </header>

        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}

function Navigation({
  pathname,
  isAdmin,
  onNavigate,
}: {
  pathname: string;
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const sections = isAdmin
    ? [...navigation, employeeNavigation]
    : navigation;

  return (
    <nav className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-gray-400">
            {section.label}
          </p>

          <div className="space-y-1">
            {section.items.map((item) => {
              const active = isActivePath(
                pathname,
                item.href
              );

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-gray-900 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}