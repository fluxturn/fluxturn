# Usage Examples for Barrel Exports

## Component Requirements Index

The `/components/index.ts` barrel export provides centralized access to all component requirements across all files.

### Import Examples

```typescript
// Import everything
import * as Components from './components';

// Import specific functions
import {
  ALL_COMPONENT_REQUIREMENTS,
  getComponentRequirements,
  getRequiredTables,
  filterComponentsByTier
} from './components';

// Import types
import {
  ComponentRequirement,
  DatabaseTable,
  ControllerEndpoint
} from './components';
```

### Usage Examples

#### 1. Get Component Requirements

```typescript
import { getComponentRequirements } from './components';

const productGrid = getComponentRequirements('product-grid');
console.log(productGrid?.database); // Array of database tables needed
console.log(productGrid?.controllers); // Array of API endpoints
console.log(productGrid?.services); // Array of service functions
console.log(productGrid?.events); // Array of events emitted
```

#### 2. Get Database Tables for Multiple Components

```typescript
import { getRequiredTables } from './components';

const components = ['product-grid', 'shopping-cart', 'checkout-form'];
const tables = getRequiredTables(components);

console.log(tables.map(t => t.name));
// Output: ['products', 'cart_items', 'orders', 'users', ...]
```

#### 3. Filter Components by Tier

```typescript
import { filterComponentsByTier } from './components';

const allComponents = [
  'product-grid',
  'advanced-analytics',
  'ai-recommendations',
  'basic-cart'
];

const freeComponents = filterComponentsByTier(allComponents, 'FREE');
console.log(freeComponents); // ['product-grid', 'basic-cart']

const proComponents = filterComponentsByTier(allComponents, 'PRO');
console.log(proComponents); // All except maybe ENTERPRISE-only ones
```

#### 4. Get Components by Category

```typescript
import { getComponentsByCategory } from './components';

const formComponents = getComponentsByCategory('form');
console.log(formComponents);
// ['login-form', 'signup-form', 'checkout-form', 'contact-form', ...]

const dataDisplayComponents = getComponentsByCategory('data-display');
console.log(dataDisplayComponents);
// ['product-grid', 'data-table', 'stat-card', ...]
```

#### 5. Get All Database Tables

```typescript
import { getAllTableNames } from './components';

const tables = getAllTableNames();
console.log(tables);
// ['cart_items', 'categories', 'orders', 'products', 'users', ...]
```

#### 6. Get Component Statistics

```typescript
import { getComponentStats } from './components';

const stats = getComponentStats();
console.log(stats);
/*
{
  total: 300,
  byCategory: {
    'data-display': 120,
    'form': 80,
    'navigation': 30,
    'layout': 40,
    'action': 30
  },
  byTier: {
    FREE: 100,
    STARTER: 200,
    PRO: 250,
    ENTERPRISE: 300
  },
  withDatabase: 180,
  withEvents: 220
}
*/
```

---

## App Types Index

The `/app-types/index.ts` barrel export provides centralized access to all app type structures across all industry files.

### Import Examples

```typescript
// Import everything
import * as AppTypes from './app-types';

// Import specific functions
import {
  ALL_APP_STRUCTURES,
  getAppTypeStructure,
  getPageComponentsForTier,
  searchAppTypesByIndustry
} from './app-types';

// Import types
import {
  AppTypeStructure,
  PageStructure,
  ComponentMapping
} from './app-types';
```

### Usage Examples

#### 1. Get App Type Structure

```typescript
import { getAppTypeStructure } from './app-types';

// Works with app type name or any synonym
const ecommerce = getAppTypeStructure('e-commerce');
const onlineStore = getAppTypeStructure('online-store'); // Same result
const shop = getAppTypeStructure('shop'); // Same result

console.log(ecommerce?.type); // 'ecommerce'
console.log(ecommerce?.sections); // ['frontend', 'admin']
console.log(ecommerce?.industry); // ['retail', 'ecommerce', 'shopping', 'sales']
```

#### 2. Get Page Components for Tier

