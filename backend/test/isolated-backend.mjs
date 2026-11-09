import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';
import { promisify } from 'node:util';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';

const exec = promisify(execFile);
export const docker = (...args) => exec('docker', args);

async function waitForPostgres(container) {
  const deadline = Date.now() + 30_000;
  while (true) {
    try {
      await docker('exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'card', '-d', 'card');
      return;
    } catch (error) {
      if (Date.now() >= deadline || ![1, 2].includes(error.code)) throw error;
      await setTimeout(250);
    }
  }
}

async function observeStatements(container, sql, request) {
  const start = `start-${randomUUID()}`;
  const end = `end-${randomUUID()}`;
  await sql(`SELECT '${start}'`);
  await request();
  await sql(`SELECT '${end}'`);

  // Markers delimit request traffic and let Docker finish collecting PostgreSQL's logs.
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const { stderr } = await docker('logs', container);
    const lines = stderr.split('\n');
    const first = lines.findIndex((line) => line.includes(start));
    const last = lines.findIndex((line) => line.includes(end));
    if (first >= 0 && last > first) {
      return lines.slice(first + 1, last).filter((line) => /\b(?:statement|execute [^:]+): /iu.test(line));
    }
    await setTimeout(50);
  }
  throw new Error('PostgreSQL did not log the request boundaries');
}

export async function withIsolatedBackend(check) {
  const id = randomUUID();
  const { stdout } = await docker(
    'create', '--name', `it-solutions-profile-test-${id}`,
    '--publish', '127.0.0.1::5432',
    '--env', 'POSTGRES_DB=card', '--env', 'POSTGRES_USER=card',
    '--env', `POSTGRES_PASSWORD=${id}`, 'postgres:18.6', '-c', 'log_statement=all',
  );
  const container = stdout.trim();
  const originalDatabaseUrl = process.env.DATABASE_URL;
  let app;

  try {
    await docker('start', container);
    await waitForPostgres(container);
    const { stdout: address } = await docker('port', container, '5432/tcp');
    const databaseUrl = `postgresql://card:${id}@${address.trim()}/card`;
    const sql = (statement) => docker(
      'exec', container, 'psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', 'card', '-d', 'card', '-c', statement,
    );
    const migrate = () => exec('prisma', ['migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      timeout: 30_000,
    });
    await migrate();

    process.env.DATABASE_URL = databaseUrl;
    app = await NestFactory.create(AppModule, { abortOnError: false, logger: false });
    await app.listen(0, '127.0.0.1');
    await check({
      baseUrl: await app.getUrl(),
      container,
      migrate,
      sql,
      observeStatements: (request) => observeStatements(container, sql, request),
    });
  } finally {
    try {
      await app?.close();
    } finally {
      if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = originalDatabaseUrl;
      await docker('rm', '--force', '--volumes', container);
    }
  }
}
