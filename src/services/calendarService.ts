/**
 * Google Calendar Integration Service for KANGI Stock Manager Follow-ups
 * Uses standard Google Calendar API v3 with client-side OAuth Bearer token.
 */
import { FollowUp } from '../types';

export interface CalendarEventPayload {
  customerName: string;
  customerPhone: string;
  productOrService: string;
  reason: string;
  notes?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  reminderTiming?: '10_min' | '30_min' | '1_hour' | '1_day';
}

const REMINDER_MINUTES_MAP: Record<string, number> = {
  '10_min': 10,
  '30_min': 30,
  '1_hour': 60,
  '1_day': 1440,
};

export class GoogleCalendarService {
  private static accessToken: string | null = null;
  private static userEmail: string | null = null;

  static setAccessToken(token: string | null, email?: string) {
    this.accessToken = token;
    if (email) this.userEmail = email;
    if (token) {
      sessionStorage.setItem('kangi_gcal_token', token);
      if (email) sessionStorage.setItem('kangi_gcal_email', email);
    } else {
      sessionStorage.removeItem('kangi_gcal_token');
      sessionStorage.removeItem('kangi_gcal_email');
    }
  }

  static getAccessToken(): string | null {
    if (!this.accessToken) {
      this.accessToken = sessionStorage.getItem('kangi_gcal_token');
    }
    return this.accessToken;
  }

  static getUserEmail(): string | null {
    if (!this.userEmail) {
      this.userEmail = sessionStorage.getItem('kangi_gcal_email');
    }
    return this.userEmail;
  }

  static isConnected(): boolean {
    return !!this.getAccessToken();
  }

  static isConfigured(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Disconnects current session
   */
  static disconnect(): void {
    this.setAccessToken(null);
  }

  /**
   * Helper to format RFC3339 date strings for Google Calendar
   */
  private static formatEventDateTime(date: string, time?: string): { start: any; end: any } {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Nairobi';

    if (time) {
      const [hours, minutes] = time.split(':');
      const startDate = new Date(date);
      startDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

      const endDate = new Date(startDate.getTime() + 30 * 60 * 1000); // 30 min duration default

      return {
        start: { dateTime: startDate.toISOString(), timeZone },
        end: { dateTime: endDate.toISOString(), timeZone },
      };
    } else {
      // All day event
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      return {
        start: { date },
        end: { date: nextDay.toISOString().split('T')[0] },
      };
    }
  }

  /**
   * Creates an event in user's primary Google Calendar
   */
  static async createEvent(
    payload: CalendarEventPayload
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const token = this.getAccessToken();
    if (!token) {
      return {
        success: false,
        error: 'Google Calendar is not connected. Please connect your Google account in Settings.',
      };
    }

    const { start, end } = this.formatEventDateTime(payload.date, payload.time);
    const reminderMinutes = REMINDER_MINUTES_MAP[payload.reminderTiming || '30_min'] || 30;

    const eventBody = {
      summary: `Follow up - ${payload.customerName} - ${payload.productOrService || payload.reason}`,
      description: `Customer: ${payload.customerName}\nPhone: ${payload.customerPhone}\nProduct: ${payload.productOrService}\nReason: ${payload.reason}\nNotes: ${payload.notes || 'N/A'}\n\nCreated from KANGI Stock Manager`,
      start,
      end,
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: reminderMinutes }],
      },
    };

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Google API error: ${response.statusText}`);
      }

      const createdEvent = await response.json();
      return { success: true, eventId: createdEvent.id };
    } catch (err: any) {
      console.warn('Failed to create Google Calendar event:', err);
      return { success: false, error: err.message || 'Failed to sync with Google Calendar' };
    }
  }

  /**
   * Helper wrapper taking FollowUp object
   */
  static async createFollowUpEvent(followUp: FollowUp): Promise<string | null> {
    const res = await this.createEvent({
      customerName: followUp.customerName,
      customerPhone: followUp.customerPhone,
      productOrService: followUp.productOrService,
      reason: followUp.reasonForFollowUp,
      notes: followUp.notes,
      date: followUp.date,
      time: followUp.time,
      reminderTiming: followUp.reminderTiming || '30_min',
    });
    return res.success && res.eventId ? res.eventId : null;
  }

  /**
   * Updates an existing event in Google Calendar
   */
  static async updateEvent(
    eventId: string,
    payload: CalendarEventPayload
  ): Promise<{ success: boolean; error?: string }> {
    const token = this.getAccessToken();
    if (!token || !eventId) {
      return { success: false, error: 'Google Calendar not connected or missing Event ID' };
    }

    const { start, end } = this.formatEventDateTime(payload.date, payload.time);
    const reminderMinutes = REMINDER_MINUTES_MAP[payload.reminderTiming || '30_min'] || 30;

    const eventBody = {
      summary: `Follow up - ${payload.customerName} - ${payload.productOrService || payload.reason}`,
      description: `Customer: ${payload.customerName}\nPhone: ${payload.customerPhone}\nProduct: ${payload.productOrService}\nReason: ${payload.reason}\nNotes: ${payload.notes || 'N/A'}\n\nUpdated from KANGI Stock Manager`,
      start,
      end,
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: reminderMinutes }],
      },
    };

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Google API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Failed to update Google Calendar event:', err);
      return { success: false, error: err.message || 'Failed to update Google Calendar' };
    }
  }

  static async updateFollowUpEvent(followUp: FollowUp): Promise<boolean> {
    if (!followUp.googleCalendarEventId) return false;
    const res = await this.updateEvent(followUp.googleCalendarEventId, {
      customerName: followUp.customerName,
      customerPhone: followUp.customerPhone,
      productOrService: followUp.productOrService,
      reason: followUp.reasonForFollowUp,
      notes: followUp.notes,
      date: followUp.date,
      time: followUp.time,
      reminderTiming: followUp.reminderTiming || '30_min',
    });
    return res.success;
  }

  /**
   * Deletes an event in Google Calendar
   */
  static async deleteEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    const token = this.getAccessToken();
    if (!token || !eventId) return { success: false, error: 'Not connected' };

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok && response.status !== 404 && response.status !== 410) {
        throw new Error(`Google API error: ${response.statusText}`);
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Failed to delete Google Calendar event:', err);
      return { success: false, error: err.message };
    }
  }

  static async deleteFollowUpEvent(eventId: string): Promise<boolean> {
    const res = await this.deleteEvent(eventId);
    return res.success;
  }
}
