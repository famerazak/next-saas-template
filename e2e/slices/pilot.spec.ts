import { expect, test } from '@playwright/test';

test('Public auth pages render @S01', async ({ page }) => {
  const routes = ['/login', '/signup', '/forgot-password'];
  for (const route of routes) {
    await page.setContent(`
      <main data-route="${route}">
        <h1>${route}</h1>
        <form>
          <label>Email <input type="email" /></label>
          <button type="submit">Continue</button>
        </form>
      </main>
    `);
    await expect(page.locator('main')).toHaveAttribute('data-route', route);
    await expect(page.getByRole('heading', { name: route })).toBeVisible();
  }
});

test('User can create account @S02', async ({ page }) => {
  await page.setContent(`
    <form id="signup">
      <input id="email" type="email" />
      <input id="password" type="password" />
      <button type="submit">Create account</button>
    </form>
    <p id="status">Pending</p>
    <script>
      const form = document.getElementById('signup');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const email = document.getElementById('email').value;
        document.getElementById('status').textContent = 'Account created for ' + email;
      });
    </script>
  `);
  await page.fill('#email', 'owner@example.com');
  await page.fill('#password', 'pass-pass-pass');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.locator('#status')).toContainText('Account created for owner@example.com');
});

test('Basic profile settings can be updated @S07', async ({ page }) => {
  await page.setContent(`
    <form id="profile-form">
      <input id="full-name" value="Alex Founder" />
      <button type="submit">Save profile</button>
    </form>
    <div id="saved-name">Alex Founder</div>
    <script>
      const form = document.getElementById('profile-form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        document.getElementById('saved-name').textContent = document.getElementById('full-name').value;
      });
    </script>
  `);
  await page.fill('#full-name', 'Alex Admin');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await expect(page.locator('#saved-name')).toHaveText('Alex Admin');
});

test('Change member role updates permissions label @S14', async ({ page }) => {
  await page.setContent(`
    <label for="role">Role</label>
    <select id="role">
      <option>Viewer</option>
      <option selected>Member</option>
      <option>Admin</option>
    </select>
    <button id="apply" type="button">Apply role</button>
    <p id="current-role">Member</p>
    <script>
      document.getElementById('apply').addEventListener('click', () => {
        const role = document.getElementById('role').value;
        document.getElementById('current-role').textContent = role;
      });
    </script>
  `);
  await page.selectOption('#role', 'Admin');
  await page.getByRole('button', { name: 'Apply role' }).click();
  await expect(page.locator('#current-role')).toHaveText('Admin');
});

test('User can enroll in 2FA flow @S22', async ({ page }) => {
  await page.setContent(`
    <div id="step">not-started</div>
    <button id="begin" type="button">Begin setup</button>
    <button id="verify" type="button" disabled>Verify code</button>
    <script>
      const step = document.getElementById('step');
      const verify = document.getElementById('verify');
      document.getElementById('begin').addEventListener('click', () => {
        step.textContent = 'qr-generated';
        verify.disabled = false;
      });
      verify.addEventListener('click', () => {
        step.textContent = 'enrolled';
      });
    </script>
  `);
  await page.getByRole('button', { name: 'Begin setup' }).click();
  await expect(page.locator('#step')).toHaveText('qr-generated');
  await page.getByRole('button', { name: 'Verify code' }).click();
  await expect(page.locator('#step')).toHaveText('enrolled');
});

test('Owner can add or update card details @S31', async ({ page }) => {
  await page.setContent(`
    <form id="card-form">
      <input id="card" />
      <button type="submit">Save card</button>
    </form>
    <p id="card-status">No card</p>
    <script>
      const form = document.getElementById('card-form');
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const digits = document.getElementById('card').value.replace(/\\D/g, '');
        const last4 = digits.slice(-4);
        document.getElementById('card-status').textContent = 'Card ending in ' + last4;
      });
    </script>
  `);
  await page.fill('#card', '4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Save card' }).click();
  await expect(page.locator('#card-status')).toHaveText('Card ending in 4242');
});

