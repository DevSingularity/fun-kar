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
import { negotiationRequests, negotiationComments } from './schema/negotiation.js';
import { hashPassword } from '../common/password.util.js';
import { sql, eq, and } from 'drizzle-orm';

const DEFAULT_PASSWORD = 'Password123!';

// 1. Internal Users (Keeping exact emails & roles)
const SEED_USERS = [
  { name: 'System Administrator', email: 'admin@dealflow.io', role: 'ADMIN' },
  { name: 'Alex Morgan (Senior Sales Rep)', email: 'rep@dealflow.io', role: 'SALES_REP' },
  { name: 'Sarah Chen (Sales Manager - Team North)', email: 'manager@dealflow.io', role: 'SALES_MANAGER' },
  { name: 'Priya Nair (Sales Manager - Team South)', email: 'manager2@dealflow.io', role: 'SALES_MANAGER' },
  { name: 'Rohan Gupta (Enterprise Sales Rep)', email: 'rep2@dealflow.io', role: 'SALES_REP' },
  { name: 'David Miller (Finance & Commercial Controller)', email: 'finance@dealflow.io', role: 'FINANCE' },
  { name: 'Elena Rostova (Head of Supply Chain & Fulfillment)', email: 'ops@dealflow.io', role: 'OPERATIONS' },
];

