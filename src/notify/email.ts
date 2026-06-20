import { config } from "../config";

export interface AlertEmail {
  subject: string;
  text: string;
}

// Sends via Resend when configured; otherwise prints the email to the console (dry run),
// so local runs never depend on any email credentials.
export async function sendAlert(email: AlertEmail): Promise<"sent" | "dry-run" | "error"> {
  if (!config.resendApiKey || !config.alertTo) {
    console.log("\n──────── EMAIL (dry run — set RESEND_API_KEY + ALERT_TO to send) ────────");
    console.log("To:     ", config.alertTo || "(unset)");
    console.log("Subject:", email.subject);
    console.log(email.text);
    console.log("────────────────────────────────────────────────────────────────────────\n");
    return "dry-run";
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(config.resendApiKey);
    await resend.emails.send({
      from: config.alertFrom,
      to: config.alertTo,
      subject: email.subject,
      text: email.text,
    });
    return "sent";
  } catch (err) {
    console.error("Email send failed:", err);
    return "error";
  }
}
