import { jsPDF } from 'jspdf';
import { englishText, TranslateText } from '@core/i18n/translation-text';
import { RecipeRecord, recipeCategories } from '@pages/recipes/state/recipe/recipe.model';

export interface RecipeBookPhoto {
  data: string | Uint8Array;
  format?: 'JPEG' | 'PNG';
  width: number;
  height: number;
}
export interface RecipeBookOptions {
  title: string;
  photos?: ReadonlyMap<string, RecipeBookPhoto>;
  translate?: TranslateText;
}

/** Creates a local, printable book; saved recipe quantities are never modified. */
export function createRecipeBook(
  recipes: readonly RecipeRecord[],
  options: RecipeBookOptions,
): jsPDF {
  if (!recipes.length) throw new Error('Choose at least one recipe.');
  const titleOrder = new Intl.Collator('en-ZA', { sensitivity: 'base', numeric: true });
  const sortedRecipes = [...recipes].sort((a, b) =>
    titleOrder.compare(a.title.trim(), b.title.trim()),
  );
  const t = options.translate ?? englishText;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const title = options.title.trim() || t('My recipe book');
  doc.setProperties({ title, author: 'LifeOS' });
  const clean = (text: string) =>
    text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u00a0/g, ' ');
  let y = 24;
  const page = () => {
    doc.addPage();
    y = 24;
  };
  const text = (
    value: string,
    size = 10,
    bold = false,
    color: [number, number, number] = [42, 39, 47],
  ) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(clean(value), 174) as string[];
    for (const line of lines) {
      if (y + size * 0.45 > 275) page();
      doc.text(line, 18, y);
      y += size * 0.45;
    }
    y += 3;
  };
  const heading = (value: string) => {
    if (y > 252) page();
    y += 4;
    text(value, 13, true, [76, 35, 101]);
  };
  // Cover.
  doc.setFillColor(248, 246, 250);
  doc.rect(0, 0, 210, 297, 'F');
  doc.setFillColor(76, 35, 101);
  doc.rect(18, 54, 22, 2, 'F');
  y = 78;
  text(title, 30, true, [76, 35, 101]);
  text(t('{{p0}} recipes from my kitchen', { p0: recipes.length }), 13);
  y += 12;
  text(t('Collected with LifeOS'), 10);
  // Reserve contents pages; fill them once recipe page numbers are known.
  const contentsPages = Math.ceil(recipes.length / 24);
  for (let i = 0; i < contentsPages; i++) page();
  const starts: Array<{ title: string; page: number }> = [];
  for (const recipe of sortedRecipes) {
    page();
    starts.push({ title: recipe.title, page: doc.getNumberOfPages() });
    text(
      recipeCategories(recipe)
        .map((category) => t(category))
        .join(' / '),
      9,
      true,
      [100, 92, 110],
    );
    text(recipe.title, 24, true, [76, 35, 101]);
    text(
      t('{{p0}} servings | {{p1}} minutes | {{p2}}', {
        p0: recipe.servings,
        p1: recipe.cookTime,
        p2: t(recipe.difficulty),
      }),
      10,
    );
    if (recipe.description) text(recipe.description);
    const photo = options.photos?.get(recipe.id);
    if (photo) {
      const width = Math.min(174, (78 * photo.width) / photo.height);
      const height = (width * photo.height) / photo.width;
      if (y + height > 268) page();
      doc.addImage(photo.data, photo.format ?? 'JPEG', 18, y, width, height);
      y += height + 7;
    }
    heading(t('Ingredients'));
    for (const ingredient of recipe.nutritionIngredients ?? []) {
      text(
        `${ingredient.quantity ?? ingredient.grams} ${ingredient.unit ?? 'g'} ${ingredient.name}`,
      );
    }
    for (const ingredient of recipe.ingredients.filter((item) => item.trim())) text(ingredient);
    heading(t('Method'));
    recipe.steps.forEach((step, index) => {
      if (y > 250) page();
      text(`${index + 1}. ${step.title || t('Step {{p0}}', { p0: index + 1 })}`, 11, true);
      text(step.instruction);
    });
    if (recipe.notes) {
      heading(t('Notes'));
      text(recipe.notes);
    }
    if (recipe.source || recipe.sourceLink) {
      heading(t('Source'));
      if (recipe.source) text(recipe.source);
      if (recipe.sourceLink) text(recipe.sourceLink, 9);
    }
  }
  for (let i = 0; i < contentsPages; i++) {
    doc.setPage(2 + i);
    y = 26;
    text(t('Contents'), 22, true, [76, 35, 101]);
    for (const item of starts.slice(i * 24, (i + 1) * 24)) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(42, 39, 47);
      const shortened = doc.splitTextToSize(clean(item.title), 152)[0] as string;
      doc.text(shortened, 18, y);
      doc.text(String(item.page), 192, y, { align: 'right' });
      doc.link(18, y - 4, 174, 7, { pageNumber: item.page });
      y += 9;
    }
  }
  const count = doc.getNumberOfPages();
  for (let i = 2; i <= count; i++) {
    doc.setPage(i);
    doc.setDrawColor(224, 219, 230);
    doc.line(18, 281, 192, 281);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(110, 102, 119);
    doc.text('LifeOS', 18, 287);
    doc.text(t('Page {{p0}} of {{p1}}', { p0: i, p1: count }), 192, 287, { align: 'right' });
  }
  return doc;
}

