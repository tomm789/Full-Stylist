# Wardrobe Refactoring Guide

## How to Use the New Architecture

### Before: Monolithic Component (1400+ lines)

```typescript
// app/(tabs)/wardrobe.tsx - BEFORE

export default function WardrobeScreen() {
  // 50+ lines of state declarations
  const [wardrobeId, setWardrobeId] = useState<string | null>(null);
  const [categories, setCategories] = useState<WardrobeCategory[]>([]);
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [allItems, setAllItems] = useState<WardrobeItem[]>([]);
  const [itemImagesCache, setItemImagesCache] = useState<Map<string, string | null>>(new Map());
  // ... 40 more state variables
  
  // 200+ lines of data fetching logic
  const loadWardrobe = async () => { /* ... */ };
  const loadItems = async () => { /* ... */ };
  const loadSubcategories = async () => { /* ... */ };
  
  // 100+ lines of filter logic
  const filteredItems = useMemo(() => {
    // Complex filtering logic
  }, [allItems, filters]);
  
  // 200+ lines of handlers
  const toggleFavorite = async () => { /* ... */ };
  const handleGenerateOutfit = async () => { /* ... */ };
  
  // 300+ lines of component rendering
  const ItemCard = React.memo(({ item }) => { /* ... */ });
  
  // 500+ lines of JSX
  return (
    <View>
      {/* Massive JSX tree */}
    </View>
  );
}
```

### After: Modular Component (<200 lines)

```typescript
// app/(tabs)/wardrobe.tsx - AFTER

import { useWardrobeItems, useFilters, useCategories } from '@/hooks/wardrobe';
import { ItemCard, FilterDrawer, CategoryPills, OutfitCreatorBar } from '@/components/wardrobe';
import { EmptyState, LoadingOverlay } from '@/components/shared';

export default function WardrobeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { addItemId } = useLocalSearchParams<{ addItemId?: string }>();
  
  // State managed by hooks - single line each!
  const { wardrobeId, categories, loading: wardrobeLoading } = useWardrobe(user?.id);
  const { allItems, imageCache, loading, refresh } = useWardrobeItems({
    wardrobeId,
    userId: user?.id,
    categoryId: selectedCategoryId,
    searchQuery,
  });
  const {
    filteredItems,
    filters,
    updateFilter,
    clearFilters,
    hasActiveFilters,
    availableColors,
  } = useFilters(allItems, user?.id);
  
  // Local UI state only
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [outfitCreatorMode, setOutfitCreatorMode] = useState(false);
  const [selectedOutfitItems, setSelectedOutfitItems] = useState<string[]>([]);
  
  // Simple handlers - business logic in hooks
  const handleItemPress = (item: WardrobeItem) => {
    router.push(`/wardrobe/item/${item.id}`);
  };
  
  const handleGenerateOutfit = async () => {
    // Simplified - just coordinate navigation
    router.push(`/outfits/create?items=${selectedOutfitItems.join(',')}`);
  };
  
  // Clean, readable JSX
  return (
    <View style={styles.container}>
      <LoadingOverlay visible={loading && !filteredItems.length} />
      
      {outfitCreatorMode && (
        <OutfitCreatorBar
          selectedItems={selectedOutfitItems}
          onRemoveItem={(id) => setSelectedOutfitItems(prev => prev.filter(i => i !== id))}
          onGenerate={handleGenerateOutfit}
          onExit={() => setOutfitCreatorMode(false)}
        />
      )}
      
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onFilter={() => setShowFilterDrawer(true)}
        onAdd={() => router.push('/wardrobe/add')}
        hasActiveFilters={hasActiveFilters}
      />
      
      <CategoryPills
        categories={categories}
        selectedId={selectedCategoryId}
        onSelect={setSelectedCategoryId}
      />
      
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No items found"
          actionLabel="Add your first item"
          onAction={() => router.push('/wardrobe/add')}
        />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              imageUrl={imageCache.get(item.id) || null}
              onPress={() => handleItemPress(item)}
              onLongPress={() => handleAddToOutfit(item)}
              onFavoritePress={() => toggleFavorite(item.id)}
            />
          )}
          numColumns={2}
          refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
        />
      )}
      
      <FilterDrawer
        visible={showFilterDrawer}
        onClose={() => setShowFilterDrawer(false)}
        filters={filters}
        onUpdateFilter={updateFilter}
        onClearAll={clearFilters}
        availableColors={availableColors}
      />
    </View>
  );
}

// Minimal styles - most in theme
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
```

## Key Benefits

### 1. **Separation of Concerns**
- **Before**: 1400 lines doing everything
- **After**: 
  - Hooks handle data/business logic
  - Components handle UI
  - Main file orchestrates

### 2. **Reusability**
- **Before**: Can't reuse ItemCard, FilterDrawer, etc.
- **After**: Use ItemCard in outfits, social, everywhere!

### 3. **Testability**
- **Before**: Can't test filtering logic separately
- **After**: Test `useFilters` hook in isolation

### 4. **Maintainability**
- **Before**: 1400 lines to search through
- **After**: 150 lines per file, easy to find and fix

### 5. **Performance**
- **Before**: Whole component re-renders on any state change
- **After**: Hooks optimize, memoized components prevent re-renders

## Migration Steps

### Step 1: Extract Hooks
Replace inline logic with hooks:

```typescript
// BEFORE
const [items, setItems] = useState([]);
const loadItems = async () => {
  const { data } = await getWardrobeItems(wardrobeId);
  setItems(data);
};
useEffect(() => { loadItems(); }, [wardrobeId]);

// AFTER
const { items, loading } = useWardrobeItems({ wardrobeId, userId });
```

### Step 2: Extract Components
Replace inline JSX with components:

```typescript
// BEFORE
{items.map(item => (
  <TouchableOpacity key={item.id} style={styles.card}>
    <Image source={{ uri: imageUrls[item.id] }} style={styles.image} />
    <Text style={styles.title}>{item.title}</Text>
  </TouchableOpacity>
))}

// AFTER
{items.map(item => (
  <ItemCard
    key={item.id}
    item={item}
    imageUrl={imageCache.get(item.id)}
    onPress={() => handleItemPress(item)}
  />
))}
```

### Step 3: Use Shared Styles
Replace inline styles with theme:

```typescript
// BEFORE
const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
  },
});

// AFTER
import { theme, commonStyles } from '@/app/styles';
const styles = StyleSheet.create({
  customStyle: {
    // Only unique styles here
    marginTop: theme.spacing.lg,
  },
});
// Use commonStyles.button for standard button styling
```

## File Size Reduction

| File | Before | After | Reduction |
|------|--------|-------|-----------|
| wardrobe.tsx | 1400 lines | ~200 lines | **86%** |
| add.tsx | 600 lines | ~150 lines | **75%** |
| item/[id].tsx | 800 lines | ~250 lines | **69%** |
| edit.tsx | 900 lines | ~200 lines | **78%** |

**Total**: 3700 lines → ~800 lines = **78% reduction**

Plus: ~2000 lines of new reusable code that benefits the entire app!

## Next Steps

1. Create all remaining shared components
2. Create all hooks
3. Create wardrobe-specific components
4. Refactor main files one at a time
5. Test thoroughly
6. Document patterns for future refactors