```typescript
import { getPageComponentsForTier } from './app-types';

// FREE tier
const freeComponents = getPageComponentsForTier(
  'ecommerce',
  'frontend',
  'home',
  'FREE'
);
console.log(freeComponents);
// ['hero-section', 'product-grid', 'navbar', 'footer']

// PRO tier (includes FREE + STARTER + PRO)
const proComponents = getPageComponentsForTier(
  'ecommerce',
  'frontend',
  'home',
  'PRO'
);
console.log(proComponents);
// ['hero-section', 'product-grid', 'navbar', 'footer',
//  'promotional-banner-top', 'categories-widget',
//  'product-carousel', 'testimonial-slider', 'newsletter-signup']
```

#### 3. Check Page Availability by Tier

```typescript
import { isPageAvailableForTier } from './app-types';

const available = isPageAvailableForTier(
  'ecommerce',
  'admin',
  'analytics',
  'FREE'
);
console.log(available); // false (analytics usually PRO+)

const dashboardAvailable = isPageAvailableForTier(
  'ecommerce',
  'admin',
  'dashboard',
  'STARTER'
);
console.log(dashboardAvailable); // true
```

#### 4. Search by Industry

```typescript
import { searchAppTypesByIndustry } from './app-types';

const retailApps = searchAppTypesByIndustry('retail');
console.log(retailApps.map(app => app.type));
// ['ecommerce', 'pos', 'inventory', 'clothing-store',
//  'grocery-store', 'bookstore', ...]

const healthcareApps = searchAppTypesByIndustry('healthcare');
console.log(healthcareApps.map(app => app.type));
// ['telemedicine', 'patient-portal', 'pharmacy',
//  'hospital-management', 'medical-appointment', ...]
```

#### 5. Search by Synonym

```typescript
import { searchAppTypesBySynonym } from './app-types';

const storeApps = searchAppTypesBySynonym('store');
console.log(storeApps.map(app => app.type));
// ['ecommerce', 'clothing-store', 'grocery-store', 'bookstore', ...]

const platformApps = searchAppTypesBySynonym('platform');
console.log(platformApps.map(app => app.type));
// ['marketplace', 'auction-platform', 'donation-platform', ...]
```

#### 6. Get All Components for an App Type

```typescript
import { getAppTypeComponents } from './app-types';

const ecommerceComponents = getAppTypeComponents('ecommerce', 'PRO');
console.log(ecommerceComponents.length); // Total unique components
console.log(ecommerceComponents.slice(0, 10));
// ['hero-section', 'product-grid', 'shopping-cart', 'checkout-form', ...]
```

#### 7. Get All Pages for a Section

```typescript
import { getAllPages } from './app-types';

const frontendPages = getAllPages('ecommerce', 'frontend');
console.log(frontendPages.map(p => p.name));
// ['home', 'products', 'product-details', 'cart', 'checkout',
//  'account', 'orders', 'wishlist', ...]

const adminPages = getAllPages('ecommerce', 'admin');
console.log(adminPages.map(p => p.name));
// ['dashboard', 'products', 'orders', 'customers', 'analytics', ...]
```

#### 8. Get Required vs Optional Components

```typescript
import { getPageComponentsByRequirement } from './app-types';

const components = getPageComponentsByRequirement(
  'ecommerce',
  'frontend',
  'home',
  'PRO'
);

console.log('Required:', components.required);
// ['hero-section', 'product-grid', 'navbar', 'footer']

console.log('Optional:', components.optional);
// ['promotional-banner-top', 'categories-widget', 'product-carousel', ...]
```

#### 9. Get All Industries

```typescript
import { getAllIndustries } from './app-types';

const industries = getAllIndustries();
console.log(industries);
// ['agriculture', 'automotive', 'education', 'finance',
//  'healthcare', 'manufacturing', 'retail', ...]
```

#### 10. Get App Type Statistics

```typescript
import { getAppTypeStats } from './app-types';

const stats = getAppTypeStats();
console.log(stats);
/*
{
  totalAppTypes: 200,
  totalIndustries: 25,
  totalComponents: 300,
  appTypesByIndustry: {
    retail: 15,
    healthcare: 20,
    finance: 18,
    education: 16,
    ...
  },
  averagePagesPerApp: 12.5,
  averageComponentsPerPage: 8.3
}
*/
```

