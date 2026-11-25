const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loadAdvisorModule() {
  const filePath = path.join(__dirname, '..', 'src', 'constants', 'couponAdvisor.ts');
  const source = fs.readFileSync(filePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const mod = { exports: {} };
  const sandbox = { exports: mod.exports, module: mod, require };
  vm.runInNewContext(transpiled, sandbox);
  return mod.exports;
}

test('coupon advisor covers common + all 6 merchant categories with valid cloud rules', () => {
  const { COUPON_ADVISOR_PLAYBOOKS } = loadAdvisorModule();
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'cloudfunctions', 'configManage', 'base.json'), 'utf8'));
  const expectedCategoryIds = base.merchantCategories.map(c => c.id);

  assert.ok(Array.isArray(COUPON_ADVISOR_PLAYBOOKS) && COUPON_ADVISOR_PLAYBOOKS.length >= 15);

  // 确认每个行业至少有 1 个盟友跨店模板 + 1 个店内/裂变/闲时模板
  for (const catId of ['common', ...expectedCategoryIds]) {
    const items = COUPON_ADVISOR_PLAYBOOKS.filter(p => p.categoryId === catId);
    assert.ok(items.length >= 2, `Category ${catId} should have at least 2 playbooks`);
    assert.ok(items.some(p => p.isAllianceRecommended), `Category ${catId} should have an alliance-recommended playbook`);
    assert.ok(items.some(p => !p.isAllianceRecommended), `Category ${catId} should have a local retention/boost playbook`);
  }

  // 逐套验证后端 couponManage/index.js validate() 同款约束
  for (const p of COUPON_ADVISOR_PLAYBOOKS) {
    const d = p.draft;
    assert.ok(d.title.trim().length >= 4 && d.title.trim().length <= 40, `Invalid title length in ${p.id}`);
    assert.ok(d.instructions.trim().length >= 10, `Instructions too short in ${p.id}`);
    assert.ok(['FULL_REDUCTION', 'EXPERIENCE'].includes(d.type), `Invalid type in ${p.id}`);
    assert.ok(['INSTANT', 'WALK_IN', 'BOOKING'].includes(d.usage_mode), `Invalid usage_mode in ${p.id}`);

    const condition = Number(d.condition_amount);
    const discount = Number(d.discount_amount);
    const total = Number(d.total_count);
    const limit = Number(d.per_user_limit);

    assert.ok(Number.isFinite(condition) && condition >= 0, `Invalid condition in ${p.id}`);
    assert.ok(Number.isFinite(discount) && discount > 0, `Invalid discount in ${p.id}`);
    if (d.type === 'FULL_REDUCTION') {
      assert.ok(condition > discount, `FULL_REDUCTION condition (${condition}) must > discount (${discount}) in ${p.id}`);
    }
    assert.ok(Number.isInteger(total) && total >= 1 && total <= 10000, `Invalid total in ${p.id}`);
    assert.ok(Number.isInteger(limit) && limit >= 1 && limit <= Math.min(5, total), `Invalid limit in ${p.id}`);

    // 联盟跨店拉新券业务规范校验
    if (p.isAllianceRecommended) {
      assert.notEqual(d.usage_mode, 'INSTANT', `Alliance playbook ${p.id} must not be INSTANT`);
      assert.ok(p.validDays >= 60, `Alliance playbook ${p.id} validDays should >= 60`);
      assert.equal(d.per_user_limit, '1', `Alliance playbook ${p.id} per_user_limit should be 1`);
    }

    assert.ok(p.partnerAdvice.trim().length >= 10, `Missing partnerAdvice in ${p.id}`);
    assert.ok(p.cashierScript.trim().length >= 10, `Missing cashierScript in ${p.id}`);
    assert.ok(p.profitGuard.trim().length >= 10, `Missing profitGuard in ${p.id}`);
  }
});
