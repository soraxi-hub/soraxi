# Product Upload Wizard - Architecture

## Overview
This document outlines the multi-step wizard architecture for the product upload form refactoring. The goal is to transform a monolithic form component into a scalable, maintainable multi-step wizard while preserving all existing backend integrations.

## Recommended Folder Structure

```
lib/domain/products/wizard/
├── WIZARD_ARCHITECTURE.md          # This file
├── hooks/
│   ├── useProductImages.ts         # Image handling logic
│   ├── useStepValidation.ts        # Step-level validation
│   └── useWizardNavigation.ts      # Navigation state management
├── types/
│   └── wizard.types.ts             # Wizard-specific types
├── ProductUploadWizard.tsx         # Main wizard container
└── steps/
    ├── BasicInfoStep.tsx           # Step 1: Product name, description, specs
    ├── PricingInventoryStep.tsx    # Step 2: Price and quantity
    ├── CategoryAudienceStep.tsx    # Step 3: Category, subcategory, audience
    ├── ProductImagesStep.tsx       # Step 4: Image upload with drag/drop
    └── ReviewPublishStep.tsx       # Step 5: Review and publish/draft
```

## State Architecture

### Wizard-Level State
```typescript
interface WizardState {
  // Form data
  formData: ProductFormData;
  
  // Validation
  errors: Partial<Record<keyof ProductFormData, string>>;
  
  // Images
  imageFiles: File[];
  imagePreviews: string[];
  
  // Navigation
  currentStep: number;
  
  // Upload
  uploadProgress: number;
  
  // Draft management
  draftProductId: string | null;
  
  // Loading states
  isLoading: boolean;
  isLoadingDraft: boolean;
  
  // UI
  dragActive: boolean;
}
```

### Step-Level Validation
Each step validates only its own fields before allowing navigation to the next step:

- **Step 1**: Product name, description, specifications
- **Step 2**: Price, quantity
- **Step 3**: Category, subcategory, target audience
- **Step 4**: Product images (min/max count)
- **Step 5**: Store password validation before publish

## Hook Architecture

### useProductImages()
Handles all image-related logic:
- File validation (type, size, count)
- Image preview generation
- Image removal with URL cleanup
- Drag-and-drop state management

### useStepValidation()
Handles validation for each step:
- Step-specific field validation
- Error state management
- Clear errors on field change
- Full validation before publish

### useWizardNavigation()
Handles wizard navigation:
- Current step state
- Next/previous/go-to-step functions
- Step transition callbacks
- Can validate before navigation

## Data Flow

```
ProductUploadWizard (Container)
    ↓
    ├─→ useProductImages() hook
    ├─→ useStepValidation() hook
    ├─→ useWizardNavigation() hook
    ├─→ useUnsavedChanges() hook (existing)
    ↓
    ├─→ Step Components
    │   ├─→ BasicInfoStep
    │   ├─→ PricingInventoryStep
    │   ├─→ CategoryAudienceStep
    │   ├─→ ProductImagesStep
    │   └─→ ReviewPublishStep
    ↓
    ├─→ Submit to API
    │   ├─→ ProductFactory (domain layer)
    │   ├─→ ProductService (backend)
    │   ├─→ Cloudinary upload (images)
    │   └─→ Database transaction
```

## Step Progression

```
Step 1: Product Information
├── Product Name (required)
├── Description (optional)
└── Specifications (optional)
    ↓
Step 2: Pricing & Inventory
├── Price (required)
└── Quantity (required)
    ↓
Step 3: Category & Audience
├── Category (required)
├── Subcategory (required)
└── Target Audience (required)
    ↓
Step 4: Product Images
├── Image Upload (required: min 1, max 5)
├── Drag & Drop
└── Preview & Remove
    ↓
Step 5: Review & Security
├── Store Password (required)
├── Review Summary
├── Save as Draft (optional)
└── Publish (required)
```

## Component Communication

### Props Pattern
- Props flow down from wizard container
- Callbacks flow up from step components
- Wizard manages all state updates

### State Updates
- Form data changes in BasicInfoStep → wizard updates state
- Image selection in ProductImagesStep → wizard updates state
- Step navigation → wizard updates currentStep

## API Integration

### Preserve Existing Flows
1. **Form submission** - Uses existing ProductService
2. **Image upload** - Uses existing Cloudinary integration
3. **Validation** - Uses existing ProductFactory
4. **Database** - Uses existing repository pattern
5. **Draft save** - Uses existing save-as-draft flow

### No Backend Changes Required
- All API endpoints remain unchanged
- All validation logic remains unchanged
- All database operations remain unchanged
- Only frontend structure changes

## Performance Optimizations

1. **Image Preview Cleanup** - Revoke object URLs on unmount
2. **Memoization** - Memoize step components to prevent re-renders
3. **Lazy Validation** - Only validate current step before navigation
4. **Progress Tracking** - Reuse existing uploadProgress state
5. **State Persistence** - Draft ID persists across step changes

## Key Design Decisions

1. **Centralized State** - All state in wizard container, not distributed
2. **Step-Based Validation** - Validate per step, not the entire form
3. **Preserve Existing Logic** - No changes to business logic, only UI organization
4. **TypeScript Safety** - Full type safety for wizard state and step props
5. **Responsive Design** - Mobile-friendly navigation between steps
6. **Accessibility** - ARIA labels and keyboard navigation support

## Migration Path

1. Copy existing ProductUploadForm to new wizard
2. Extract form sections into step components
3. Create hooks for cross-cutting concerns
4. Update page.tsx to use new ProductUploadWizard
5. Preserve all API calls and validation logic
6. Test with existing backend services

## Testing Strategy

1. **Unit Tests** - Test each hook independently
2. **Component Tests** - Test each step component
3. **Integration Tests** - Test full wizard flow
4. **API Tests** - Verify backend integration unchanged
5. **E2E Tests** - Test complete product upload flow
