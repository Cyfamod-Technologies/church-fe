/* eslint-disable @next/next/no-css-tags */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LFC Church Management",
  description: "Next.js TypeScript frontend for the LFC church management workspace.",
  icons: {
    icon: "/assets/images/logo/favicon.png",
    shortcut: "/assets/images/logo/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link href="/assets/images/logo/favicon.png" rel="icon" type="image/x-icon" />
        <link href="/assets/images/logo/favicon.png" rel="shortcut icon" type="image/x-icon" />
        <link href="/assets/vendor/animation/animate.min.css" rel="stylesheet" />
        <link href="/assets/vendor/fontawesome/css/all.css" rel="stylesheet" />
        <link href="/assets/vendor/flag-icons-master/flag-icon.css" rel="stylesheet" type="text/css" />
        <link href="/assets/vendor/tabler-icons/tabler-icons.css" rel="stylesheet" type="text/css" />
        <link href="/assets/vendor/bootstrap/bootstrap.min.css" rel="stylesheet" type="text/css" />
        <link href="/assets/vendor/simplebar/simplebar.css" rel="stylesheet" type="text/css" />
        <link href="/assets/css/style.css" rel="stylesheet" type="text/css" />
        <link href="/assets/css/responsive.css" rel="stylesheet" type="text/css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
