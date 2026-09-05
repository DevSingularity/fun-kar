import 'dotenv/config';
import { loginUser } from '../modules/auth/auth.service.js';
import { listCategories } from '../modules/categories/categories.service.js';
import { listProducts, getProduct } from '../modules/products/products.service.js';
import { listPriceLists, resolvePrice } from '../modules/priceLists/priceLists.service.js';
import { listCustomers } from '../modules/customers/customers.service.js';
import { getAllGovernanceConfig } from '../modules/governance/governance.service.js';
import { evaluateQuoteRisk } from '../modules/risk/risk.service.js';
import { connectDatabase } from '../config/database.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('=== DEALFLOW360 PHASE 2 AUTOMATED TEST SUITE ===\n');
  await connectDatabase();

  // Test 1: Authenticate Admin & Sales Rep
  console.log('[TEST 1] Testing Phase 1/2 User Authentication Context');
  const adminAuth = await loginUser({ email: 'admin@dealflow.io', password: 'Password123!' });
  const repAuth = await loginUser({ email: 'rep@dealflow.io', password: 'Password123!' });
  assert(adminAuth.user.role === 'ADMIN', 'Admin user authenticated with ADMIN role');
  assert(repAuth.user.role === 'SALES_REP', 'Sales Rep authenticated with SALES_REP role');

  // Test 2: Categories Module
  console.log('\n[TEST 2] Testing Product Categories');
  const { categories } = await listCategories();
  assert(Array.isArray(categories) && categories.length >= 4, `Retrieved ${categories.length} categories`);
  const softwareCat = categories.find((c) => c.name === 'Enterprise Software');
  assert(!!softwareCat, 'Found "Enterprise Software" category');

  // Test 3: Products Module
  console.log('\n[TEST 3] Testing Products Catalog');
  const prodResult = await listProducts({ page: 1, limit: 10 });
  assert(prodResult.products.length >= 5, `Retrieved ${prodResult.products.length} products`);
  assert(prodResult.meta.total >= 5, `Total count reported correctly in meta: ${prodResult.meta.total}`);

  const coreProd = prodResult.products.find((p) => p.sku === 'DF-ENT-01');
  assert(!!coreProd, 'Found core enterprise license product (DF-ENT-01)');
  assert(Number(coreProd.basePrice) === 120000, `Base price is 120,000 INR (got: ${coreProd.basePrice})`);

  // Test 4: Price Lists and Pricing Resolver
  console.log('\n[TEST 4] Testing Price Lists & Dynamic Pricing Resolver');
  const { priceLists } = await listPriceLists();
  assert(priceLists.length >= 2, `Retrieved ${priceLists.length} price lists`);

  const goldPriceList = priceLists.find((pl) => pl.name.includes('Gold'));
  assert(!!goldPriceList, 'Found Gold Partner Matrix price list');

  // Test 5: Customers Module
  console.log('\n[TEST 5] Testing Customer Accounts');
  const { customers } = await listCustomers({ page: 1, limit: 10 });
  assert(customers.length >= 4, `Retrieved ${customers.length} enterprise customers`);

  const goldCustomer = customers.find((c) => c.tier === 'GOLD');
  const bronzeCustomer = customers.find((c) => c.tier === 'BRONZE');
  assert(!!goldCustomer, `Found Gold tier customer: ${goldCustomer?.name}`);
  assert(!!bronzeCustomer, `Found Bronze tier customer: ${bronzeCustomer?.name}`);

  // Resolve price for Gold tier customer
  const goldPricing = await resolvePrice({
    productId: coreProd.id,
    customerId: goldCustomer.id,
    requestedDiscountPct: 10,
  });
  assert(goldPricing.effectiveUnitPrice === 85500, `Gold tier effective unit price resolved (95000 - 10% = 85500, got: ${goldPricing.effectiveUnitPrice})`);
  assert(goldPricing.estimatedMarginPct > 70, `Estimated margin is healthy (${goldPricing.estimatedMarginPct}%)`);

  // Test 6: Governance Configuration
  console.log('\n[TEST 6] Testing Governance Limits & Approval Rules');
  const gov = await getAllGovernanceConfig();
  assert(gov.tierLimits.length === 3, `Found 3 tier discount limits (Bronze, Silver, Gold)`);
  assert(gov.categoryLimits.length >= 4, `Found ${gov.categoryLimits.length} category caps`);
  assert(gov.approvalBands.length >= 3, `Found ${gov.approvalBands.length} approval routing bands`);

  // Test 7: Explainable Risk Engine - Compliant Quote
  console.log('\n[TEST 7] Testing Risk Engine - Compliant Quote (Within Policy)');
  const compliantRisk = await evaluateQuoteRisk({
    customerId: bronzeCustomer.id, // Bronze limit is 10%
    lines: [
      {
        productId: coreProd.id,
        quantity: 2,
        unitPrice: 120000,
        requestedDiscountPct: 8, // <= 10% -> Within limit
      },
    ],
  });
  assert(compliantRisk.summary.requiredApprovalLevel === 'NONE', `Compliant quote requires approval level: ${compliantRisk.summary.requiredApprovalLevel}`);
  assert(compliantRisk.summary.policyStatus === 'COMPLIANT', 'Policy status is COMPLIANT');
  assert(compliantRisk.lineEvaluations[0].status === 'WITHIN_POLICY', 'Line status is WITHIN_POLICY');

  // Test 8: Explainable Risk Engine - Moderate Overage (Requires Manager Approval)
  console.log('\n[TEST 8] Testing Risk Engine - Moderate Overage (Requires MANAGER)');
  const managerRisk = await evaluateQuoteRisk({
    customerId: bronzeCustomer.id, // Bronze limit: 10%
    lines: [
      {
        productId: coreProd.id,
        quantity: 1,
        unitPrice: 120000,
        requestedDiscountPct: 22, // 22% - 10% = 12% overage -> falls in [10, 25) band -> MANAGER
      },
    ],
  });
  assert(managerRisk.summary.requiredApprovalLevel === 'MANAGER', `Moderate overage routes to: ${managerRisk.summary.requiredApprovalLevel}`);
  assert(managerRisk.summary.policyStatus === 'REQUIRES_APPROVAL', 'Policy status is REQUIRES_APPROVAL');
  assert(managerRisk.summary.blendedOveragePct === 12, `Blended overage is 12% (got: ${managerRisk.summary.blendedOveragePct})`);
  assert(managerRisk.explanations.some((e) => e.includes('Sales Manager approval')), 'Includes explanation for Sales Manager sign-off');

  // Test 9: Explainable Risk Engine - High Overage (Requires Dual MANAGER_FINANCE Approval)
  console.log('\n[TEST 9] Testing Risk Engine - High Overage (Requires MANAGER_FINANCE)');
  const financeRisk = await evaluateQuoteRisk({
    customerId: bronzeCustomer.id, // Bronze limit: 10%
    lines: [
      {
        productId: coreProd.id,
        quantity: 1,
        unitPrice: 120000,
        requestedDiscountPct: 40, // 40% - 10% = 30% overage -> >= 25% band -> MANAGER_FINANCE
      },
    ],
  });
  assert(financeRisk.summary.requiredApprovalLevel === 'MANAGER_FINANCE', `High overage routes to: ${financeRisk.summary.requiredApprovalLevel}`);
  assert(financeRisk.explanations.some((e) => e.includes('Finance approval')), 'Includes explanation for Finance sign-off');
  assert(financeRisk.lineEvaluations[0].overagePct === 30, `Line overage calculated accurately: 30% (got: ${financeRisk.lineEvaluations[0].overagePct}%)`);

  console.log('\n=============================================');
  console.log(`PHASE 2 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('=============================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
