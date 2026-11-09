import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from '../dist/health.controller.js';

test('health reports readiness when PostgreSQL responds', async () => {
  const query = test.mock.fn(async () => [{ '?column?': 1 }]);
  const controller = new HealthController({ $queryRaw: query });

  assert.deepEqual(await controller.check(), { status: 'ok' });
  assert.equal(query.mock.callCount(), 1);
});

test('health reports service unavailable when PostgreSQL cannot be reached', async () => {
  const controller = new HealthController({
    async $queryRaw() {
      throw new Error('connection refused');
    },
  });

  await assert.rejects(controller.check(), (error) =>
    error instanceof ServiceUnavailableException && error.getStatus() === 503,
  );
});
