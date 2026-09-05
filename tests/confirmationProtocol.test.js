import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfirmationBroker } from '../src/core/confirmationProtocol.js';
import { ErrorCode } from '../src/core/errorContract.js';

const cryptoObject = { randomUUID: () => 'fixed-id' };
const details = { requestId: 'req_1', sessionId: 'session_1', action: { name: 'type_text' } };

test('an exact approval resolves once and replay is rejected', async () => {
  const broker = createConfirmationBroker({ cryptoObject });
  let emitted;
  const pending = broker.request(details, (value) => { emitted = value; });
  const decision = { confirmationId: emitted.confirmation.confirmationId, requestId: 'req_1', sessionId: 'session_1', approved: true };
  assert.equal(broker.decide(decision), true);
  assert.deepEqual(await pending, { approved: true, confirmationId: 'action_fixed-id' });
  assert.equal(broker.decide(decision), false);
});

test('denial and mismatched request identity fail closed', async () => {
  const deniedBroker = createConfirmationBroker({ cryptoObject });
  let deniedEvent;
  const denied = deniedBroker.request(details, (value) => { deniedEvent = value; });
  deniedBroker.decide({ confirmationId: deniedEvent.confirmation.confirmationId, requestId: 'req_1', sessionId: 'session_1', approved: false });
  await assert.rejects(denied, (error) => error.code === ErrorCode.ACTION_DENIED);

  const staleBroker = createConfirmationBroker({ cryptoObject });
  let staleEvent;
  const stale = staleBroker.request(details, (value) => { staleEvent = value; });
  assert.equal(staleBroker.decide({ confirmationId: staleEvent.confirmation.confirmationId, requestId: 'wrong', sessionId: 'session_1', approved: true }), false);
  await assert.rejects(stale, (error) => error.code === ErrorCode.ACTION_CONFIRMATION_EXPIRED);
});

test('abort cancels a pending approval', async () => {
  const broker = createConfirmationBroker({ cryptoObject });
  const controller = new AbortController();
  const pending = broker.request(details, () => {}, controller.signal);
  controller.abort();
  await assert.rejects(pending, (error) => error.code === ErrorCode.CANCELLED);
  assert.equal(broker.size, 0);
});
