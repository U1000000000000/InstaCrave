# Background Jobs (Quick Reference)

BullMQ queues live in `src/queue/`.

## Monitor

- Bull Board: http://localhost:3000/admin/queues

## Add jobs

```js
const { JOB_TYPES, addEmailJob, addOrderJob, addAnalyticsJob, addScheduledJob } = require('../queue');

await addEmailJob(JOB_TYPES.SEND_WELCOME_EMAIL, { to, userName });
await addOrderJob(JOB_TYPES.PROCESS_ORDER_PAYMENT, { orderId });
await addAnalyticsJob(JOB_TYPES.TRACK_USER_ACTION, { userId, action, metadata: {} });

await addScheduledJob(JOB_TYPES.CLEANUP_EXPIRED_SESSIONS, {}, { pattern: '0 2 * * *' });
```

## Job types

- Email: `SEND_WELCOME_EMAIL`, `SEND_ORDER_CONFIRMATION`, `SEND_ORDER_STATUS_UPDATE`
- Order: `PROCESS_ORDER_PAYMENT`, `NOTIFY_PARTNER_NEW_ORDER`
- Analytics: `TRACK_USER_ACTION`
- Scheduled: `CLEANUP_EXPIRED_SESSIONS`, `WARM_CACHE`, `SEND_DAILY_DIGEST`

Notes:

- In `NODE_ENV=test` the queue helpers are no-ops (tests don’t require Redis/BullMQ).
