import { describe, it, expect } from 'vitest';
import { cancelledMoneyLine } from '../request-clinician';

describe('cancelled-visit money line is truthful', () => {
  it('says nothing charged only when nothing was', () => {
    expect(cancelledMoneyLine(null)).toMatch(/No charge/);
    expect(cancelledMoneyLine('released')).toMatch(/No charge/);
    expect(cancelledMoneyLine('none')).toMatch(/No charge/);
  });
  it('says refunded when the card was captured', () => {
    expect(cancelledMoneyLine('refunded')).toMatch(/refunded in full/);
    expect(cancelledMoneyLine('captured')).toMatch(/being refunded/);
  });
});