const SEED_CATEGORIES = [
  { name: 'Enterprise Software', description: 'Core licenses, AI analytics modules, and governance platform' },
  { name: 'Cloud Infrastructure', description: 'Dedicated pods, database clusters, and cloud compute' },
  { name: 'Security & Hardware', description: 'Hardware appliances, cryptographic tokens, and telemetry arrays' },
  { name: 'Professional Services', description: 'Architecture advisory, ERP connectors, and 24/7 TAM support' },
  { name: 'Hardware Subscriptions & SLA', description: 'Mission-critical care plans and recurring maintenance SLAs' },
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
    'Hardware Subscriptions & SLA': '20.00',
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

  // 6. Seed Subscription Plans
  console.log('[SEED] Upserting subscription plans...');
  const SEED_PLANS = [
    { name: 'Standard Monthly', frequency: 'MONTHLY', price: '0.00', cancellationNoticeDays: 0 },
    { name: 'Care Plan 2yr', frequency: 'MONTHLY', price: '4600.00', cancellationNoticeDays: 30 },
    { name: 'Support SLA', frequency: 'QUARTERLY', price: '30000.00', cancellationNoticeDays: 15 },
    { name: 'Enterprise Annual Dedicated', frequency: 'YEARLY', price: '120000.00', cancellationNoticeDays: 60 },
  ];

  const planMap = {};
  for (const plan of SEED_PLANS) {
    const existing = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, plan.name));
    if (existing.length > 0) {
      planMap[plan.name] = existing[0];
    } else {
      const [created] = await db.insert(subscriptionPlans).values(plan).returning();
      planMap[plan.name] = created;
    }
    console.log(`[SEED] Subscription plan ready: ${plan.name} (${plan.frequency})`);
  }

  // 7. Seed Diverse Products Catalog
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
      description: 'AI-driven margin optimization and predictive deal scoring add-on module.',
      unit: 'license',
      basePrice: '35000.00',
      estimatedCost: '5000.00',
      taxRate: '18.00',
      productType: 'SERVICE',
      categoryName: 'Enterprise Software',
    },
    {
      sku: 'DF-GOV-AI',
      name: 'Autonomous Deal Governance & Audit Engine',
      description: 'Real-time multi-dimensional risk scoring, escalation routing, and regulatory audit trail.',
      unit: 'license',
      basePrice: '65000.00',
      estimatedCost: '12000.00',
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
      subscriptionPlanName: 'Standard Monthly',
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
      subscriptionPlanName: 'Standard Monthly',
    },
    {
      sku: 'CLD-CDN-TB',
      name: 'Enterprise Edge CDN & Anti-DDoS Shield',
      description: 'Global anycast edge caching with L3/L4/L7 threat mitigation and unmetered SSL.',
      unit: 'month',
      basePrice: '16500.00',
      estimatedCost: '9500.00',
      taxRate: '18.00',
      productType: 'SUBSCRIPTION',
      categoryName: 'Cloud Infrastructure',
      subscriptionPlanName: 'Standard Monthly',
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
      sku: 'HW-SENS-100',
      name: 'Industrial Warehouse Telemetry Sensor Array (Pack of 100)',
      description: 'Zigbee/BLE multi-sensor nodes for automated pallet tracking and environmental monitoring.',
      unit: 'pack',
      basePrice: '95000.00',
      estimatedCost: '62000.00',
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
    {
      sku: 'SRV-TAM-YR',
      name: 'Dedicated Technical Account Manager (Annual)',
      description: 'Assigned Principal Support Engineer, monthly architecture reviews, and 15-min priority SLA.',
      unit: 'year',
      basePrice: '250000.00',
      estimatedCost: '110000.00',
      taxRate: '18.00',
      productType: 'SERVICE',
      categoryName: 'Professional Services',
    },
    {
      sku: 'SLA-CARE-2Y',
      name: 'Care Plan 2yr 24/7 Mission Critical',
      description: 'Continuous 24/7 telemetry monitoring, hardware hot-swap, and zero-downtime maintenance SLA.',
      unit: 'month',
      basePrice: '4600.00',
      estimatedCost: '1800.00',
      taxRate: '18.00',
      productType: 'SUBSCRIPTION',
      categoryName: 'Hardware Subscriptions & SLA',
      subscriptionPlanName: 'Care Plan 2yr',
    },
    {
      sku: 'SLA-PREM-Q',
      name: 'Premium Support SLA 99.99%',
      description: 'Quarterly guaranteed SLA with financial rebate backing and dedicated incident command team.',
      unit: 'quarter',
      basePrice: '30000.00',
      estimatedCost: '12000.00',
      taxRate: '18.00',
      productType: 'SUBSCRIPTION',
      categoryName: 'Hardware Subscriptions & SLA',
      subscriptionPlanName: 'Support SLA',
    },
  ];

  const productMap = {};
  for (const prod of SEED_PRODUCTS) {
    const cat = categoryMap[prod.categoryName];
    const subPlan = prod.subscriptionPlanName ? planMap[prod.subscriptionPlanName] : null;

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
          subscriptionPlanId: subPlan?.id || null,
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
          subscriptionPlanId: subPlan?.id || null,
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

  // 8. Seed Price Lists
  console.log('[SEED] Upserting price lists...');
  const SEED_PRICE_LISTS = [
    { name: 'Standard Commercial Price List (INR)', currency: 'INR', isActive: true },
    { name: 'Enterprise Gold Partner Matrix (INR)', currency: 'INR', isActive: true },
    { name: 'Silver Preferential Matrix (INR)', currency: 'INR', isActive: true },
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

  // Seed Price List Items (Gold & Silver Tier negotiated rates)
  const goldList = priceListMap['Enterprise Gold Partner Matrix (INR)'];
  const silverList = priceListMap['Silver Preferential Matrix (INR)'];
  const coreProd = productMap['DF-ENT-01'];
  const edgeProd = productMap['HW-EDGE-G4'];

  if (goldList && coreProd) {
    await db.insert(priceListItems).values({
      priceListId: goldList.id,
      productId: coreProd.id,
      customerTier: 'GOLD',
      unitPrice: '95000.00',
    }).onConflictDoNothing();
  }

  if (silverList && edgeProd) {
    await db.insert(priceListItems).values({
      priceListId: silverList.id,
      productId: edgeProd.id,
      customerTier: 'SILVER',
      unitPrice: '78000.00',
    }).onConflictDoNothing();
  }

  // 9. Seed 12 Diverse Enterprise Customers
  console.log('[SEED] Upserting rich diverse enterprise customer accounts...');
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
      assignedRepId: salesRepA?.id,
    },
    {
      name: 'Starlight Fintech Solutions',
      email: 'it-purchasing@starlightfin.io',
      phone: '+91 98450 44556',
      tier: 'SILVER',
      billingAddress: 'Prestige Tech Park, Outer Ring Road, Bangalore, KA 560103',
      priceListId: silverList?.id || stdPriceList?.id,
      assignedRepId: salesRepA?.id,
    },
    {
      name: 'BlueWave Retailers & Distribution',
      email: 'ops@bluewaveretail.com',
      phone: '+91 98110 77889',
      tier: 'BRONZE',
      billingAddress: 'Sector 62, Electronic City, Noida, UP 201309',
      priceListId: stdPriceList?.id,
      assignedRepId: salesRepA?.id,
    },
    {
      name: 'OmniCorp International Infra',
      email: 'enterprise-deals@omnicorp.com',
      phone: '+91 98765 43210',
      tier: 'GOLD',
      billingAddress: 'Cyber City, DLF Phase 2, Gurugram, HR 122002',
      priceListId: goldList?.id || stdPriceList?.id,
      assignedRepId: salesRepB?.id,
    },
    {
      name: 'Aegis Healthcare & Biotech Systems',
      email: 'procurement@aegishealth.com',
      phone: '+91 98490 12345',
      tier: 'GOLD',
      billingAddress: 'Genome Valley, Shamirpet, Hyderabad, TG 500078',
      priceListId: goldList?.id || stdPriceList?.id,
      assignedRepId: salesRepA?.id,
    },
    {
      name: 'Zenith Renewable Energy Grid',
      email: 'sourcing@zenithenergy.com',
      phone: '+91 98230 67890',
      tier: 'SILVER',
      billingAddress: 'Hinjawadi IT Park Phase 1, Pune, MH 411057',
      priceListId: silverList?.id || stdPriceList?.id,
      assignedRepId: salesRepB?.id,
    },
    {
      name: 'Nova Aerospace & Defense Labs',
      email: 'contracts@novaaero.com',
      phone: '+91 98800 23456',
      tier: 'GOLD',
      billingAddress: 'Whitefield Technology Zone, Bengaluru, KA 560066',
      priceListId: goldList?.id || stdPriceList?.id,
      assignedRepId: salesRepB?.id,
    },
    {
      name: 'UrbanPulse Smart City Solutions',
      email: 'tenders@urbanpulse.in',
      phone: '+91 98400 34567',
      tier: 'BRONZE',
      billingAddress: 'Old Mahabalipuram Road (OMR), Chennai, TN 600096',
      priceListId: stdPriceList?.id,
      assignedRepId: salesRepA?.id,
    },
    {
      name: 'Krypton Microelectronics Corp',
      email: 'supplychain@kryptonsemi.com',
      phone: '+91 98980 45678',
      tier: 'SILVER',
      billingAddress: 'GIFT City SEZ Tower 1, Gandhinagar, GJ 382355',
      priceListId: silverList?.id || stdPriceList?.id,
      assignedRepId: salesRepB?.id,
    },
    {
      name: 'Titanium Heavy Engineering Ltd',
      email: 'purchases@titaniumeng.com',
      phone: '+91 98350 56789',
      tier: 'GOLD',
      billingAddress: 'Industrial Area, Bistupur, Jamshedpur, JH 831001',
      priceListId: goldList?.id || stdPriceList?.id,
      assignedRepId: salesRepB?.id,
    },
    {
      name: 'Paramount Media & Streaming Networks',
      email: 'licensing@paramountmedia.in',
      phone: '+91 98210 67891',
      tier: 'SILVER',
      billingAddress: 'Film City Complex, Goregaon East, Mumbai, MH 400065',
      priceListId: silverList?.id || stdPriceList?.id,
      assignedRepId: salesRepA?.id,
    },
    {
      name: 'GreenHorizon Agritech Innovations',
      email: 'operations@greenhorizon.in',
      phone: '+91 98140 78902',
      tier: 'BRONZE',
      billingAddress: 'Aerocity Business Park, Mohali, PB 140306',
      priceListId: stdPriceList?.id,
      assignedRepId: salesRepB?.id,
    },
  ];

  const customerMap = {};
  for (const cust of SEED_CUSTOMERS) {
    const existing = await db
      .select()
      .from(customers)
      .where(sql`lower(${customers.email}) = ${cust.email.toLowerCase()}`)
      .limit(1);

    if (existing.length === 0) {
      const [inserted] = await db.insert(customers).values({
        name: cust.name,
        email: cust.email.toLowerCase(),
        phone: cust.phone,
        tier: cust.tier,
        assignedRepId: cust.assignedRepId,
        priceListId: cust.priceListId || null,
        billingAddress: cust.billingAddress,
      }).returning();
      customerMap[cust.email.toLowerCase()] = inserted;
      console.log(`[SEED] Created customer: ${cust.name} (${cust.tier})`);
    } else {
      const [updated] = await db
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
        .where(sql`lower(${customers.email}) = ${cust.email.toLowerCase()}`)
        .returning();
      customerMap[cust.email.toLowerCase()] = updated;
      console.log(`[SEED] Updated customer: ${cust.name} (${cust.tier})`);
    }
  }

  // 10. Seed Customer Portal Users
  console.log('[SEED] Upserting Customer Portal user contacts...');
  const SEED_CUSTOMER_USERS = [
    { customerEmail: 'procurement@apexlogistics.com', email: 'customer@apexlogistics.com', name: 'Vikram Malhotra (Procurement VP)' },
    { customerEmail: 'it-purchasing@starlightfin.io', email: 'customer@starlightfin.io', name: 'Priya Sharma (IT Sourcing Director)' },
    { customerEmail: 'enterprise-deals@omnicorp.com', email: 'customer@omnicorp.com', name: 'David Vance (OmniCorp VP)' },
    { customerEmail: 'procurement@aegishealth.com', email: 'customer@aegishealth.com', name: 'Dr. Sunita Rao (Chief Technology Officer)' },
    { customerEmail: 'sourcing@zenithenergy.com', email: 'customer@zenithenergy.com', name: 'Rahul Deshmukh (Commercial Head)' },
  ];

  for (const cu of SEED_CUSTOMER_USERS) {
    const parentCustomer = customerMap[cu.customerEmail.toLowerCase()];
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

  // 11. Seed Warehouses & Inventory
  console.log('[SEED] Upserting warehouses and live inventory...');
  const SEED_WAREHOUSES = [
    { name: 'Main Warehouse', location: 'Mumbai Central Logistics Hub', shippingCostWeight: '1.00', isActive: true },
    { name: 'East Depot', location: 'Kolkata Port Terminal', shippingCostWeight: '1.50', isActive: true },
    { name: 'North DC', location: 'Delhi NCR Fulfillment Hub', shippingCostWeight: '1.20', isActive: true },
    { name: 'South Logistics Park', location: 'Bengaluru Hardware Depot', shippingCostWeight: '1.10', isActive: true },
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

  const mainWh = warehouseMap['Main Warehouse'];
  const eastWh = warehouseMap['East Depot'];
  const northWh = warehouseMap['North DC'];
  const southWh = warehouseMap['South Logistics Park'];

  if (mainWh && eastWh && northWh) {
    for (const prod of Object.values(productMap)) {
      if (prod.productType === 'ONE_TIME') {
        await db.insert(warehouseStock).values({
          warehouseId: mainWh.id,
          productId: prod.id,
          quantityOnHand: 60,
          reorderThreshold: 10,
        }).onConflictDoUpdate({ target: [warehouseStock.warehouseId, warehouseStock.productId], set: { quantityOnHand: 60 } });

        await db.insert(warehouseStock).values({
          warehouseId: northWh.id,
          productId: prod.id,
          quantityOnHand: 35,
          reorderThreshold: 8,
        }).onConflictDoUpdate({ target: [warehouseStock.warehouseId, warehouseStock.productId], set: { quantityOnHand: 35 } });

        await db.insert(warehouseStock).values({
          warehouseId: eastWh.id,
          productId: prod.id,
          quantityOnHand: 20,
          reorderThreshold: 5,
        }).onConflictDoUpdate({ target: [warehouseStock.warehouseId, warehouseStock.productId], set: { quantityOnHand: 20 } });
      }
    }
    console.log('[SEED] Seeded multi-warehouse inventory stock levels.');
  }

  // 12. Seed Rich End-to-End Quotation Simulations
  console.log('[SEED] Upserting rich pipeline simulations across all stages & roles...');
  const userRep = userMap['rep@dealflow.io'];
  const userRep2 = userMap['rep2@dealflow.io'];
  const userManager = userMap['manager@dealflow.io'];
  const userFinance = userMap['finance@dealflow.io'];

  const custApex = customerMap['procurement@apexlogistics.com'];
  const custStarlight = customerMap['it-purchasing@starlightfin.io'];
  const custBlueWave = customerMap['ops@bluewaveretail.com'];
  const custOmni = customerMap['enterprise-deals@omnicorp.com'];
  const custAegis = customerMap['procurement@aegishealth.com'];
  const custZenith = customerMap['sourcing@zenithenergy.com'];
  const custNova = customerMap['contracts@novaaero.com'];
  const custUrbanPulse = customerMap['tenders@urbanpulse.in'];
  const custKrypton = customerMap['supplychain@kryptonsemi.com'];

  const prodSoftware = productMap['DF-ENT-01'];
  const prodAnalytics = productMap['DF-ANL-02'];
  const prodGovernance = productMap['DF-GOV-AI'];
  const prodCloud = productMap['CLD-POD-32'];
  const prodDb = productMap['CLD-DB-HA'];
  const prodCdn = productMap['CLD-CDN-TB'];
  const prodHardware = productMap['HW-EDGE-G4'];
  const prodSecurityKey = productMap['HW-SEC-T10'];
  const prodSensorArray = productMap['HW-SENS-100'];
  const prodService = productMap['SRV-IMP-40'];
  const prodTam = productMap['SRV-TAM-YR'];
  const prodCarePlan = productMap['SLA-CARE-2Y'];
  const prodSupportSla = productMap['SLA-PREM-Q'];

  // -------------------------------------------------------------
  // SIMULATION 1: Draft Deals in Pipeline
  // -------------------------------------------------------------
  const quoteDraft1Num = 'Q-2026-DRAFT-01';
  let [qDraft1] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteDraft1Num));
  if (!qDraft1) {
    [qDraft1] = await db.insert(quotations).values({
      quoteNumber: quoteDraft1Num,
      customerId: custAegis.id,
      salesRepId: userRep.id,
      status: 'DRAFT',
      subtotal: '248000.00',
      discountTotal: '24800.00',
      taxTotal: '40176.00',
      grandTotal: '263376.00',
      estimatedMarginPct: '42.50',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: qDraft1.id, productId: prodCloud.id, quantity: 2, unitPrice: '48000.00', allowedDiscountPct: '30.00', discountPct: '10.00', discountAmount: '9600.00', taxAmount: '15552.00', lineTotal: '101952.00', estimatedCost: '64000.00' },
      { quotationId: qDraft1.id, productId: prodSoftware.id, quantity: 1, unitPrice: '120000.00', allowedDiscountPct: '30.00', discountPct: '10.00', discountAmount: '12000.00', taxAmount: '19440.00', lineTotal: '127440.00', estimatedCost: '18000.00' },
      { quotationId: qDraft1.id, productId: prodAnalytics.id, quantity: 1, unitPrice: '32000.00', allowedDiscountPct: '30.00', discountPct: '10.00', discountAmount: '3200.00', taxAmount: '5184.00', lineTotal: '33984.00', estimatedCost: '5000.00' },
    ]);
  }

  // -------------------------------------------------------------
  // SIMULATION 2: Pending Approval Level 1 (Sales Manager Sarah Chen Review)
  // -------------------------------------------------------------
  const quoteSmApprNum = 'Q-2026-APPR-SM-01';
  let [qSmAppr] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteSmApprNum));
  if (!qSmAppr) {
    [qSmAppr] = await db.insert(quotations).values({
      quoteNumber: quoteSmApprNum,
      customerId: custKrypton.id,
      salesRepId: userRep2.id,
      status: 'PENDING_APPROVAL',
      requiredApprovalLevel: 'MANAGER',
      blendedRiskScore: '18.50',
      subtotal: '150000.00',
      discountTotal: '27750.00',
      taxTotal: '22005.00',
      grandTotal: '144255.00',
      estimatedMarginPct: '36.80',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: qSmAppr.id, productId: prodSecurityKey.id, quantity: 10, unitPrice: '15000.00', allowedDiscountPct: '20.00', discountPct: '18.50', discountAmount: '27750.00', taxAmount: '22005.00', lineTotal: '144255.00', estimatedCost: '90000.00' },
    ]);

    await db.insert(approvalRequests).values({
      quotationId: qSmAppr.id,
      blendedRiskScore: '18.50',
      requiredLevel: 'MANAGER',
      status: 'PENDING',
    });
  }

  // -------------------------------------------------------------
  // SIMULATION 3: Pending Approval Level 2 (Staged: SM Approved -> Pending Finance David Miller)
  // -------------------------------------------------------------
  const quoteFinApprNum = 'Q-FIN-2ND-APPR-01';
  let [quoteFinAppr] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteFinApprNum));
  if (!quoteFinAppr) {
    [quoteFinAppr] = await db.insert(quotations).values({
      quoteNumber: quoteFinApprNum,
      customerId: custOmni.id,
      salesRepId: userRep.id,
      status: 'PENDING_APPROVAL',
      requiredApprovalLevel: 'MANAGER_FINANCE',
      blendedRiskScore: '31.50',
      subtotal: '1200000.00',
      discountTotal: '360000.00',
      taxTotal: '151200.00',
      grandTotal: '991200.00',
      estimatedMarginPct: '28.40',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: quoteFinAppr.id, productId: prodSoftware.id, quantity: 10, unitPrice: '120000.00', allowedDiscountPct: '35.00', discountPct: '30.00', discountAmount: '360000.00', taxAmount: '151200.00', lineTotal: '991200.00', estimatedCost: '180000.00' },
    ]);

    const [apprReq] = await db.insert(approvalRequests).values({
      quotationId: quoteFinAppr.id,
      blendedRiskScore: '31.50',
      requiredLevel: 'MANAGER_FINANCE',
      status: 'PENDING',
    }).returning();

    await db.insert(approvalActions).values({
      approvalRequestId: apprReq.id,
      actorId: userManager.id,
      level: 'MANAGER',
      action: 'APPROVED',
      reason: 'Strategic annual deal volume discount recommended for enterprise expansion.',
    });
  }

  // -------------------------------------------------------------
  // SIMULATION 4: Approved & Active Customer Negotiation via Portal
  // -------------------------------------------------------------
  const quoteNegNum = 'Q-2026-NEGOTIATION-01';
  let [qNeg] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteNegNum));
  if (!qNeg) {
    [qNeg] = await db.insert(quotations).values({
      quoteNumber: quoteNegNum,
      customerId: custStarlight.id,
      salesRepId: userRep.id,
      status: 'UNDER_NEGOTIATION',
      subtotal: '250000.00',
      discountTotal: '25000.00',
      taxTotal: '40500.00',
      grandTotal: '265500.00',
      estimatedMarginPct: '45.00',
    }).returning();

    const allCustUsers = await db.select().from(customerUsers);
    const custUserByEmail = {};
    for (const cu of allCustUsers) custUserByEmail[cu.email.toLowerCase()] = cu;
    const custUserStarlight = custUserByEmail['customer@starlightfin.io'] || allCustUsers[0];

    const [negReq] = await db.insert(negotiationRequests).values({
      quotationId: qNeg.id,
      customerUserId: custUserStarlight.id,
      requestType: 'COUNTER_DISCOUNT',
      message: 'We are prepared to sign the multi-year SLA today if we can achieve a 15% discount structure.',
      requestedDiscountPct: '15.00',
      status: 'OPEN',
    }).returning();

    await db.insert(negotiationComments).values([
      {
        negotiationRequestId: negReq.id,
        quotationId: qNeg.id,
        authorType: 'CUSTOMER',
        authorCustomerUserId: custUserStarlight.id,
        message: 'Requesting commercial alignment on annual TAM contract at 15% discount.',
      },
      {
        negotiationRequestId: negReq.id,
        quotationId: qNeg.id,
        authorType: 'INTERNAL',
        authorUserId: userRep.id,
        message: 'Reviewing discount terms with commercial leadership. Can confirm within 24 hours.',
      },
    ]);
  }

  // -------------------------------------------------------------
  // SIMULATION 5: Elena Rostova Operations - Order Awaiting Split (ORD-OPS-SPLIT-01)
  // -------------------------------------------------------------
  const quoteOpsSplitNum = 'Q-OPS-SPLIT-01';
  let [quoteOpsSplit] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteOpsSplitNum));
  if (!quoteOpsSplit) {
    [quoteOpsSplit] = await db.insert(quotations).values({
      quoteNumber: quoteOpsSplitNum,
      customerId: custApex.id,
      salesRepId: userRep.id,
      status: 'CONFIRMED',
      subtotal: '5550000.00',
      discountTotal: '0.00',
      taxTotal: '999000.00',
      grandTotal: '6549000.00',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: quoteOpsSplit.id, productId: prodHardware.id, quantity: 60, unitPrice: '85000.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '6018000.00', estimatedCost: '3300000.00' },
      { quotationId: quoteOpsSplit.id, productId: prodSecurityKey.id, quantity: 30, unitPrice: '15000.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '531000.00', estimatedCost: '270000.00' }
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

  // -------------------------------------------------------------
  // SIMULATION 6: Elena Rostova Operations - Order with Open Backorders (ORD-OPS-BACKORDER-02)
  // -------------------------------------------------------------
  const quoteOpsBackorderNum = 'Q-OPS-BACKORDER-02';
  let [quoteOpsBackorder] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteOpsBackorderNum));
  if (!quoteOpsBackorder) {
    [quoteOpsBackorder] = await db.insert(quotations).values({
      quoteNumber: quoteOpsBackorderNum,
      customerId: custStarlight.id,
      salesRepId: userRep.id,
      status: 'CONFIRMED',
      subtotal: '7650000.00',
      discountTotal: '0.00',
      taxTotal: '1377000.00',
      grandTotal: '9027000.00',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: quoteOpsBackorder.id, productId: prodHardware.id, quantity: 90, unitPrice: '85000.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '9027000.00', estimatedCost: '4950000.00' }
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

    await db.insert(fulfillmentAllocations).values([
      { orderId: orderOpsBackorder.id, orderItemId: oItem.id, warehouseId: mainWh.id, quantityAllocated: 40, shippingCost: '40.00' },
      { orderId: orderOpsBackorder.id, orderItemId: oItem.id, warehouseId: northWh.id, quantityAllocated: 25, shippingCost: '30.00' },
      { orderId: orderOpsBackorder.id, orderItemId: oItem.id, warehouseId: eastWh.id, quantityAllocated: 10, shippingCost: '15.00' },
    ]);

    await db.insert(backorders).values({
      orderItemId: oItem.id,
      quantityRequested: 90,
      quantityFulfilled: 75,
      quantityBackordered: 15,
      status: 'OPEN',
    });
  }

  // -------------------------------------------------------------
  // SIMULATION 7: Wireframe 10 Live Demo - Acme / Apex Hybrid Subscription & Care Plan (ORD-SUB-ACTIVE-04)
  // -------------------------------------------------------------
  const quoteSubDemoNum = 'Q-ACME-SUB-DEMO-04';
  let [qSubDemo] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteSubDemoNum));
  if (!qSubDemo) {
    [qSubDemo] = await db.insert(quotations).values({
      quoteNumber: quoteSubDemoNum,
      customerId: custApex.id,
      salesRepId: userRep.id,
      status: 'CONFIRMED',
      subtotal: '277600.00',
      discountTotal: '0.00',
      taxTotal: '49968.00',
      grandTotal: '327568.00',
      estimatedMarginPct: '48.00',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: qSubDemo.id, productId: prodHardware.id, quantity: 2, unitPrice: '85000.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '200600.00', estimatedCost: '110000.00' },
      { quotationId: qSubDemo.id, productId: prodService.id, quantity: 1, unitPrice: '45000.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '53100.00', estimatedCost: '18000.00' },
      { quotationId: qSubDemo.id, productId: prodCarePlan.id, quantity: 1, unitPrice: '4600.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '5428.00', estimatedCost: '1800.00' },
      { quotationId: qSubDemo.id, productId: prodSupportSla.id, quantity: 1, unitPrice: '30000.00', allowedDiscountPct: '20.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '35400.00', estimatedCost: '12000.00' },
    ]);
  }

  const orderSubDemoNum = 'ORD-ACME-SUB-DEMO-04';
  let [orderSubDemo] = await db.select().from(orders).where(eq(orders.orderNumber, orderSubDemoNum));
  if (!orderSubDemo) {
    [orderSubDemo] = await db.insert(orders).values({
      orderNumber: orderSubDemoNum,
      quotationId: qSubDemo.id,
      customerId: custApex.id,
      status: 'FULFILLED',
      subtotal: qSubDemo.subtotal,
      discountTotal: qSubDemo.discountTotal,
      taxTotal: qSubDemo.taxTotal,
      grandTotal: qSubDemo.grandTotal,
    }).returning();

    const qItems = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, qSubDemo.id));
    for (const qi of qItems) {
      const isRec = qi.productId === prodCarePlan.id || qi.productId === prodSupportSla.id;
      const [oi] = await db.insert(orderItems).values({
        orderId: orderSubDemo.id,
        quotationItemId: qi.id,
        productId: qi.productId,
        quantity: qi.quantity,
        unitPrice: qi.unitPrice,
        discountPct: qi.discountPct,
        discountAmount: qi.discountAmount,
        lineTotal: qi.lineTotal,
        billingLineType: isRec ? 'RECURRING' : 'ONE_TIME',
      }).returning();

      if (qi.productId === prodCarePlan.id) {
        const [subL1] = await db.insert(subscriptionLines).values({
          orderItemId: oi.id,
          subscriptionPlanId: planMap['Care Plan 2yr'].id,
          quantity: 1,
          recurringAmount: '4600.00',
          startDate: '2026-08-15',
          nextBillingDate: '2026-09-15',
          status: 'ACTIVE',
        }).returning();

        await db.insert(billingSchedules).values({
          subscriptionLineId: subL1.id,
          billingPeriodStart: '2026-08-15',
          billingPeriodEnd: '2026-09-15',
          amount: '4600.00',
          isProrated: false,
          status: 'SCHEDULED',
        });
      } else if (qi.productId === prodSupportSla.id) {
        const [subL2] = await db.insert(subscriptionLines).values({
          orderItemId: oi.id,
          subscriptionPlanId: planMap['Support SLA'].id,
          quantity: 1,
          recurringAmount: '30000.00',
          startDate: '2026-08-01',
          nextBillingDate: '2026-11-01',
          status: 'ACTIVE',
        }).returning();

        await db.insert(billingSchedules).values({
          subscriptionLineId: subL2.id,
          billingPeriodStart: '2026-08-01',
          billingPeriodEnd: '2026-11-01',
          amount: '30000.00',
          isProrated: false,
          status: 'SCHEDULED',
        });
      }
    }
  }

  // -------------------------------------------------------------
  // SIMULATION 8: David Miller Finance - Overdue Receivables Invoice
  // -------------------------------------------------------------
  const quoteFinOverdueNum = 'Q-FIN-OVERDUE-03';
  let [quoteFinOverdue] = await db.select().from(quotations).where(eq(quotations.quoteNumber, quoteFinOverdueNum));
  if (!quoteFinOverdue) {
    [quoteFinOverdue] = await db.insert(quotations).values({
      quoteNumber: quoteFinOverdueNum,
      customerId: custBlueWave.id,
      salesRepId: userRep.id,
      status: 'CONFIRMED',
      subtotal: '200000.00',
      discountTotal: '0.00',
      taxTotal: '36000.00',
      grandTotal: '236000.00',
    }).returning();

    await db.insert(quotationItems).values([
      { quotationId: quoteFinOverdue.id, productId: prodService.id, quantity: 2, unitPrice: '100000.00', allowedDiscountPct: '25.00', discountPct: '0.00', discountAmount: '0.00', lineTotal: '236000.00', estimatedCost: '80000.00' }
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

    const invNumber = 'INV-2026-OVERDUE-01';
    let [inv] = await db.select().from(invoices).where(eq(invoices.invoiceNumber, invNumber));
    if (!inv) {
      [inv] = await db.insert(invoices).values({
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
  }

  // -------------------------------------------------------------
  // SIMULATION 9: Unapplied Credit Note for Reconciliation
  // -------------------------------------------------------------
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

  console.log('[SEED] ✅ Complete Master Data & Rich Multi-Role Pipeline Simulations Seeded Successfully!');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('[SEED] ❌ Failed to seed database:', err);
  process.exit(1);
});
