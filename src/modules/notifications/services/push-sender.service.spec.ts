import { PushSenderService, PushRecipient } from './push-sender.service';

describe('PushSenderService', () => {
  let service: PushSenderService;
  let fetchMock: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new PushSenderService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  const jsonResponse = (data: unknown): Response =>
    ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve({ data }),
    }) as unknown as Response;

  const parsedBody = (call: number): unknown[] => {
    const options = fetchMock.mock.calls[call][1];
    return JSON.parse(options?.body as string) as unknown[];
  };

  it('sends a single push request for a small batch', async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ status: 'ok' }]));

    const recipients: PushRecipient[] = [
      { userId: 'u1', token: 'ExponentPushToken[abc]' },
    ];
    const stale = await service.send(recipients, 'Title', 'Body', {
      url: '/messages',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://exp.host/--/api/v2/push/send',
    );
    expect(parsedBody(0)).toEqual([
      {
        to: 'ExponentPushToken[abc]',
        title: 'Title',
        body: 'Body',
        data: { url: '/messages' },
      },
    ]);
    expect(stale).toEqual([]);
  });

  it('splits requests into batches of 100 recipients', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(Array.from({ length: 100 }, () => ({ status: 'ok' }))),
    );

    const recipients: PushRecipient[] = Array.from({ length: 150 }, (_, i) => ({
      userId: `u${i}`,
      token: `ExponentPushToken[${i}]`,
    }));

    await service.send(recipients, 'Title', 'Body');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(parsedBody(0)).toHaveLength(100);
    expect(parsedBody(1)).toHaveLength(50);
  });

  it('returns userIds for tickets with DeviceNotRegistered errors', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        { status: 'ok' },
        {
          status: 'error',
          message: 'not registered',
          details: { error: 'DeviceNotRegistered' },
        },
      ]),
    );

    const recipients: PushRecipient[] = [
      { userId: 'u1', token: 'ExponentPushToken[good]' },
      { userId: 'u2', token: 'ExponentPushToken[stale]' },
    ];

    const stale = await service.send(recipients, 'Title', 'Body');

    expect(stale).toEqual(['u2']);
  });

  it('does not mark non-DeviceNotRegistered errors as stale', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse([
        {
          status: 'error',
          message: 'rate limited',
          details: { error: 'MessageRateExceeded' },
        },
      ]),
    );

    const recipients: PushRecipient[] = [
      { userId: 'u1', token: 'ExponentPushToken[abc]' },
    ];
    const stale = await service.send(recipients, 'Title', 'Body');

    expect(stale).toEqual([]);
  });

  it('continues to the next batch when a request fails outright', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as unknown as Response);

    const recipients: PushRecipient[] = [
      { userId: 'u1', token: 'ExponentPushToken[abc]' },
    ];
    const stale = await service.send(recipients, 'Title', 'Body');

    expect(stale).toEqual([]);
  });
});
