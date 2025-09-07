"use client";

import type React from "react";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Contact form component
 *
 * Features:
 * - Name, email, subject, and message fields with validation
 * - Submit button with loading state
 * - Success/error message display
 */
export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  // const [ticketId, setTicketId] = useState<string | null>(null);

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      setStatus("error");
      setMessage("Please fill out all fields");
      return;
    }

    setStatus("loading");

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      // setTicketId(data.ticketId);
      setStatus("success");
      setMessage(
        `Thanks for reaching out! Your request has been received and our support team will contact you shortly. Please keep your ticket ID (${data.ticketId}) for reference.`
      );
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Your Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          name="name"
          value={formData.name}
          onChange={handleChange}
          disabled={status === "loading"}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Your Name</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          name="email"
          value={formData.email}
          onChange={handleChange}
          disabled={status === "loading"}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          type="text"
          placeholder="Regarding my store setup..."
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          disabled={status === "loading"}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          placeholder="Describe your issue..."
          rows={5}
          name="message"
          value={formData.message}
          onChange={handleChange}
          className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={status === "loading"}
          required
        />
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white border border-soraxi-green"
      >
        {status === "loading" ? (
          "Sending..."
        ) : (
          <>
            Send Message <Send className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>

      {/* Status message */}
      {status === "success" && (
        <div className="p-4 rounded-md bg-soraxi-green/10 text-soraxi-green">
          {message}
        </div>
      )}
      {status === "error" && (
        <div className="p-4 bg-red-100 text-red-600 rounded-md">{message}</div>
      )}
    </form>
  );
}
