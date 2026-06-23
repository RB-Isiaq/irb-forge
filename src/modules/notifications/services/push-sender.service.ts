import { Injectable, Logger } from '@nestjs/common';

export interface PushRecipient {
  userId: string;
  token: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

@Injectable()
export class PushSenderService {
  private readonly logger = new Logger(PushSenderService.name);

  /** Sends a push to each recipient, returns userIds whose token is no longer registered. */
  async send(
    recipients: PushRecipient[],
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<string[]> {
    const staleUserIds: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(
          batch.map(({ token }) => ({ to: token, title, body, data })),
        ),
      });

      if (!res.ok) {
        this.logger.error(
          `Expo push request failed: ${res.status} ${res.statusText}`,
        );
        continue;
      }

      const json = (await res.json()) as { data: ExpoPushTicket[] };
      json.data.forEach((ticket, idx) => {
        if (ticket.status !== 'error') return;
        this.logger.error(
          `Push failed for user ${batch[idx].userId}: ${ticket.message}`,
        );
        if (ticket.details?.error === 'DeviceNotRegistered') {
          staleUserIds.push(batch[idx].userId);
        }
      });
    }

    return staleUserIds;
  }
}
