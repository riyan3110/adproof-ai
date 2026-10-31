import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { outputPlan, assessOutputQuality, PRESETS } from '../public/output-system.js';
import { normalizeSettings } from '../public/visual-consistency.js';
import { normalizeClaim } from '../public/claim-engine.js';

describe('output-system social/website validation', () => {
  it('validates social presets without distortion', () => {
    const source = { width: 1080, height: 1080 };
    for (const [i, [w, h]] of PRESETS.social.entries()) {
      const plan = outputPlan(source, { category: 'social', preset: i });
      assert.equal(plan.width, w);
      assert.equal(plan.height, h);
      assert.equal(plan.fit, 'contain');
      assert.ok(plan.scale > 0);
      assert.ok(plan.draw.width <= plan.width);
      assert.ok(plan.draw.height <= plan.height);
      // contain must not stretch: scale is min ratio
      const expected = Math.min(w / source.width, h / source.height);
      assert.equal(plan.scale, expected);
    }
  });
  it('validates website presets without distortion', () => {
    const source = { width: 1920, height: 1080 };
    for (const [i, [w, h]] of PRESETS.website.entries()) {
      const plan = outputPlan(source, { category: 'website', preset: i });
      assert.equal(plan.width, w);
      assert.equal(plan.height, h);
      assert.ok(plan.scale > 0);
    }
  });
  it('flags aspect change for blank-area prevention', () => {
    const source = { width: 1000, height: 1000 };
    const plan = outputPlan(source, { category: 'social', preset: 2 }); // 1080x1920
    assert.equal(plan.aspect_changed, true);
    const quality = assessOutputQuality(plan);
    assert.ok(quality.contains_padding === true);
  });
  it('rejects invalid preset', () => {
    assert.throws(() => outputPlan({ width: 100, height: 100 }, { category: 'social', preset: 99 }), /Invalid preset/);
    assert.throws(() => outputPlan({ width: 100, height: 100 }, { category: 'website', preset: 99 }), /Invalid preset/);
  });
  it('rejects non-integer preset', () => {
    assert.throws(() => outputPlan({ width: 100, height: 100 }, { category: 'social', preset: 1.5 }), /Invalid preset/);
  });
});

describe('visual consistency locks', () => {
  it('preserves locks by default', () => {
    const s = normalizeSettings({});
    for (const v of Object.values(s.locks)) assert.equal(v, true);
  });
  it('respects explicit false and ignores non-object', () => {
    const s = normalizeSettings({ locks: { colors: false } });
    assert.equal(s.locks.colors, false);
    assert.equal(s.locks.lighting, true);
    const s2 = normalizeSettings({ locks: null });
    for (const v of Object.values(s2.locks)) assert.equal(v, true);
  });
});

describe('claim engine invented-claim prevention', () => {
  it('normalizes claims conservatively', () => {
    assert.equal(normalizeClaim('  Hello   WORLD  '), 'hello world');
    assert.equal(normalizeClaim('Price $100'), 'price $100');
    assert.equal(normalizeClaim(null), '');
  });
});
