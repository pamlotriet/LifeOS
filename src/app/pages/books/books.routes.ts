import { Routes } from '@angular/router';
import { authGuard } from '@core/authentication/guards/auth.guard';

export const booksRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@pages/books/books-library/books-library').then((m) => m.BooksLibrary),
    canActivate: [authGuard],
  },
  {
    path: 'transfer',
    loadComponent: () =>
      import('@pages/books/book-transfer/book-transfer').then((m) => m.BookTransfer),
    canActivate: [authGuard],
  },
  {
    path: 'shelf',
    loadComponent: () => import('@pages/books/books-shelf/books-shelf').then((m) => m.BooksShelf),
    canActivate: [authGuard],
  },
  {
    path: 'finished',
    loadComponent: () =>
      import('@pages/books/finished-books/finished-books').then((m) => m.FinishedBooks),
    canActivate: [authGuard],
  },
  {
    path: 'scan',
    loadComponent: () => import('@pages/books/book-form/book-form').then((m) => m.BookForm),
    data: { scan: true },
    canActivate: [authGuard],
  },
  {
    path: 'add',
    loadComponent: () => import('@pages/books/book-form/book-form').then((m) => m.BookForm),
    canActivate: [authGuard],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('@pages/books/book-form/book-form').then((m) => m.BookForm),
    canActivate: [authGuard],
  },
  {
    path: 'tags',
    loadComponent: () => import('@pages/books/book-tags/book-tags').then((m) => m.BookTags),
    canActivate: [authGuard],
  },
];