/** Fetch fresh bytes rather than reusing a cached display-only image in a canvas. */
export async function loadRecipePhoto(
  url: string,
  source?: () => Promise<Blob>,
  reportError?: (message: string) => void,
): Promise<RecipeBookPhoto | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  let objectUrl: string | undefined;
  try {
    let blob: Blob;
    if (source) blob = await source();
    else {
      // Existing saved samples reference SVGs; prefer the matching bundled PNG.
      const samplePng = /^(\/?sample-recipes\/(?:berry-oats|tomato-pasta|chicken-rice))\.svg$/.exec(
        url,
      );
      const requestUrl = samplePng ? `${samplePng[1]}.png` : url;
      const response = await fetch(requestUrl, { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error(`Photo download failed (HTTP ${response.status}).`);
      blob = await response.blob();
    }
    const data = new Uint8Array(await blob.arrayBuffer());
    if (!data.length) throw new Error('The photo file is empty.');
    const format =
      data[0] === 0xff && data[1] === 0xd8
        ? 'JPEG'
        : data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47
          ? 'PNG'
          : null;
    if (format) {
      // Original bytes preserve photos without canvas CORS/cache or encoding failures.
      const properties = new jsPDF().getImageProperties(data);
      if (!properties.width || !properties.height) return null;
      return { data, format, width: properties.width, height: properties.height };
    }
    // Browser-supported formats such as WebP are decoded from a local blob.
    const svgText = new TextDecoder().decode(data.slice(0, 1024));
    if (/<svg[\s>]/i.test(svgText)) blob = new Blob([blob], { type: 'image/svg+xml' });
    objectUrl = URL.createObjectURL(blob);
    const decoded = await decodeRecipePhoto(objectUrl, controller.signal);
    if (!decoded)
      throw new Error(
        `The browser could not decode the photo (${blob.type || 'unknown image format'}).`,
      );
    return decoded;
  } catch (error) {
    reportError?.(error instanceof Error ? error.message : 'Unknown photo error.');
    return null;
  } finally {
    clearTimeout(timeout);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

function decodeRecipePhoto(url: string, signal: AbortSignal): Promise<RecipeBookPhoto | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const finish = (photo: RecipeBookPhoto | null) => {
      img.onload = null;
      img.onerror = null;
      signal.removeEventListener('abort', abort);
      resolve(photo);
    };
    const abort = () => finish(null);
    if (signal.aborted) return finish(null);
    signal.addEventListener('abort', abort, { once: true });
    img.onload = () => {
      try {
        if (!img.naturalWidth || !img.naturalHeight) return finish(null);
        const ratio = Math.min(1, 1200 / img.naturalWidth, 900 / img.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
        const context = canvas.getContext('2d');
        if (!context) return finish(null);
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        finish({
          data: canvas.toDataURL('image/jpeg', 0.82),
          format: 'JPEG',
          width: canvas.width,
          height: canvas.height,
        });
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = url;
  });
}