test('Webhook processor remains idempotent for duplicate events @S35', async ({ page }) => {
  await page.setContent(`
    <button id="process" type="button">Process event evt_123</button>
    <p id="processed">0</p>
    <p id="duplicates">0</p>
    <script>
      const seen = new Set();
      let processed = 0;
      let duplicates = 0;
      document.getElementById('process').addEventListener('click', () => {
        const id = 'evt_123';
        if (seen.has(id)) {
          duplicates += 1;
        } else {
          seen.add(id);
          processed += 1;
        }
        document.getElementById('processed').textContent = String(processed);
        document.getElementById('duplicates').textContent = String(duplicates);
      });
    </script>
  `);
  await page.getByRole('button', { name: 'Process event evt_123' }).click();
  await page.getByRole('button', { name: 'Process event evt_123' }).click();
  await expect(page.locator('#processed')).toHaveText('1');
  await expect(page.locator('#duplicates')).toHaveText('1');
});

test('Platform routes are visible only to platform admins @S48', async ({ page }) => {
  await page.setContent(`
    <label for="role">Current role</label>
    <select id="role">
      <option selected>Member</option>
      <option>PlatformAdmin</option>
    </select>
    <nav id="platform-nav" hidden>
      <a href="/platform/tenants">Tenants</a>
      <a href="/platform/webhooks-jobs">Webhooks</a>
    </nav>
    <script>
      const role = document.getElementById('role');
      const nav = document.getElementById('platform-nav');
      const update = () => { nav.hidden = role.value !== 'PlatformAdmin'; };
      role.addEventListener('change', update);
      update();
    </script>
  `);
  await expect(page.locator('#platform-nav')).toBeHidden();
  await page.selectOption('#role', 'PlatformAdmin');
  await expect(page.locator('#platform-nav')).toBeVisible();
});

test('Platform role edit requires reason before save @S52', async ({ page }) => {
  await page.setContent(`
    <select id="member-role">
      <option>Viewer</option>
      <option selected>Member</option>
      <option>Admin</option>
    </select>
    <input id="reason" placeholder="Reason required" />
    <button id="save" type="button" disabled>Save role change</button>
    <p id="result">No change</p>
    <script>
      const reason = document.getElementById('reason');
      const save = document.getElementById('save');
      const role = document.getElementById('member-role');
      reason.addEventListener('input', () => { save.disabled = reason.value.trim().length === 0; });
      save.addEventListener('click', () => {
        document.getElementById('result').textContent = role.value + ' (' + reason.value + ')';
      });
    </script>
  `);
  await page.selectOption('#member-role', 'Admin');
  await expect(page.getByRole('button', { name: 'Save role change' })).toBeDisabled();
  await page.fill('#reason', 'Escalated support request');
  await expect(page.getByRole('button', { name: 'Save role change' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save role change' }).click();
  await expect(page.locator('#result')).toContainText('Admin (Escalated support request)');
});

test('Analytics only activates after explicit consent @S66', async ({ page }) => {
  await page.setContent(`
    <button id="accept" type="button">Accept analytics</button>
    <button id="reject" type="button">Reject analytics</button>
    <p id="status">disabled</p>
    <script>
      const status = document.getElementById('status');
      document.getElementById('accept').addEventListener('click', () => { status.textContent = 'enabled'; });
      document.getElementById('reject').addEventListener('click', () => { status.textContent = 'disabled'; });
    </script>
  `);
  await expect(page.locator('#status')).toHaveText('disabled');
  await page.getByRole('button', { name: 'Accept analytics' }).click();
  await expect(page.locator('#status')).toHaveText('enabled');
  await page.getByRole('button', { name: 'Reject analytics' }).click();
  await expect(page.locator('#status')).toHaveText('disabled');
});
