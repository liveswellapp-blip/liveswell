import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Send, FlaskConical, MessageSquareReply, Copy, CheckCheck } from "lucide-react";

interface SurfSpot {
  id: number;
  name: string;
  region?: string;
  country?: string;
}

interface SurfSpotsResponse {
  logs: SurfSpot[];
  total: number;
}

interface TestAlertResult {
  success: boolean;
  results: Record<string, boolean>;
  message?: string;
}

type Channel = "sms" | "email" | "both";

function TwoWaySmsSetup() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = `${window.location.origin}/api/twilio/incoming`;

  const copy = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card className="mb-8 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-base">
          <MessageSquareReply className="h-5 w-5 text-blue-600" />
          <span>Two-Way SMS — Twilio Webhook Setup</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground">
          Users can reply to SMS alerts and get AI-powered surf answers. To enable it, set
          the <strong>A MESSAGE COMES IN</strong> webhook in your{" "}
          <a
            href="https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-500"
          >
            Twilio phone number settings
          </a>
          :
        </p>
        <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2 font-mono text-xs break-all">
          <span className="flex-1 select-all">{webhookUrl}</span>
          <button
            type="button"
            onClick={copy}
            className="shrink-0 p-1 rounded hover:bg-accent"
            title="Copy URL"
          >
            {copied ? (
              <CheckCheck className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>Method: <strong className="text-foreground">HTTP POST</strong></li>
          <li>STOP / UNSUBSCRIBE replies automatically disable SMS alerts for that user</li>
          <li>HELP replies return a list of example questions</li>
          <li>Unrecognised phone numbers receive a sign-up prompt</li>
        </ul>
      </CardContent>
    </Card>
  );
}

export default function LiveAlertTest() {
  const { toast } = useToast();

  const [channel, setChannel] = useState<Channel>("email");
  const [toPhone, setToPhone] = useState("");
  const [toEmail, setToEmail] = useState("");
  const [locationId, setLocationId] = useState<string>("");

  // Fetch surf spots for the dropdown
  const { data: spotsData, isLoading: spotsLoading } = useQuery<SurfSpotsResponse>({
    queryKey: ["/api/admin/surf-spots"],
    queryFn: async () => {
      const res = await fetch("/api/admin/surf-spots?limit=200");
      if (!res.ok) throw new Error("Failed to load surf spots");
      return res.json();
    },
  });

  const spots = spotsData?.logs ?? [];

  const sendMutation = useMutation<TestAlertResult, Error>({
    mutationFn: async () => {
      const body: Record<string, string | number> = {
        channel,
        locationId: parseInt(locationId, 10),
      };
      if (channel === "sms" || channel === "both") body.toPhone = toPhone;
      if (channel === "email" || channel === "both") body.toEmail = toEmail;

      const res = await fetch("/api/admin/test-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      return data;
    },
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.results.sms !== undefined)
        parts.push(`SMS: ${data.results.sms ? "✓ delivered" : "✗ failed"}`);
      if (data.results.email !== undefined)
        parts.push(`Email: ${data.results.email ? "✓ delivered" : "✗ failed"}`);

      if (data.success) {
        toast({
          title: "Test alert sent",
          description: parts.join(" · "),
        });
      } else {
        toast({
          title: "Test alert had failures",
          description: parts.join(" · "),
          variant: "destructive",
        });
      }
    },
    onError: (err) => {
      toast({
        title: "Test alert failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const needsPhone = channel === "sms" || channel === "both";
  const needsEmail = channel === "email" || channel === "both";

  const isValid =
    locationId !== "" &&
    (!needsPhone || toPhone.trim() !== "") &&
    (!needsEmail || toEmail.trim() !== "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    sendMutation.mutate();
  };

  return (
    <>
    <TwoWaySmsSetup />
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FlaskConical className="h-5 w-5" />
          <span>Live Alert Test</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Channel selector */}
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <div className="flex gap-3">
              {(["sms", "email", "both"] as Channel[]).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannel(ch)}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    channel === ch
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {ch === "sms" ? "SMS" : ch === "email" ? "Email" : "Both"}
                </button>
              ))}
            </div>
          </div>

          {/* Phone field */}
          {needsPhone && (
            <div className="space-y-1.5">
              <Label htmlFor="test-phone">
                Phone number{" "}
                <span className="text-muted-foreground text-xs">(E.164 format, e.g. +15551234567)</span>
              </Label>
              <Input
                id="test-phone"
                type="tel"
                placeholder="+15551234567"
                value={toPhone}
                onChange={(e) => setToPhone(e.target.value)}
                required={needsPhone}
                data-testid="input-test-phone"
              />
            </div>
          )}

          {/* Email field */}
          {needsEmail && (
            <div className="space-y-1.5">
              <Label htmlFor="test-email">Email address</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="admin@example.com"
                value={toEmail}
                onChange={(e) => setToEmail(e.target.value)}
                required={needsEmail}
                data-testid="input-test-email"
              />
            </div>
          )}

          {/* Location dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="test-location">Surf spot</Label>
            <select
              id="test-location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              required
              data-testid="select-test-location"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">
                {spotsLoading ? "Loading spots…" : "Select a surf spot"}
              </option>
              {spots.map((spot) => (
                <option key={spot.id} value={String(spot.id)}>
                  {spot.name}
                  {spot.region ? ` — ${spot.region}` : ""}
                </option>
              ))}
            </select>
          </div>

          <Button
            type="submit"
            disabled={!isValid || sendMutation.isPending}
            data-testid="button-send-test-alert"
            className="w-full sm:w-auto"
          >
            <Send className="h-4 w-4 mr-2" />
            {sendMutation.isPending ? "Sending…" : "Send Test"}
          </Button>
        </form>
      </CardContent>
    </Card>
    </>
  );
}
