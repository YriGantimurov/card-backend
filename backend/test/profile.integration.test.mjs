import assert from 'node:assert/strict';
import { test } from 'node:test';
import profileDetails from '../src/profile/profile.json' with { type: 'json' };

const staticFields = '{ about { name description } profile { name description } }';
const aboutFields = 'name description links { name url }';
const experienceFields = 'experience { company position startDate endDate achievements }';
const sectionFields = `
  ${experienceFields}
  projects { name url }
  skills { name }
`;

async function graphql({ baseUrl }, queryText) {
  const response = await fetch(new URL('/graphql', baseUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: queryText }),
    signal: AbortSignal.timeout(5000),
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function query(environment, queryText) {
  const result = await graphql(environment, queryText);
  assert.equal(result.errors, undefined, JSON.stringify(result.errors));
  return result.data;
}

async function checkProfile(environment) {
  const { baseUrl } = environment;
  const health = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(5000) });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });

  const { profile } = await query(environment, `{ profile { ${aboutFields} ${sectionFields} } }`);
  const { about, ...sections } = await query(environment, `{ about { ${aboutFields} } ${sectionFields} }`);
  const { name, description, links, ...profileSections } = profile;

  assert.ok(name && description);
  assert.ok(links.length && profile.projects.length && profile.skills.length);
  const currentJob = profile.experience.find(({ company }) => company === 'Яндекс');
  assert.ok(currentJob, 'the seeded current role is returned');
  assert.match(currentJob.startDate, /^\d{4}-(0[1-9]|1[0-2])$/);
  assert.equal(currentJob.endDate, null);
  assert.ok(currentJob.achievements.length);

  assert.deepEqual(about, { name, description, links });
  assert.deepEqual(sections, profileSections);
  return profile;
}

if (process.argv.includes('--isolated')) {
  const { docker, withIsolatedBackend } = await import('./isolated-backend.mjs');

  test('the empty database is seeded once and redeploy preserves the full profile', async () => {
    await withIsolatedBackend(async (environment) => {
      const sandbox = await fetch(new URL('/graphql', environment.baseUrl), {
        headers: { accept: 'text/html' },
        signal: AbortSignal.timeout(5000),
      });
      assert.equal(sandbox.status, 200);
      assert.match(sandbox.headers.get('content-type'), /text\/html/u);
      assert.match(await sandbox.text(), /EmbeddedSandbox|embeddable-sandbox/iu);
      assert.deepEqual(await query(environment, '{ __schema { queryType { name } } }'), {
        __schema: { queryType: { name: 'Query' } },
      });

      const profile = await checkProfile(environment);
      assert.deepEqual({
        links: profile.links.length,
        experience: profile.experience.length,
        projects: profile.projects.length,
        skills: profile.skills.length,
      }, { links: 1, experience: 3, projects: 3, skills: 23 });

      await environment.migrate();
      assert.deepEqual(await checkProfile(environment), profile);
    });
  });

  test('GraphQL serves selected fields, ordered experience, empty sections and database errors', async (t) => {
    await withIsolatedBackend(async (environment) => {
      const { baseUrl, container, sql, observeStatements } = environment;
      await t.test('empty sections and achievements are arrays and experience is newest first', async () => {
        await sql('TRUNCATE professional_links, work_experience, projects, skills');
        assert.deepEqual(await query(environment, `{
          profile { links { name } ${sectionFields} }
          about { links { name } }
          ${sectionFields}
        }`), {
          profile: { links: [], experience: [], projects: [], skills: [] },
          about: { links: [] },
          experience: [], projects: [], skills: [],
        });

        await sql(`
          INSERT INTO work_experience (company, position, start_date, end_date, achievements)
          VALUES ('First employer', 'Developer', '2022-01', '2023-04', ARRAY['Released a product']),
                 ('Current employer', 'Engineer', '2024-05', NULL, '{}')
        `);
        const expectedExperience = [
          {
            company: 'Current employer', position: 'Engineer', startDate: '2024-05',
            endDate: null, achievements: [],
          },
          {
            company: 'First employer', position: 'Developer', startDate: '2022-01',
            endDate: '2023-04', achievements: ['Released a product'],
          },
        ];
        assert.deepEqual(await query(environment, `{ profile { ${experienceFields} } ${experienceFields} }`), {
          profile: { experience: expectedExperience }, experience: expectedExperience,
        });
      });

      await t.test('static fields issue no SQL and a skills request reads only skills', async () => {
        await sql("INSERT INTO skills (name) VALUES ('Test skill')");
        const staticStatements = await observeStatements(async () => {
          assert.deepEqual(await query(environment, staticFields), {
            about: profileDetails, profile: profileDetails,
          });
        });
        assert.deepEqual(staticStatements, []);

        const skills = [{ name: 'Test skill' }];
        const selections = [
          ['{ skills { name } }', { skills }],
          ['{ profile { skills { name } } }', { profile: { skills } }],
        ];
        for (const [selection, expected] of selections) {
          const statements = await observeStatements(async () => {
            assert.deepEqual(await query(environment, selection), expected);
          });
          assert.equal(statements.length, 1, statements.join('\n'));
          assert.match(statements[0], /\bSELECT\b.*\bFROM\s+(?:"?public"?\.)?"?skills\b/iu);
          assert.doesNotMatch(statements[0], /\b(?:professional_links|projects|work_experience)\b/iu);
        }
      });

      await t.test('a PostgreSQL outage fails health and database fields but leaves static fields available', async () => {
        await docker('stop', '--time', '3', container);
        const health = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(5000) });
        assert.equal(health.status, 503);
        assert.equal((await health.json()).statusCode, 503);

        const { data, errors } = await graphql(environment, '{ skills { name } }');
        assert.equal(data, null);
        assert.deepEqual(errors.map(({ path }) => path), [['skills']]);
        assert.deepEqual(await query(environment, staticFields), {
          about: profileDetails, profile: profileDetails,
        });
      });
    });
  });

  test('an integration failure closes the backend and removes PostgreSQL and its data volume', async () => {
    const failure = new Error('intentional test failure');
    let baseUrl;
    let container;
    let volume;
    await assert.rejects(withIsolatedBackend(async (environment) => {
      ({ baseUrl, container } = environment);
      const { stdout } = await docker('inspect', '--format', '{{json .Mounts}}', container);
      volume = JSON.parse(stdout).find(({ Type }) => Type === 'volume')?.Name;
      assert.ok(volume, 'PostgreSQL has a data volume before the failure');
      const health = await fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(5000) });
      assert.equal(health.status, 200);
      await health.json();
      throw failure;
    }), (error) => error === failure);

    await assert.rejects(fetch(new URL('/health', baseUrl), { signal: AbortSignal.timeout(5000) }),
      (error) => error.cause?.code === 'ECONNREFUSED');
    const containers = await docker('ps', '-aq', '--filter', `id=${container}`);
    assert.equal(containers.stdout.trim(), '');
    const volumes = await docker('volume', 'ls', '-q', '--filter', `name=${volume}`);
    assert.equal(volumes.stdout.trim(), '');
  });
} else {
  test('the full profile and the separate queries return the same card data', async () => {
    await checkProfile({ baseUrl: process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3000' });
  });
}
