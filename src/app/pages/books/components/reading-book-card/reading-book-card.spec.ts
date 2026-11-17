import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ReadingBookCard } from '@pages/books/components/reading-book-card/reading-book-card';

describe('Extracted reading card', () => {
  it('retains accessible progress, book links and the selected-book action', () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const view = TestBed.createComponent(ReadingBookCard);
    const book = {
      id: 'example',
      title: 'Example book',
      author: 'Author',
      coverUrl: '',
      pageCount: 200,
      pageProgress: 50,
    };
    view.componentRef.setInput('book', book);
    view.componentRef.setInput('percent', 25);
    view.componentRef.setInput('trackingMode', 'pages');
    view.detectChanges();
    expect(
      view.nativeElement.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'),
    ).toBe('25');
    expect(view.nativeElement.querySelector('a').getAttribute('href')).toBe('/books/example/edit');
    const progress = vi.fn();
    view.componentInstance.progress.subscribe(progress);
    view.nativeElement.querySelector('button').click();
    expect(progress).toHaveBeenCalledWith(book);
  });
});
