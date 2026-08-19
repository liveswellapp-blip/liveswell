import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockProxy = vi.fn();
const mockGetAdminSetting = vi.fn();

vi.mock('@replit/connectors-sdk', () => ({
  ReplitConnectors: function MockConnectors(this: { proxy: typeof mockProxy }) {
    this.proxy = mockProxy;
  },
}));

vi.mock('./db', () => ({ db: {} }));
vi.mock('@shared/schema', () => ({ pushHealthAlertState: {} }));
vi.mock('./storage', () => ({
  storage: { getAdminSetting: (...args: unknown[]) => mockGetAdminSetting(...args) },
}));

describe('push health email sender', () => {
  const originalFromEmail = process.env.RESEND_FROM_EMAIL;

  beforeEach(() => {
    mockProxy.mockReset();
    mockGetAdminSetting.mockReset();
    mockGetAdminSetting.mockResolvedValue('admin@example.com');
    mockProxy.mockResolvedValue({ ok: true, text: async () => '' });
  });

  afterEach(() => {
    if (originalFromEmail === undefined) {
      delete process.env.RESEND_FROM_EMAIL;
    } else {
      process.env.RESEND_FROM_EMAIL = originalFromEmail;
    }
  });

  it('does not call Resend when the configured sender is missing', async () => {
    delete process.env.RESEND_FROM_EMAIL;
    const { sendAdminAlert, sendApnsAdminAlert } = await import('./push-health-monitor');

    await sendAdminAlert({
      ok: false,
      vapidKeyConfigured: false,
      vapidKeyValid: false,
      pushServiceStatus: 'unhealthy',
      reason: 'missing VAPID keys',
    });
    await sendApnsAdminAlert({
      ok: false,
      configured: false,
      missing: ['APNS_KEY'],
      reason: 'missing APNs key',
    });

    expect(mockProxy).not.toHaveBeenCalled();
  });

  it('uses the configured LiveSwell sender for VAPID and APNs alerts', async () => {
    const from = 'LiveSwell <alerts@liveswell.io>';
    process.env.RESEND_FROM_EMAIL = from;
    const { sendAdminAlert, sendApnsAdminAlert } = await import('./push-health-monitor');

    await sendAdminAlert({
      ok: false,
      vapidKeyConfigured: true,
      vapidKeyValid: false,
      pushServiceStatus: 'degraded',
      reason: 'malformed VAPID key',
    });
    await sendApnsAdminAlert({
      ok: false,
      configured: false,
      missing: ['APNS_KEY_ID'],
      reason: 'missing APNs key ID',
    });

    expect(mockProxy).toHaveBeenCalledTimes(2);
    for (const [, , options] of mockProxy.mock.calls) {
      const payload = JSON.parse(options.body);
      expect(payload.from).toBe(from);
      expect(payload.from).not.toContain('onboarding@resend.dev');
    }
  });
});