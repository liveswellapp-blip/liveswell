/**
 * test-alert-handler.ts
 *
 * Extracted request handler for POST /api/admin/test-alert so the logic can be
 * imported directly by tests without pulling in all of server/routes.ts.
 *
 * The handler is registered in server/routes.ts via:
 *   app.post("/api/admin/test-alert", requireAdminAuth, testAlertHandler);
 */

import type { Request, Response } from "express";
import { SMSService } from "./sms-service";
import { EmailService } from "./email-service";

export async function testAlertHandler(req: Request, res: Response): Promise<void> {
  try {
    const {
      channel,    // 'sms' | 'email' | 'both'
      toPhone,    // E.164 phone number for SMS
      toEmail,    // email address for email
      locationId, // numeric location ID to fetch conditions for
      alertId,    // optional: real alert ID — includes unsubscribe link in test email
    } = req.body;

    const locId = parseInt(locationId, 10);
    if (!locId || isNaN(locId)) {
      res.status(400).json({ message: "locationId is required" });
      return;
    }

    const parsedAlertId = alertId ? parseInt(alertId, 10) : undefined;

    const results: Record<string, boolean> = {};

    if ((channel === "sms" || channel === "both") && toPhone) {
      console.log(`🔧 Admin test SMS → ${toPhone} (locationId ${locId})`);
      results.sms = await SMSService.sendDailyConditions("admin-test", toPhone, locId);
    }

    if ((channel === "email" || channel === "both") && toEmail) {
      const logExtra = parsedAlertId
        ? ` with unsubscribe link (alertId ${parsedAlertId})`
        : " (no unsubscribe link — alertId not provided)";
      console.log(`🔧 Admin test email → ${toEmail} (locationId ${locId})${logExtra}`);
      results.email = await EmailService.sendDailyConditions(toEmail, locId, parsedAlertId);
    }

    if (Object.keys(results).length === 0) {
      res.status(400).json({
        message:
          "No valid channel/recipient combination. Provide toPhone for sms or toEmail for email.",
      });
      return;
    }

    res.json({
      success: Object.values(results).some((ok) => ok),
      results,
    });
  } catch (error) {
    console.error("Error in admin test-alert:", error);
    res.status(500).json({ message: "Test alert failed" });
  }
}