#### 11. Find App Types by Component

```typescript
import { findAppTypesByComponent } from './app-types';

const appsWithProductGrid = findAppTypesByComponent('product-grid');
console.log(appsWithProductGrid);
// ['ecommerce', 'marketplace', 'clothing-store', 'grocery-store',
//  'bookstore', 'electronics-store', ...]

const appsWithCalendar = findAppTypesByComponent('calendar');
console.log(appsWithCalendar);
// ['booking', 'appointment-scheduling', 'telemedicine',
//  'event-management', 'salon-booking', ...]
```

---

## Combined Usage Example: Generate App Structure

Here's a practical example combining both barrel exports to generate a complete app structure:

```typescript
import {
  getAppTypeStructure,
  getPageComponentsForTier,
  getAllPages
} from './app-types';

import {
  getRequiredTables,
  getRequiredControllers,
  getRequiredServices,
  getComponentEvents
} from './components';

function generateAppStructure(
  appType: string,
  tier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE'
) {
  // 1. Get app structure
  const structure = getAppTypeStructure(appType);
  if (!structure) {
    throw new Error(`App type "${appType}" not found`);
  }

  // 2. Get all pages for frontend section
  const frontendPages = getAllPages(appType, 'frontend');

  // 3. For each page, get components
  const allComponents: string[] = [];
  const pageStructures = frontendPages.map(page => {
    const components = getPageComponentsForTier(
      appType,
      'frontend',
      page.name,
      tier
    );
    allComponents.push(...components);

    return {
      name: page.name,
      auth_required: page.auth_required,
      components
    };
  });

  // 4. Get database requirements
  const tables = getRequiredTables(allComponents);

  // 5. Get API endpoints
  const controllers = getRequiredControllers(allComponents);

  // 6. Get service functions
  const services = getRequiredServices(allComponents);

  // 7. Get events
  const events = getComponentEvents(allComponents);

  return {
    appType: structure.type,
    industry: structure.industry,
    tier,
    pages: pageStructures,
    database: {
      tables: tables.map(t => ({
        name: t.name,
        fields: t.fields.length,
        indexes: t.indexes?.length || 0
      }))
    },
    api: {
      endpoints: controllers.length,
      services: services.length
    },
    events: events.length,
    components: {
      total: [...new Set(allComponents)].length,
      list: [...new Set(allComponents)].sort()
    }
  };
}

// Usage
const freeEcommerce = generateAppStructure('ecommerce', 'FREE');
console.log(JSON.stringify(freeEcommerce, null, 2));

const proEcommerce = generateAppStructure('ecommerce', 'PRO');
console.log(JSON.stringify(proEcommerce, null, 2));
```

---

## Integration with App Generation

These barrel exports are designed to work seamlessly with the app generation system:

```typescript
import { getAppTypeStructure, getAppTypeComponents } from './app-types';
import { getRequiredTables, getRequiredControllers } from './components';

async function generateApp(appName: string, appType: string, tier: string) {
  // 1. Validate app type exists
  const structure = getAppTypeStructure(appType);
  if (!structure) {
    throw new Error(`Unknown app type: ${appType}`);
  }

  // 2. Get all components needed
  const components = getAppTypeComponents(appType, tier as any);

  // 3. Generate database schema
  const tables = getRequiredTables(components);
  await createDatabaseSchema(appName, tables);

  // 4. Generate API endpoints
  const controllers = getRequiredControllers(components);
  await generateControllers(appName, controllers);

  // 5. Generate frontend pages
  await generatePages(appName, structure, tier);

  return {
    appName,
    appType: structure.type,
    tier,
    componentsCount: components.length,
    tablesCount: tables.length,
    endpointsCount: controllers.length
  };
}
```

---

## Benefits

1. **Single Import Point**: Import from one location instead of multiple files
2. **Type Safety**: Full TypeScript support with proper type exports
3. **Discoverability**: All helper functions in one place
4. **Maintainability**: Add new files without changing import statements
5. **Performance**: Tree-shaking still works with barrel exports
6. **Documentation**: JSDoc comments provide inline documentation
7. **Consistency**: Standardized API across the codebase
