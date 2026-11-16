import { createRecipeBook, loadRecipePhoto } from '@pages/recipes/state/recipe/recipe-book';
import { RecipeRecord } from '@pages/recipes/state/recipe/recipe.model';

const recipe: RecipeRecord = {
  id: 'rice',
  title: 'Rice bowl',
  description: 'A family favourite.',
  category: 'Dinner',
  categories: ['Dinner', 'Lunch'],
  cookTime: 20,
  servings: 2,
  difficulty: 'Easy',
  photoUrl: '',
  photoPath: '',
  nutritionIngredients: [
    {
      foodId: 'rice',
      name: 'Rice',
      quantity: 200,
      grams: 200,
      unit: 'g',
      linked: true,
      per100: { calories: 100, protein: 2, carbs: 20, fat: 1 },
    },
  ],
  ingredients: ['Salt to taste'],
  steps: [{ id: 'one', title: 'Cook rice', instruction: 'Simmer until tender.' }],
  tags: [],
  source: 'Family cookbook',
  sourceLink: 'https://example.com/rice',
  notes: 'Serve warm.',
  favourite: true,
  private: true,
  createdAt: '',
};

describe('Recipe book PDF', () => {
  it('always sorts recipe pages and contents alphabetically without changing the input order', () => {
    const titles = ['Zucchini soup', 'banana bread', 'Apple pie'];
    const recipes = titles.map((title, index) => ({ ...recipe, id: String(index), title }));
    const doc = createRecipeBook(recipes, { title: 'Alphabetical book' });
    const pages = doc.internal.pages as unknown as string[][];
    const contents = pages[2].join('\n');
    expect(contents.indexOf('Apple pie')).toBeLessThan(contents.indexOf('banana bread'));
    expect(contents.indexOf('banana bread')).toBeLessThan(contents.indexOf('Zucchini soup'));
    expect(pages[3].join('\n')).toContain('Apple pie');
    expect(pages[4].join('\n')).toContain('banana bread');
    expect(pages[5].join('\n')).toContain('Zucchini soup');
    expect(recipes.map((item) => item.title)).toEqual(titles);
  });
  afterEach(() => vi.unstubAllGlobals());
  it('fetches PNG bytes and embeds a real image into the PDF without a canvas', async () => {
    const encoded =
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
    const request = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({ arrayBuffer: async () => bytes.buffer }),
    });
    vi.stubGlobal('fetch', request);
    const photo = await loadRecipePhoto('https://example.com/recipe.png');
    expect(photo).toMatchObject({ format: 'PNG', width: 1, height: 1 });
    expect(photo?.data).toEqual(bytes);
    expect(request).toHaveBeenCalledWith(
      'https://example.com/recipe.png',
      expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
    );
    const doc = createRecipeBook([recipe], {
      title: 'Photo book',
      photos: new Map([[recipe.id, photo!]]),
    });
    expect(doc.output()).toContain('/Subtype /Image');
    expect(doc.output()).toContain('Rice bowl');
  });
  it('embeds a photo obtained through authenticated Storage without requesting its display URL', async () => {
    const bytes = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      ),
      (character) => character.charCodeAt(0),
    );
    const source = vi.fn().mockResolvedValue({ arrayBuffer: async () => bytes.buffer });
    const request = vi.fn();
    vi.stubGlobal('fetch', request);
    const photo = await loadRecipePhoto('https://example.com/expired-token.png', source);
    expect(source).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalled();
    expect(photo?.format).toBe('PNG');
    const doc = createRecipeBook([recipe], {
      title: 'Authenticated photos',
      photos: new Map([[recipe.id, photo!]]),
    });
    expect(doc.output()).toContain('/Subtype /Image');
  });
  it('uses PNG artwork for existing saved sample SVG references', async () => {
    const bytes = Uint8Array.from(
      atob(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      ),
      (character) => character.charCodeAt(0),
    );
    const request = vi.fn().mockResolvedValue({
      ok: true,
      blob: async () => ({ arrayBuffer: async () => bytes.buffer }),
    });
    vi.stubGlobal('fetch', request);
    const photo = await loadRecipePhoto('sample-recipes/berry-oats.svg');
    expect(photo?.format).toBe('PNG');
    expect(request).toHaveBeenCalledWith('sample-recipes/berry-oats.png', expect.any(Object));
  });
  it('reports an unavailable photo rather than treating an error response as an image', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const report = vi.fn();
    expect(await loadRecipePhoto('https://example.com/missing.jpg', undefined, report)).toBeNull();
    expect(report).toHaveBeenCalledWith('Photo download failed (HTTP 403).');
  });
  it('includes a cover, contents and all recipe fields without modifying saved recipes', () => {
    const before = structuredClone(recipe);
    const doc = createRecipeBook([recipe], { title: 'Family recipes' });
    const pdf = doc.output();
    expect(pdf.startsWith('%PDF-')).toBe(true);
    for (const value of [
      'Family recipes',
      'Contents',
      'Rice bowl',
      '200 g Rice',
      'Salt to taste',
      'Cook rice',
      'Simmer until tender.',
      'Family cookbook',
      'Serve warm.',
    ])
      expect(pdf).toContain(value);
    expect(doc.getNumberOfPages()).toBe(3);
    expect(pdf).toContain('Page 3 of 3');
    expect(doc.output('blob').type).toBe('application/pdf');
    expect(recipe).toEqual(before);
  });
  it('paginates contents and long recipes without dropping the last recipe', () => {
    const recipes = Array.from({ length: 26 }, (_, i) => ({
      ...recipe,
      id: String(i),
      title: `Recipe ${i}`,
      notes: i === 25 ? 'Long cooking note. '.repeat(300) : '',
    }));
    const doc = createRecipeBook(recipes, { title: 'My collection' });
    expect(doc.getNumberOfPages()).toBeGreaterThan(29);
    expect(doc.output()).toContain('Recipe 25');
    expect(doc.output()).toContain(`Page ${doc.getNumberOfPages()} of ${doc.getNumberOfPages()}`);
    expect(() => createRecipeBook([], { title: 'Empty' })).toThrow('Choose at least one recipe');
  });
});

