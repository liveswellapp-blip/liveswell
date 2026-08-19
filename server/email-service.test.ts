import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockProxy = vi.fn();

vi.mock('@replit/connectors-sdk', () => ({
  ReplitConnectors: function MockConnectors(this: { proxy: typeof mockProxy }) {
    this.proxy = mockProxy;
  },
}));

vi.mock('./storage', () => ({ storage: {} }));
vi.mock('./weather-service', () => ({
  fetchWeatherData: vi.fn(),
  getQuotaExceededAt: vi.fn(),
}));
vi.mock('./ai-service', () => ({ generateNotificationSummary: vi.fn() }));
vi.mock('./unsubscribe-token', () => ({ createUnsubscribeToken: vi.fn() }));

const originalFromEmail = process.env.RESEND_FROM_EMAIL;

async function loadEmailService(fromEmail?: string) {
  vi.resetModules();
  if (fromEmail) {
    process.env.RESEND_FROM_EMAIL = fromEmail;
  } else {
    delete process.env.RESEND_FROM_EMAIL;
  }
  return import('./email-service');
}

describe('EmailService welcome sender', () => {
  beforeEach(() => {
    mockProxy.mockReset();
  });

  afterEach(() => {
    if (originalFromEmail === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = originalFromEmail;
    }
  });

  it('sends welcome email from the configured LiveSwell sender', async () => {
    const from = 'LiveSwell <hello@liveswell.io>';
    mockProxy.mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'email_123' }),
    });
    const { EmailService } = await loadEmailService(from);

    const sent = await EmailService.sendWelcomeEmail(
      'surfer@example.com',
      'Ada',
      'Lovelace',
      'https://liveswell.io/sign-in?__clerk_ticket=example',
    );

    expect(sent).toBe(true);
    expect(mockProxy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockProxy.mock.calls[0][2].body);
    expect(payload.from).toBe(from);
    expect(payload.from).not.toContain('onboarding@resend.dev');
  });

  it('does not retry a rejected sender through Resend’s shared address', async () => {
    mockProxy.mockResolvedValue({
      ok: false,
      status: 403,
      text: async () => 'The domain is not verified',
    });
    const { EmailService } = await loadEmailService('LiveSwell <hello@liveswell.io>');

    const sent = await EmailService.sendWelcomeEmail(
      'surfer@example.com',
      null,
      null,
      'https://liveswell.io/sign-in?__clerk_ticket=example',
    );

    expect(sent).toBe(false);
    expect(mockProxy).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(mockProxy.mock.calls[0][2].body);
    expect(payload.from).toBe('LiveSwell <hello@liveswell.io>');
    expect(payload.from).not.toContain('onboarding@resend.dev');
  });

  it('refuses delivery when no verified sender is configured', async () => {
    const { EmailService } = await loadEmailService();

    const sent = await EmailService.sendWelcomeEmail(
      'surfer@example.com',
      null,
      null,
      'https://liveswell.io/sign-in?__clerk_ticket=example',
    );

    expect(sent).toBe(false);
    expect(mockProxy).not.toHaveBeenCalled();
  });
});