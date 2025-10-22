import { render } from "@react-email/render";
import type React from "react";

/**
 * Renders a React Email component to HTML string
 * @param component - React component to render
 * @returns HTML string
 */
export async function renderTemplate(
  component: React.ReactElement
): Promise<string> {
  return render(component, { pretty: true });
}
