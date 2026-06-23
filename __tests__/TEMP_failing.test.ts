// TEMPORARY: verifies the action's failure annotation + gating path on a real PR.
// Removed before merge.
describe('TEMP failure-path check', () => {
  it('intentionally fails to exercise annotations', () => {
    expect(1 + 1).toBe(3);
  });
});
