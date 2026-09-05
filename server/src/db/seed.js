import dotenv from 'dotenv';
dotenv.config({ path: './server/.env' });
dotenv.config();

import { connectDatabase, getDb } from '../config/database.js';
import { users, customerUsers } from './schema/users.js';
import {

  productCategories,
  products,
  productVariants,
  priceLists,
  priceListItems,
} from './schema/catalog.js';
import { customers } from './schema/customers.js';
import {
  customerTierDiscountLimits,
  categoryDiscountLimits,
  approvalRules,
  approvalRequests,
  approvalActions,
  auditLogs,
} from './schema/governance.js';
import {
  warehouses,
  warehouseStock,
  fulfillmentAllocations,
  backorders,
} from './schema/warehouses.js';
import {
  subscriptionPlans,
  subscriptionLines,
  billingSchedules,
  invoices,
  invoiceLines,
  payments,
  creditNotes,
} from './schema/billing.js';
import { quotations, quotationItems } from './schema/quotations.js';
import { orders, orderItems } from './schema/orders.js';
import { hashPassword } from '../common/password.util.js';
import { sql, eq, and } from 'drizzle-orm';

const SEED_USERS = [
  { name: 'System Administrator', email: 'admin@dealflow.io', role: 'ADMIN' },
  { name: 'Alex Morgan (Sales Rep)', email: 'rep@dealflow.io', role: 'SALES_REP' },
  { name: 'Sarah Chen (Sales Manager)', email: 'manager@dealflow.io', role: 'SALES_MANAGER' },
  { name: 'Priya Nair (Sales Manager, Team B)', email: 'manager2@dealflow.io', role: 'SALES_MANAGER' },
  { name: 'Rohan Gupta (Sales Rep, Team B)', email: 'rep2@dealflow.io', role: 'SALES_REP' },
  { name: 'David Miller (Finance Lead)', email: 'finance@dealflow.io', role: 'FINANCE' },
  { name: 'Elena Rostova (Operations Head)', email: 'ops@dealflow.io', role: 'OPERATIONS' },
];

const DEFAULT_PASSWORD = 'Password123!';

const SEED_CATEGORIES = [
  { name: 'Enterprise Software', description: 'Core licenses, modules, and platform subscriptions' },
  { name: 'Cloud Infrastructure', description: 'Dedicated pods, database clusters, and cloud compute' },
  { name: 'Security & Hardware', description: 'Hardware appliances, security tokens, and edge boxes' },
  { name: 'Professional Services', description: 'Consulting, implementation, training, and 24/7 TAM support' },
];

const SEED_TIER_LIMITS = [
  { tier: 'BRONZE', maxDiscountPct: '10.00' },
  { tier: 'SILVER', maxDiscountPct: '20.00' },
  { tier: 'GOLD', maxDiscountPct: '30.00' },
];

const SEED_APPROVAL_RULES = [
  { minOveragePct: '0.00', maxOveragePct: '10.00', requiredLevel: 'NONE' },
  { minOveragePct: '10.00', maxOveragePct: '25.00', requiredLevel: 'MANAGER' },
  { minOveragePct: '25.00', maxOveragePct: null, requiredLevel: 'MANAGER_FINANCE' },
];

