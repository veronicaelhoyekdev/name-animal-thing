const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const bcrypt = require('bcrypt');

function harness() {
  const routes = new Map();
  let user;
  const collection = {
    async findOne(query) { return user && query.email === user.email ? { ...user } : null; },
    async insertOne(value) { user = { _id: 'test-id', ...value }; return { acknowledged: true }; },
    async updateOne(query, update) { Object.assign(user, update.$set); return { modifiedCount: 1 }; }
  };
  const app = { use() {} };
  for (const method of ['get', 'post', 'put']) app[method] = (path, handler) => routes.set(`${method} ${path}`, handler);
  const express = () => app;
  express.static = () => () => {};
  const mocks = {
    dotenv: { config() {} }, express,
    'body-parser': { json() {}, urlencoded() {} },
    mongodb: { MongoClient: class { db(name) { assert.equal(name, 'nameanimalthing'); return { collection: () => collection }; } } },
    'express-session': () => () => {},
    http: { createServer: () => ({ listen() {} }) },
    'socket.io': () => ({ on() {} })
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../server'), 'utf8'), {
    require: name => mocks[name] || require(name),
    process: { env: { MONGODB_URI: 'test-only', SESSION_SECRET: 'test-only' } },
    __dirname: require('node:path').resolve(__dirname, '..'), Buffer, console
  });
  async function request(method, path, body = {}, session = {}) {
    return new Promise((resolve, reject) => {
      const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(data) { resolve({ data, session, status: this.statusCode }); } };
      routes.get(`${method} ${path}`)({ body, session }, res, reject);
    });
  }
  return { request, get user() { return user; } };
}

test('signup, signin, profile, and password changes preserve the API without exposing passwords', async () => {
  const h = harness();
  const password = 'Test-only-password1!';
  const account = { email: 'test@example.invalid', username: 'tester', password, avatar: 'avatar.png' };
  assert.equal((await h.request('post', '/signup', account)).data.redirect, '/signin');
  assert.notEqual(h.user.password, password);
  assert.ok(await bcrypt.compare(password, h.user.password));
  assert.equal((await h.request('post', '/signup', account)).data.message, 'User already exists');
  assert.equal((await h.request('post', '/signin', { ...account, password: 'wrong' })).data.success, false);
  const login = await h.request('post', '/signin', account);
  assert.equal(login.data.redirect, '/dashboard');
  assert.equal('password' in login.session.user, false);
  const profile = await h.request('get', '/api/user', {}, login.session);
  assert.equal('password' in profile.data, false);
  assert.equal(profile.data.username, account.username);
  const replacement = 'Replacement-test1!';
  assert.equal((await h.request('put', '/api/user', { password: replacement, email: 'new@example.invalid', gamesWon: 999 }, login.session)).data.success, true);
  assert.ok(await bcrypt.compare(replacement, h.user.password));
  assert.equal(h.user.gamesWon, undefined);
  assert.equal(login.session.user.email, 'new@example.invalid');
  assert.equal((await h.request('post', '/signin', { email: h.user.email, password: replacement })).data.success, true);
  h.user.password = password;
  assert.equal((await h.request('post', '/signin', { email: h.user.email, password })).data.success, false);
});

test('invalid credential types, oversized passwords, and unauthenticated profile access are rejected', async () => {
  const h = harness();
  for (const password of [null, {}, 'é'.repeat(37)]) {
    assert.equal((await h.request('post', '/signup', { email: 'test@example.invalid', password })).data.success, false);
  }
  assert.equal((await h.request('post', '/signin', { email: { $ne: null }, password: 'test' })).data.success, false);
  assert.equal((await h.request('get', '/api/user')).status, 401);
  assert.equal((await h.request('put', '/api/user', { password: 'test' })).status, 401);
});
