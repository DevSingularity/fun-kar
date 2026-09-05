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
} from './schema/governance.js';
import {
  warehouses,
  warehouseStock,
} from './schema/warehouses.js';
import { hashPassword } from '../common/password.util.js';
import { sql, eq } from 'drizzle-orm';

const SEED_USERS = [
  { name: 'System Administrator', email: 'admin@dealflow.io', role: 'ADMIN' },
  { name: 'Alex Morgan (Sales Rep)', email: 'rep@dealflow.io', role: 'SALES_REP' },
  { name: 'Sarah Chen (Sales Manager)', email: 'manager@dealflow.io', role: 'SALES_MANAGER' },
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
  const salesRep = userMap['rep@dealflow.io'];
  const stdPriceList = priceListMap['Standard Commercial Price List (INR)'];

  const SEED_CUSTOMERS = [
    {
      name: 'Apex Global Logistics Pvt Ltd',
      email: 'procurement@apexlogistics.com',
      phone: '+91 98200 11223',
      tier: 'GOLD',
      billingAddress: 'Tower 4, Bandra-Kurla Complex, Mumbai, MH 400051',
      priceListId: goldList?.id || stdPriceList?.id,
    },
    {
      name: 'Starlight Fintech Solutions',
      email: 'it-purchasing@starlightfin.io',
      phone: '+91 98450 44556',
      tier: 'SILVER',
      billingAddress: 'Prestige Tech Park, Outer Ring Road, Bangalore, KA 560103',
      priceListId: stdPriceList?.id,
    },
    {
      name: 'BlueWave Retailers & Distribution',
      email: 'ops@bluewaveretail.com',
      phone: '+91 98110 77889',
      tier: 'BRONZE',
      billingAddress: 'Sector 62, Electronic City, Noida, UP 201309',
      priceListId: stdPriceList?.id,
    },
    {
      name: 'OmniCorp International Infra',
      email: 'enterprise-deals@omnicorp.com',
      phone: '+91 98765 43210',
      tier: 'GOLD',
      billingAddress: 'Cyber City, DLF Phase 2, Gurugram, HR 122002',
      priceListId: goldList?.id || stdPriceList?.id,
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
        assignedRepId: salesRep?.id || null,
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
          assignedRepId: salesRep?.id || null,
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
  console.log('[SEED] ✅ Master data seed (Phases 1–5) & Customer Portal seed completed successfully.');
  process.exit(0);
}


runSeed().catch((err) => {
  console.error('[SEED] ❌ Failed to seed database:', err);
  process.exit(1);
});