async function runSeed() {
  console.log('[SEED] Connecting to database...');
  await connectDatabase();
  const db = getDb();

  console.log('[SEED] Hashing default credentials...');
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  // 1. Seed Users
  console.log('[SEED] Upserting internal demo users...');
  const userMap = {};
  for (const user of SEED_USERS) {
    const existing = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${user.email.toLowerCase()}`)
      .limit(1);

    if (existing.length === 0) {
      const inserted = await db
        .insert(users)
        .values({
          name: user.name,
          email: user.email.toLowerCase(),
          passwordHash,
          role: user.role,
          isActive: true,
        })
        .returning();
      userMap[user.email] = inserted[0];
      console.log(`[SEED] Created user: ${user.email} (${user.role})`);
    } else {
      const updated = await db
        .update(users)
        .set({
          name: user.name,
          role: user.role,
          passwordHash,
          isActive: true,
        })
        .where(sql`lower(${users.email}) = ${user.email.toLowerCase()}`)
        .returning();
      userMap[user.email] = updated[0];
      console.log(`[SEED] Updated user: ${user.email} (${user.role})`);
    }
  }

  // Link SALES_REP hierarchy to SALES_MANAGER
  const repManagerMap = {
    'rep@dealflow.io': 'manager@dealflow.io',
    'rep2@dealflow.io': 'manager2@dealflow.io',
  };
  for (const [repEmail, managerEmail] of Object.entries(repManagerMap)) {
    const rep = userMap[repEmail];
    const manager = userMap[managerEmail];
    if (rep && manager) {
      await db.update(users).set({ managerId: manager.id }).where(eq(users.id, rep.id));
      console.log(`[SEED] Linked ${repEmail} -> Manager ${managerEmail}`);
    }
  }

  // 2. Seed Categories
  console.log('[SEED] Upserting product categories...');
  const categoryMap = {};
  for (const cat of SEED_CATEGORIES) {
    const existing = await db
      .select()
      .from(productCategories)
      .where(eq(productCategories.name, cat.name))
      .limit(1);

    if (existing.length === 0) {
      const inserted = await db.insert(productCategories).values(cat).returning();
      categoryMap[cat.name] = inserted[0];
      console.log(`[SEED] Created category: ${cat.name}`);
    } else {
      categoryMap[cat.name] = existing[0];
    }
  }

  // 3. Seed Category Discount Limits
  console.log('[SEED] Upserting category discount limits...');
  const categoryCaps = {
    'Enterprise Software': '35.00',
    'Cloud Infrastructure': '15.00',
    'Security & Hardware': '20.00',
    'Professional Services': '25.00',
  };

  for (const [catName, cap] of Object.entries(categoryCaps)) {
    const cat = categoryMap[catName];
    if (cat) {
      const existing = await db
        .select()
        .from(categoryDiscountLimits)
        .where(eq(categoryDiscountLimits.categoryId, cat.id))
        .limit(1);

      if (existing.length === 0) {
        await db.insert(categoryDiscountLimits).values({
          categoryId: cat.id,
          maxDiscountPct: cap,
        });
      } else {
        await db
          .update(categoryDiscountLimits)
          .set({ maxDiscountPct: cap, updatedAt: new Date() })
          .where(eq(categoryDiscountLimits.id, existing[0].id));
      }
      console.log(`[SEED] Configured limit for category '${catName}': ${cap}%`);
    }
  }

  // 4. Seed Customer Tier Discount Limits
  console.log('[SEED] Upserting customer tier discount limits...');
  for (const item of SEED_TIER_LIMITS) {
    const existing = await db
      .select()
      .from(customerTierDiscountLimits)
      .where(eq(customerTierDiscountLimits.tier, item.tier))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(customerTierDiscountLimits).values(item);
    } else {
      await db
        .update(customerTierDiscountLimits)
        .set({ maxDiscountPct: item.maxDiscountPct, updatedAt: new Date() })
        .where(eq(customerTierDiscountLimits.id, existing[0].id));
    }
    console.log(`[SEED] Configured tier limit '${item.tier}': ${item.maxDiscountPct}%`);
  }

  // 5. Seed Approval Rules
  console.log('[SEED] Upserting governance approval bands...');
  for (const rule of SEED_APPROVAL_RULES) {
    const existing = await db
      .select()
      .from(approvalRules)
      .where(eq(approvalRules.minOveragePct, rule.minOveragePct))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(approvalRules).values(rule);
    } else {
      await db
        .update(approvalRules)
        .set({
          maxOveragePct: rule.maxOveragePct,
          requiredLevel: rule.requiredLevel,
          isActive: true,
        })
        .where(eq(approvalRules.id, existing[0].id));
    }
    console.log(`[SEED] Configured approval rule [${rule.minOveragePct} - ${rule.maxOveragePct ?? 'inf'}) -> ${rule.requiredLevel}`);
  }

  // 6. Seed Products
  console.log('[SEED] Upserting catalog products...');
  const SEED_PRODUCTS = [
    {
      sku: 'DF-ENT-01',
      name: 'DealFlow360 Enterprise Core License',
      description: 'Annual enterprise license for core quote-to-cash platform, up to 100 seats.',
      unit: 'license',
      basePrice: '120000.00',
      estimatedCost: '18000.00',
      taxRate: '18.00',
      productType: 'SERVICE',
      categoryName: 'Enterprise Software',
    },
    {
      sku: 'DF-ANL-02',
      name: 'DealFlow360 Real-Time Margin Analytics',
      description: 'AI-driven margin optimization and predictive deal scoring add-on.',
      unit: 'license',
      basePrice: '35000.00',
      estimatedCost: '5000.00',
      taxRate: '18.00',
      productType: 'SERVICE',
      categoryName: 'Enterprise Software',
    },
    {
      sku: 'CLD-POD-32',
      name: 'Dedicated Private Cloud Pod (32 vCPU / 128GB)',
      description: 'Single-tenant isolated cloud compute pod hosted in Mumbai region with 99.99% SLA.',
      unit: 'month',
      basePrice: '48000.00',
      estimatedCost: '32000.00',
      taxRate: '18.00',
      productType: 'SUBSCRIPTION',
      categoryName: 'Cloud Infrastructure',
    },
    {
      sku: 'CLD-DB-HA',
      name: 'High-Availability Managed PostgreSQL Cluster',
      description: 'Triple-replica automated failover PostgreSQL managed cluster with point-in-time recovery.',
      unit: 'month',
      basePrice: '28000.00',
      estimatedCost: '19000.00',
      taxRate: '18.00',
      productType: 'SUBSCRIPTION',
      categoryName: 'Cloud Infrastructure',
    },
    {
      sku: 'HW-EDGE-G4',
      name: 'DealFlow Edge Gateway Appliance G4',
      description: 'Industrial-grade tamper-evident edge appliance for local telemetry and warehouse sync.',
      unit: 'device',
      basePrice: '85000.00',
      estimatedCost: '55000.00',
      taxRate: '18.00',
      productType: 'ONE_TIME',
      categoryName: 'Security & Hardware',
    },
    {
      sku: 'HW-SEC-T10',
      name: 'Hardware Security Key Box (Pack of 10)',
      description: 'FIPS 140-2 Level 3 certified cryptographic hardware tokens for enterprise SSO.',
      unit: 'pack',
      basePrice: '15000.00',
      estimatedCost: '9000.00',
      taxRate: '18.00',
      productType: 'ONE_TIME',
      categoryName: 'Security & Hardware',
    },
    {
      sku: 'SRV-IMP-40',
      name: 'Enterprise Implementation & Integration Pack (40 hrs)',
      description: 'Dedicated solution architect onboarding, ERP connector integration, and team training.',
      unit: 'hours',
      basePrice: '100000.00',
      estimatedCost: '40000.00',
      taxRate: '18.00',
      productType: 'SERVICE',
      categoryName: 'Professional Services',
    },
  ];

  const productMap = {};
  for (const prod of SEED_PRODUCTS) {
    const cat = categoryMap[prod.categoryName];
    const existing = await db
      .select()
      .from(products)
      .where(eq(products.sku, prod.sku))
      .limit(1);

    if (existing.length === 0) {
      const inserted = await db
        .insert(products)
        .values({
          categoryId: cat.id,
          sku: prod.sku,
          name: prod.name,
          description: prod.description,
          unit: prod.unit,
          basePrice: prod.basePrice,
          estimatedCost: prod.estimatedCost,
          taxRate: prod.taxRate,
          productType: prod.productType,
          isActive: true,
        })
        .returning();
      productMap[prod.sku] = inserted[0];
      console.log(`[SEED] Created product: ${prod.sku} - ${prod.name}`);
    } else {
      const updated = await db
        .update(products)
        .set({
          categoryId: cat.id,
          name: prod.name,
          description: prod.description,
          unit: prod.unit,
          basePrice: prod.basePrice,
          estimatedCost: prod.estimatedCost,
          taxRate: prod.taxRate,
          productType: prod.productType,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(products.sku, prod.sku))
        .returning();
      productMap[prod.sku] = updated[0];
      console.log(`[SEED] Updated product: ${prod.sku}`);
    }
  }

  // 6b. Seed Subscription Plans, then backfill the two SUBSCRIPTION products
  console.log('[SEED] Upserting subscription plans...');
  const SEED_PLANS = [
    { name: 'Standard Monthly', frequency: 'MONTHLY', price: '0.00', cancellationNoticeDays: 0 },
    { name: 'Standard Quarterly', frequency: 'QUARTERLY', price: '0.00', cancellationNoticeDays: 15 },
    { name: 'Standard Yearly', frequency: 'YEARLY', price: '0.00', cancellationNoticeDays: 30 },
  ];

  const insertedPlans = {};
  for (const plan of SEED_PLANS) {
    const existing = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, plan.name));
    if (existing.length > 0) {
      insertedPlans[plan.name] = existing[0];
    } else {
      const [created] = await db.insert(subscriptionPlans).values(plan).returning();
      insertedPlans[plan.name] = created;
    }
    console.log(`[SEED] Subscription plan ready: ${plan.name} (${plan.frequency})`);
  }

  // Backfill all SUBSCRIPTION products with the Monthly plan
  const monthlyPlan = insertedPlans['Standard Monthly'];
  await db
    .update(products)
    .set({ subscriptionPlanId: monthlyPlan.id })
    .where(eq(products.productType, 'SUBSCRIPTION'));
  console.log(`[SEED] Linked all SUBSCRIPTION products -> Standard Monthly plan`);

  // 7. Seed Price Lists
  console.log('[SEED] Upserting price lists...');
  const SEED_PRICE_LISTS = [
    { name: 'Standard Commercial Price List (INR)', currency: 'INR', isActive: true },
    { name: 'Enterprise Gold Partner Matrix (INR)', currency: 'INR', isActive: true },
  ];

  const priceListMap = {};
  for (const pl of SEED_PRICE_LISTS) {
    const existing = await db
      .select()
      .from(priceLists)
      .where(eq(priceLists.name, pl.name))
      .limit(1);

    if (existing.length === 0) {
      const inserted = await db.insert(priceLists).values(pl).returning();
      priceListMap[pl.name] = inserted[0];
      console.log(`[SEED] Created price list: ${pl.name}`);
    } else {
      priceListMap[pl.name] = existing[0];
    }
  }

  // Seed Price List Items (Gold Tier negotiated rates)
  const goldList = priceListMap['Enterprise Gold Partner Matrix (INR)'];
  const coreProd = productMap['DF-ENT-01'];
  if (goldList && coreProd) {
    const existingItem = await db
      .select()
      .from(priceListItems)
      .where(sql`${priceListItems.priceListId} = ${goldList.id} AND ${priceListItems.productId} = ${coreProd.id} AND ${priceListItems.customerTier} = 'GOLD'`)
      .limit(1);

    if (existingItem.length === 0) {
      await db.insert(priceListItems).values({
        priceListId: goldList.id,
        productId: coreProd.id,
        customerTier: 'GOLD',
        unitPrice: '95000.00', // Gold negotiated base price
      });
      console.log(`[SEED] Seeded Gold tier price list override for ${coreProd.sku}: 95000.00 INR`);
    }
  }

  // 8. Seed Customers
  console.log('[SEED] Upserting enterprise customer accounts...');
  const salesRepA = userMap['rep@dealflow.io'];
  const salesRepB = userMap['rep2@dealflow.io'];
  const stdPriceList = priceListMap['Standard Commercial Price List (INR)'];

  const SEED_CUSTOMERS = [
    {
      name: 'Apex Global Logistics Pvt Ltd',
      email: 'procurement@apexlogistics.com',
      phone: '+91 98200 11223',
      tier: 'GOLD',
      billingAddress: 'Tower 4, Bandra-Kurla Complex, Mumbai, MH 400051',
      priceListId: goldList?.id || stdPriceList?.id,
      assignedRepId: salesRepA?.id || null,
    },
    {
      name: 'Starlight Fintech Solutions',
      email: 'it-purchasing@starlightfin.io',
      phone: '+91 98450 44556',
      tier: 'SILVER',
      billingAddress: 'Prestige Tech Park, Outer Ring Road, Bangalore, KA 560103',
      priceListId: stdPriceList?.id,
      assignedRepId: salesRepA?.id || null,
    },
    {
      name: 'BlueWave Retailers & Distribution',
      email: 'ops@bluewaveretail.com',
      phone: '+91 98110 77889',
      tier: 'BRONZE',
      billingAddress: 'Sector 62, Electronic City, Noida, UP 201309',
      priceListId: stdPriceList?.id,
      assignedRepId: salesRepA?.id || null,
    },
    {
      name: 'OmniCorp International Infra',
      email: 'enterprise-deals@omnicorp.com',
      phone: '+91 98765 43210',
      tier: 'GOLD',
      billingAddress: 'Cyber City, DLF Phase 2, Gurugram, HR 122002',
      priceListId: goldList?.id || stdPriceList?.id,
      assignedRepId: salesRepB?.id || salesRepA?.id || null,
    },
  ];

  for (const cust of SEED_CUSTOMERS) {
    const existing = await db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${cust.email.toLowerCase()}`)
      .limit(1);

    if (existing.length === 0) {
      await db.insert(customers).values({
        name: cust.name,
        email: cust.email.toLowerCase(),
        phone: cust.phone,
        tier: cust.tier,
        assignedRepId: cust.assignedRepId,
        priceListId: cust.priceListId || null,
        billingAddress: cust.billingAddress,
      });
      console.log(`[SEED] Created customer: ${cust.name} (${cust.tier})`);
    } else {
      await db
        .update(customers)
        .set({
          name: cust.name,
          phone: cust.phone,
          tier: cust.tier,
          assignedRepId: cust.assignedRepId,
          priceListId: cust.priceListId || null,
          billingAddress: cust.billingAddress,
          updatedAt: new Date(),
        })
        .where(sql`lower(${customers.email}) = ${cust.email.toLowerCase()}`);
      console.log(`[SEED] Updated customer: ${cust.name} (${cust.tier})`);
    }
  }

  // 9. Seed Warehouses & Stock (Phase 5)
  console.log('[SEED] Upserting warehouses and live inventory...');
  const SEED_WAREHOUSES = [
    { name: 'Main Warehouse', location: 'Mumbai Central Logistics Hub', shippingCostWeight: '1.00', isActive: true },
    { name: 'East Depot', location: 'Kolkata Port Terminal', shippingCostWeight: '1.50', isActive: true },
    { name: 'North DC', location: 'Delhi NCR Fulfillment Hub', shippingCostWeight: '1.20', isActive: true },
  ];

  const warehouseMap = {};
  for (const wh of SEED_WAREHOUSES) {
    const existing = await db
      .select()
      .from(warehouses)
      .where(eq(warehouses.name, wh.name))
      .limit(1);

    if (existing.length === 0) {
      const inserted = await db.insert(warehouses).values(wh).returning();
      warehouseMap[wh.name] = inserted[0];
      console.log(`[SEED] Created warehouse: ${wh.name} (${wh.location})`);
    } else {
      warehouseMap[wh.name] = existing[0];
    }
  }

  // Stock quantities per product and warehouse
  const mainWh = warehouseMap['Main Warehouse'];
  const eastWh = warehouseMap['East Depot'];
  const northWh = warehouseMap['North DC'];

  if (mainWh && eastWh && northWh) {
    const allProds = Object.values(productMap);
    for (const prod of allProds) {
      // Main Warehouse stock
      await db
        .insert(warehouseStock)
        .values({
          warehouseId: mainWh.id,
          productId: prod.id,
          quantityOnHand: prod.productType === 'ONE_TIME' ? 40 : 100,
          reorderThreshold: 10,
        })
        .onConflictDoUpdate({
          target: [warehouseStock.warehouseId, warehouseStock.productId],
          set: { quantityOnHand: prod.productType === 'ONE_TIME' ? 40 : 100 },
        });

      // East Depot stock
      await db
        .insert(warehouseStock)
        .values({
          warehouseId: eastWh.id,
          productId: prod.id,
          quantityOnHand: prod.productType === 'ONE_TIME' ? 10 : 50,
          reorderThreshold: 5,
        })
        .onConflictDoUpdate({
          target: [warehouseStock.warehouseId, warehouseStock.productId],
          set: { quantityOnHand: prod.productType === 'ONE_TIME' ? 10 : 50 },
        });

      // North DC stock
      await db
        .insert(warehouseStock)
        .values({
          warehouseId: northWh.id,
          productId: prod.id,
          quantityOnHand: prod.productType === 'ONE_TIME' ? 25 : 75,
          reorderThreshold: 8,
        })
        .onConflictDoUpdate({
          target: [warehouseStock.warehouseId, warehouseStock.productId],
          set: { quantityOnHand: prod.productType === 'ONE_TIME' ? 25 : 75 },
        });
    }
    console.log('[SEED] Seeded multi-warehouse inventory stock levels.');
  }
  
  // 10. Seed Customer Portal Contacts (customer_users)
  console.log('[SEED] Upserting Customer Portal user contacts...');
  const customerList = await db.select().from(customers);
  const customerMap = {};
  for (const c of customerList) {
    customerMap[c.email.toLowerCase()] = c;
  }

  const SEED_CUSTOMER_USERS = [
    {
      customerEmail: 'procurement@apexlogistics.com',
      email: 'customer@apexlogistics.com',
      name: 'Vikram Malhotra (Procurement Head)',
    },
    {
      customerEmail: 'it-purchasing@starlightfin.io',
      email: 'customer@starlightfin.io',
      name: 'Priya Sharma (IT Purchasing)',
    },
    {
      customerEmail: 'enterprise-deals@omnicorp.com',
      email: 'customer@omnicorp.com',
      name: 'David Vance (OmniCorp VP)',
    },
  ];

  for (const cu of SEED_CUSTOMER_USERS) {
    const parentCustomer = customerMap[cu.customerEmail.toLowerCase()] || customerList[0];
    if (parentCustomer) {
      const existing = await db
        .select()
        .from(customerUsers)
        .where(sql`lower(${customerUsers.email}) = ${cu.email.toLowerCase()}`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(customerUsers).values({
          customerId: parentCustomer.id,
          name: cu.name,
          email: cu.email.toLowerCase(),
          passwordHash,
          isActive: true,
        });
        console.log(`[SEED] Created Customer Portal user: ${cu.email} (${cu.name})`);
      } else {
        await db
          .update(customerUsers)
          .set({
            name: cu.name,
            passwordHash,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(sql`lower(${customerUsers.email}) = ${cu.email.toLowerCase()}`);
        console.log(`[SEED] Updated Customer Portal user: ${cu.email}`);
      }
    }
  }

  // 11. Seed Rich Simulation Data for Elena Rostova (Operations Head) & David Miller (Finance Lead)
  console.log('[SEED] Upserting rich simulation scenarios for Elena Rostova & David Miller...');

  const dbUsers = await db.select().from(users);
  const userByEmail = {};
  for (const u of dbUsers) userByEmail[u.email.toLowerCase()] = u;

  const userAdmin = userByEmail['admin@dealflow.io'];
  const userRep = userByEmail['rep@dealflow.io'];
  const userManager = userByEmail['manager@dealflow.io'];
  const userFinance = userByEmail['finance@dealflow.io']; // David Miller
  const userOps = userByEmail['ops@dealflow.io']; // Elena Rostova

  const dbCustomers = await db.select().from(customers);
  const customerByEmail = {};
  for (const c of dbCustomers) customerByEmail[c.email.toLowerCase()] = c;

  const custApex = customerByEmail['procurement@apexlogistics.com'] || dbCustomers[0];
  const custStarlight = customerByEmail['it-purchasing@starlightfin.io'] || dbCustomers[1] || dbCustomers[0];
  const custBlueWave = customerByEmail['orders@bluewavedist.com'] || dbCustomers[2] || dbCustomers[0];
  const custOmni = customerByEmail['enterprise-deals@omnicorp.com'] || dbCustomers[3] || dbCustomers[0];

  const dbProducts = await db.select().from(products);
  const productBySku = {};
  for (const p of dbProducts) productBySku[p.sku] = p;

  const prodSoftware = productBySku['DF-ENT-01'];
  const prodAnalytics = productBySku['DF-ANL-02'];
  const prodCloud = productBySku['CLD-POD-32'];
  const prodDb = productBySku['CLD-DB-HA'];
  const prodHardware = productBySku['HW-EDGE-G4'];
  const prodSecurityKey = productBySku['HW-SEC-T10'];
  const prodService = productBySku['SRV-IMP-40'];

  const dbWarehouses = await db.select().from(warehouses);
  const whByName = {};
  for (const w of dbWarehouses) whByName[w.name] = w;

  const whMain = whByName['Main Warehouse'] || dbWarehouses[0];
  const whEast = whByName['East Depot'] || dbWarehouses[1] || dbWarehouses[0];
  const whNorth = whByName['North DC'] || dbWarehouses[2] || dbWarehouses[0];

  const dbPlans = await db.select().from(subscriptionPlans);
  const planByName = {};
  for (const pl of dbPlans) planByName[pl.name] = pl;
  const demoMonthlyPlan = planByName['Standard Monthly'] || dbPlans[0];

  // ==========================================
  // SCENARIO 1 (Elena Rostova / Operations):
  // Order Awaiting Warehouse Fulfillment Split (ORD-OPS-SPLIT-01)
  // ==========================================
  const quoteOpsSplitNum = 'Q-OPS-SPLIT-01';
  let [quoteOpsSplit] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteOpsSplitNum));
  if (!quoteOpsSplit) {
    [quoteOpsSplit] = await db.insert(quotations).values({
      quoteNumber: quoteOpsSplitNum,
      customerId: custApex.id,
      salesRepId: userRep.id,
      status: 'APPROVED',
      subtotal: '5550000.00',
      discountTotal: '0.00',
      taxTotal: '999000.00',
      grandTotal: '6549000.00',
    }).returning();

    await db.insert(quotationItems).values([
      {
        quotationId: quoteOpsSplit.id,
        productId: prodHardware.id,
        quantity: 60,
        unitPrice: '85000.00',
        allowedDiscountPct: '20.00',
        discountPct: '0.00',
        discountAmount: '0.00',
        lineTotal: '6018000.00',
      },
      {
        quotationId: quoteOpsSplit.id,
        productId: prodSecurityKey.id,
        quantity: 30,
        unitPrice: '15000.00',
        allowedDiscountPct: '20.00',
        discountPct: '0.00',
        discountAmount: '0.00',
        lineTotal: '531000.00',
      }
    ]);
  }

  const orderOpsSplitNum = 'ORD-OPS-SPLIT-01';
  let [orderOpsSplit] = await db.select().from(orders).where(eq(orders.orderNumber, orderOpsSplitNum));
  if (!orderOpsSplit) {
    [orderOpsSplit] = await db.insert(orders).values({
      orderNumber: orderOpsSplitNum,
      quotationId: quoteOpsSplit.id,
      customerId: custApex.id,
      status: 'PENDING_FULFILLMENT',
      subtotal: quoteOpsSplit.subtotal,
      discountTotal: quoteOpsSplit.discountTotal,
      taxTotal: quoteOpsSplit.taxTotal,
      grandTotal: quoteOpsSplit.grandTotal,
      estimatedDeliveryDate: '2026-09-18',
    }).returning();

    const qItems = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quoteOpsSplit.id));
    for (const qi of qItems) {
      await db.insert(orderItems).values({
        orderId: orderOpsSplit.id,
        quotationItemId: qi.id,
        productId: qi.productId,
        quantity: qi.quantity,
        unitPrice: qi.unitPrice,
        discountPct: qi.discountPct,
        discountAmount: qi.discountAmount,
        lineTotal: qi.lineTotal,
        billingLineType: 'ONE_TIME',
      });
    }
  }
  console.log(`[SEED] Elena Simulation: Created Order awaiting split ${orderOpsSplitNum}`);

  // ==========================================
  // SCENARIO 2 (Elena Rostova / Operations & Finance Backorder Privilege):
  // Order with Open Backorder & Partial Fulfillment (ORD-OPS-BACKORDER-02)
  // ==========================================
  const quoteOpsBackorderNum = 'Q-OPS-BACKORDER-02';
  let [quoteOpsBackorder] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteOpsBackorderNum));
  if (!quoteOpsBackorder) {
    [quoteOpsBackorder] = await db.insert(quotations).values({
      quoteNumber: quoteOpsBackorderNum,
      customerId: custStarlight.id,
      salesRepId: userRep.id,
      status: 'APPROVED',
      subtotal: '7650000.00',
      discountTotal: '0.00',
      taxTotal: '1377000.00',
      grandTotal: '9027000.00',
    }).returning();

    await db.insert(quotationItems).values([
      {
        quotationId: quoteOpsBackorder.id,
        productId: prodHardware.id,
        quantity: 90,
        unitPrice: '85000.00',
        allowedDiscountPct: '20.00',
        discountPct: '0.00',
        discountAmount: '0.00',
        lineTotal: '9027000.00',
      }
    ]);
  }

  const orderOpsBackorderNum = 'ORD-OPS-BACKORDER-02';
  let [orderOpsBackorder] = await db.select().from(orders).where(eq(orders.orderNumber, orderOpsBackorderNum));
  if (!orderOpsBackorder) {
    [orderOpsBackorder] = await db.insert(orders).values({
      orderNumber: orderOpsBackorderNum,
      quotationId: quoteOpsBackorder.id,
      customerId: custStarlight.id,
      status: 'PARTIALLY_FULFILLED',
      subtotal: quoteOpsBackorder.subtotal,
      discountTotal: quoteOpsBackorder.discountTotal,
      taxTotal: quoteOpsBackorder.taxTotal,
      grandTotal: quoteOpsBackorder.grandTotal,
      estimatedDeliveryDate: '2026-09-20',
    }).returning();

    const [qItem] = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quoteOpsBackorder.id));
    const [oItem] = await db.insert(orderItems).values({
      orderId: orderOpsBackorder.id,
      quotationItemId: qItem.id,
      productId: qItem.productId,
      quantity: 90,
      unitPrice: qItem.unitPrice,
      discountPct: qItem.discountPct,
      discountAmount: qItem.discountAmount,
      lineTotal: qItem.lineTotal,
      billingLineType: 'ONE_TIME',
    }).returning();

    // Partial fulfillment allocations: 40 from Mumbai, 25 from Delhi, 10 from Kolkata = 75 total allocated
    await db.insert(fulfillmentAllocations).values([
      { orderId: orderOpsBackorder.id, orderItemId: oItem.id, warehouseId: whMain.id, quantityAllocated: 40, shippingCost: '40.00' },
      { orderId: orderOpsBackorder.id, orderItemId: oItem.id, warehouseId: whNorth.id, quantityAllocated: 25, shippingCost: '30.00' },
      { orderId: orderOpsBackorder.id, orderItemId: oItem.id, warehouseId: whEast.id, quantityAllocated: 10, shippingCost: '15.00' },
    ]);

    // Remaining 15 units backordered
    await db.insert(backorders).values({
      orderItemId: oItem.id,
      quantityRequested: 90,
      quantityFulfilled: 75,
      quantityBackordered: 15,
      status: 'OPEN',
    });
  }
  console.log(`[SEED] Elena Simulation: Created Order with open Backorders ${orderOpsBackorderNum}`);

  // ==========================================
  // SCENARIO 3 (David Miller / Finance):
  // 2nd-Level Approval Forwarded to Finance (Q-FIN-2ND-APPR-01)
  // ==========================================
  const quoteFinApprNum = 'Q-FIN-2ND-APPR-01';
  let [quoteFinAppr] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteFinApprNum));
  if (!quoteFinAppr) {
    [quoteFinAppr] = await db.insert(quotations).values({
      quoteNumber: quoteFinApprNum,
      customerId: custOmni.id,
      salesRepId: userRep.id,
      status: 'PENDING_APPROVAL',
      subtotal: '1200000.00',
      discountTotal: '360000.00', // 30% discount -> blended risk > 25% requires MANAGER_FINANCE
      taxTotal: '151200.00',
      grandTotal: '991200.00',
    }).returning();

    await db.insert(quotationItems).values([
      {
        quotationId: quoteFinAppr.id,
        productId: prodSoftware.id,
        quantity: 10,
        unitPrice: '120000.00',
        allowedDiscountPct: '35.00',
        discountPct: '30.00',
        discountAmount: '360000.00',
        lineTotal: '991200.00',
      }
    ]);

    // Create approval request with requiredLevel = MANAGER_FINANCE
    const [apprReq] = await db.insert(approvalRequests).values({
      quotationId: quoteFinAppr.id,
      blendedRiskScore: '31.50',
      requiredLevel: 'MANAGER_FINANCE',
      status: 'PENDING',
    }).returning();

    // Sarah Chen (Sales Manager) has already approved the 1st step!
    await db.insert(approvalActions).values({
      approvalRequestId: apprReq.id,
      actorId: userManager.id,
      level: 'MANAGER',
      action: 'APPROVED',
      reason: 'Strategic annual deal discount recommended for enterprise expansion.',
    });
  }
  console.log(`[SEED] David Simulation: Created 2nd-Level Approval pending Finance ${quoteFinApprNum}`);

  // ==========================================
  // SCENARIO 4 (David Miller / Finance):
  // Reconciliation Ledger: Due Recurring Cycle Ready to Invoice
  // ==========================================
  const quoteFinDueNum = 'Q-FIN-RECON-DUE-02';
  let [quoteFinDue] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteFinDueNum));
  if (!quoteFinDue) {
    [quoteFinDue] = await db.insert(quotations).values({
      quoteNumber: quoteFinDueNum,
      customerId: custApex.id,
      salesRepId: userRep.id,
      status: 'APPROVED',
      subtotal: '96000.00',
      discountTotal: '0.00',
      taxTotal: '17280.00',
      grandTotal: '113280.00',
    }).returning();

    await db.insert(quotationItems).values([
      {
        quotationId: quoteFinDue.id,
        productId: prodCloud.id,
        quantity: 2,
        unitPrice: '48000.00',
        allowedDiscountPct: '15.00',
        discountPct: '0.00',
        discountAmount: '0.00',
        lineTotal: '113280.00',
      }
    ]);
  }

  const orderFinDueNum = 'ORD-FIN-RECON-DUE-02';
  let [orderFinDue] = await db.select().from(orders).where(eq(orders.orderNumber, orderFinDueNum));
  if (!orderFinDue) {
    [orderFinDue] = await db.insert(orders).values({
      orderNumber: orderFinDueNum,
      quotationId: quoteFinDue.id,
      customerId: custApex.id,
      status: 'FULFILLED',
      subtotal: quoteFinDue.subtotal,
      discountTotal: quoteFinDue.discountTotal,
      taxTotal: quoteFinDue.taxTotal,
      grandTotal: quoteFinDue.grandTotal,
    }).returning();

    const [qi] = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quoteFinDue.id));
    const [oi] = await db.insert(orderItems).values({
      orderId: orderFinDue.id,
      quotationItemId: qi.id,
      productId: qi.productId,
      quantity: qi.quantity,
      unitPrice: qi.unitPrice,
      discountPct: qi.discountPct,
      discountAmount: qi.discountAmount,
      lineTotal: qi.lineTotal,
      billingLineType: 'RECURRING',
    }).returning();

    const [subLine] = await db.insert(subscriptionLines).values({
      orderItemId: oi.id,
      subscriptionPlanId: demoMonthlyPlan.id,
      quantity: 2,
      recurringAmount: '113280.00',
      startDate: '2026-08-01',
      nextBillingDate: '2026-09-01',
      status: 'ACTIVE',
    }).returning();

    // Schedule start date set to past month (2026-08-01) -> due for reconciliation!
    await db.insert(billingSchedules).values({
      subscriptionLineId: subLine.id,
      billingPeriodStart: '2026-08-01',
      billingPeriodEnd: '2026-09-01',
      amount: '113280.00',
      isProrated: false,
      status: 'SCHEDULED',
    });
  }
  console.log(`[SEED] David Simulation: Created Due Recurring Cycle ${orderFinDueNum}`);

  // ==========================================
  // SCENARIO 5 (David Miller / Finance):
  // Reconciliation Ledger: Overdue Receivables Commercial Invoice
  // ==========================================
  const quoteFinOverdueNum = 'Q-FIN-OVERDUE-03';
  let [quoteFinOverdue] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteFinOverdueNum));
  if (!quoteFinOverdue) {
    [quoteFinOverdue] = await db.insert(quotations).values({
      quoteNumber: quoteFinOverdueNum,
      customerId: custBlueWave.id,
      salesRepId: userRep.id,
      status: 'APPROVED',
      subtotal: '200000.00',
      discountTotal: '0.00',
      taxTotal: '36000.00',
      grandTotal: '236000.00',
    }).returning();

    await db.insert(quotationItems).values([
      {
        quotationId: quoteFinOverdue.id,
        productId: prodService.id,
        quantity: 2,
        unitPrice: '100000.00',
        allowedDiscountPct: '25.00',
        discountPct: '0.00',
        discountAmount: '0.00',
        lineTotal: '236000.00',
      }
    ]);
  }

  const orderFinOverdueNum = 'ORD-FIN-OVERDUE-03';
  let [orderFinOverdue] = await db.select().from(orders).where(eq(orders.orderNumber, orderFinOverdueNum));
  if (!orderFinOverdue) {
    [orderFinOverdue] = await db.insert(orders).values({
      orderNumber: orderFinOverdueNum,
      quotationId: quoteFinOverdue.id,
      customerId: custBlueWave.id,
      status: 'FULFILLED',
      subtotal: quoteFinOverdue.subtotal,
      discountTotal: quoteFinOverdue.discountTotal,
      taxTotal: quoteFinOverdue.taxTotal,
      grandTotal: quoteFinOverdue.grandTotal,
    }).returning();

    const [qi] = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quoteFinOverdue.id));
    const [oi] = await db.insert(orderItems).values({
      orderId: orderFinOverdue.id,
      quotationItemId: qi.id,
      productId: qi.productId,
      quantity: qi.quantity,
      unitPrice: qi.unitPrice,
      discountPct: qi.discountPct,
      discountAmount: qi.discountAmount,
      lineTotal: qi.lineTotal,
      billingLineType: 'ONE_TIME',
    }).returning();

    // Overdue invoice with due date in the past
    const invNumber = 'INV-2026-OVERDUE-01';
    const [inv] = await db.insert(invoices).values({
      invoiceNumber: invNumber,
      orderId: orderFinOverdue.id,
      customerId: custBlueWave.id,
      invoiceType: 'ONE_TIME',
      status: 'PARTIALLY_PAID',
      subtotal: '200000.00',
      taxTotal: '36000.00',
      total: '236000.00',
      amountPaid: '50000.00',
      dueDate: '2026-08-15',
      issuedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    }).returning();

    await db.insert(invoiceLines).values({
      invoiceId: inv.id,
      orderItemId: oi.id,
      description: 'Enterprise Implementation & Integration Pack (2x)',
      amount: '236000.00',
    });

    await db.insert(payments).values({
      invoiceId: inv.id,
      amount: '50000.00',
      method: 'BANK_TRANSFER',
      status: 'SUCCEEDED',
      transactionReference: 'NEFT-INIT-PARTIAL-50K',
      paidAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    });
  }
  console.log(`[SEED] David Simulation: Created Overdue Invoice INV-2026-OVERDUE-01`);

  // ==========================================
  // SCENARIO 6 (David Miller / Finance):
  // Reconciliation Ledger: Unapplied Credit Note
  // ==========================================
  const existingCn = await db.select().from(creditNotes).where(eq(creditNotes.reason, 'Mid-cycle Cloud Pod downgrade proration credit'));
  if (existingCn.length === 0) {
    const existingSubLines = await db.select().from(subscriptionLines).limit(1);
    if (existingSubLines.length > 0) {
      await db.insert(creditNotes).values({
        subscriptionLineId: existingSubLines[0].id,
        amount: '18400.00',
        reason: 'Mid-cycle Cloud Pod downgrade proration credit',
        status: 'ISSUED',
        issuedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      });
      console.log(`[SEED] David Simulation: Created Unapplied Credit Note for ₹18,400`);
    }
  }

  console.log('[SEED] ✅ Master data seed & Elena/David rich simulations completed successfully.');
  process.exit(0);
}


runSeed().catch((err) => {
  console.error('[SEED] ❌ Failed to seed database:', err);
  process.exit(1);
});
