import React from "react";
import type { Metadata } from "next";
import ContactPageClient from "@/components/contact/ContactPageClient";

export const metadata: Metadata = {
  title: "Contact Us & Business Inquiries | PlateSync Technologies",
  description:
    "Contact PlateSync Founder Mohd Rayyan for restaurant onboarding, table QR code setup, and technical inquiries. Operating from Kerala, India with a 2-4 hour response guarantee.",
};

export default function ContactPage() {
  return <ContactPageClient />;
}
