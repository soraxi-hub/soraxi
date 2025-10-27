import type React from "react";
import { Html, Head, Body, Container, Section } from "@react-email/components";
import { EmailHeader } from "./email-header";
import { EmailFooter } from "./email-footer";

/**
 * Main email container component
 * Wraps all email content with consistent styling and structure
 */
export function EmailContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Html lang="en">
      <Head>
        <title>{title}</title>
        <style>{`
          body {
            font-family: 'Inter', 'Roboto', Arial, sans-serif;
            background-color: #f9f9f9;
            padding: 20px;
            color: #333;
            margin: 0;
          }
          .container {
            max-width: 860px;
            margin: auto;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
            padding: 10px;
          }
          .content {
          padding: 0px 10px;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            margin: 20px 0;
            padding: 12px 24px;
            background-color: #14a800;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
          .button:hover {
            background-color: #0f8000;
          }
          .code {
            word-break: break-all;
            background: #f1f1f1;
            padding: 10px;
            border-radius: 4px;
            display: block;
            font-family: monospace;
            font-size: 14px;
            margin-top: 10px;
          }
          @media (prefers-color-scheme: dark) {
            body {
              background-color: #1a1a1a;
              color: #e0e0e0;
            }
            .container {
              background-color: #2a2a2a;
            }
            .code {
              background: #3a3a3a;
              color: #e0e0e0;
            }
          }
        `}</style>
      </Head>
      <Body>
        <Container className="container">
          <EmailHeader title={title} />
          <Section className="content">{children}</Section>
          <EmailFooter />
        </Container>
      </Body>
    </Html>
  );
}
