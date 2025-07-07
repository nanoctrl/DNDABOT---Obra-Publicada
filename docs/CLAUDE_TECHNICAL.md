# CLAUDE Technical Documentation

## Architecture Deep Dive

### High-Level Flow
```
JSON Input → Orchestrator → Services → Page Objects → Playwright → Government Sites
```

### Technology Stack Details
- **Runtime**: Node.js v18+ (required for Playwright)
- **Language**: TypeScript 5.x (strict mode enabled)
- **Browser Automation**: Playwright 1.40+
- **Data Validation**: Zod 3.x (runtime type checking)
- **Logging**: Winston 3.x (file + console transports)
- **Testing**: Jest 29.x with ts-jest
- **Pattern**: Page Object Model (POM) for maintainability

### Directory Structure
```
📁 src/
├── common/              # Shared utilities
│   ├── browserManager.ts       # Playwright browser lifecycle
│   ├── interactionHelper.ts    # Multi-strategy selector engine
│   ├── logger.ts              # Winston configuration
│   ├── screenshotManager.ts   # Screenshot capture & organization
│   ├── debugSnapshot.ts       # Debug mode snapshots
│   └── taskRunner.ts          # Retry logic with exponential backoff
├── config/              # Configuration management
│   ├── index.ts               # Environment variables & settings
│   └── steps.config.ts        # Step definitions (source of truth)
├── core/                # Core business logic
│   ├── orchestrator.ts        # Main flow controller
│   ├── dataReader.ts          # JSON input validation
│   └── manifestUpdater.ts     # Execution manifest tracking
├── pages/               # Page Object implementations
│   ├── BasePage.ts            # Base class with common methods
│   ├── AfipLoginPage.ts       # AFIP authentication
│   ├── DatosTramitePage.ts    # Basic procedure data
│   ├── CondicionesPage.ts     # Terms and conditions
│   └── ObraForm.page.ts       # Musical work details
├── services/            # Business services
│   ├── afipAuth.service.ts         # AFIP login orchestration
│   ├── tadRegistration.service.ts  # Main TAD workflow
│   └── obraFormService.ts          # Work data entry logic
└── types/               # TypeScript definitions
    ├── schema.ts              # Zod schemas for validation
    └── tad.types.ts           # TAD-specific types
```

## Critical Design Patterns

### 1. Multi-Strategy Selector Pattern
**Problem**: Government sites have unstable HTML that changes frequently.  
**Solution**: Every interaction tries multiple selector strategies in order.

```typescript
interface InteractionStrategy {
  name: string;
  action?: () => Promise<void>;
  locator?: (page: Page) => Locator;
}

// Example implementation
const strategies: InteractionStrategy[] = [
  // SUCCESS_STRATEGY: Proven to work, always try first
  { 
    name: 'By stable name attribute', 
    locator: (page) => page.locator('[name="field_name"]') 
  },
  // Semantic fallback
  { 
    name: 'By ARIA role', 
    locator: (page) => page.getByRole('textbox', { name: 'Field' }) 
  },
  // Visual fallback
  { 
    name: 'By visible text', 
    locator: (page) => page.getByText('Field Label') 
  }
];
```

### 2. ZK Framework Handling
TAD uses ZK Framework which generates dynamic IDs. Our solutions:

```typescript
// ❌ BAD: Dynamic IDs change every session
await page.locator('#s5IQj-btn').click();

// ✅ GOOD: Stable patterns
await page.locator('[name="cmb_usted_opta"]').click();
await page.locator('tr:has-text("¿Usted opta") button').click();
await page.getByRole('row', { name: 'Context' }).locator('input').click();
```

### 3. Form Isolation Pattern
**Problem**: Multiple author/editor forms on same page cause data collision.  
**Solution**: Target forms individually using anchors.

```typescript
// Step 31: Multi-author handling
const autorForms = await page.locator('tr:has-text("seudónimo")').all();
const targetForm = autorForms[authorIndex];

// Use form-specific selectors
const nameField = authorIndex === 0 
  ? '[name="nombre_1_datos_participante"]'
  : `[name="nombre_1_datos_participante_R${authorIndex}"]`;
```

### 4. Performance Optimization System
Log-based strategy reordering for massive performance gains:

```typescript
// Before optimization: Random strategy order
// After: SUCCESS_STRATEGY marked patterns first
// Result: 6400% improvement (64s → 1s)
```

## Performance Benchmarks

| Operation | Target | Actual | Optimization |
|-----------|---------|---------|--------------|
| Full login | <20s | 15s | Strategy order |
| Search | <2s | 0.7s | Direct input selector |
| Dropdown | <2s | 1s | Name + role combo |
| Save button | <1s | 0.3s | Enhanced targeting |
| Full flow | <3min | 2.5min | All optimizations |

## Debugging Infrastructure

### Screenshot System
```typescript
// Automatic captures at:
- Before critical actions
- After successful operations  
- On any error
- Workflow milestones
```

### Debug Mode Features
When `DEVELOPER_DEBUG_MODE=true`:
- Browser stays open on completion
- Pauses on errors for inspection
- Generates detailed DOM snapshots
- Verbose logging enabled

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Element not found | Dynamic ID changed | Use stable attributes |
| Timeout | Slow page load | Increase timeout or add wait |
| Click no effect | Wrong element type | Try button/div/input variants |
| Form won't close | Validation error | Check required fields |

## Development Guidelines

### Adding New Steps
1. Define in `steps.config.ts`
2. Implement in appropriate service
3. Use multi-strategy pattern
4. Add state verification
5. Document in changelog

### Code Standards
- TypeScript strict mode
- Async/await (no callbacks)
- Comprehensive error handling
- Descriptive logging
- Screenshot documentation

### Testing Requirements
- Unit tests for utilities
- Integration tests for services
- E2E tests for critical paths
- Manual verification of new steps