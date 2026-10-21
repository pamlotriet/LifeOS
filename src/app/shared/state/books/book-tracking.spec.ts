import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import { BookStore } from './book-store';
import { BookRecord } from './book.model';
import { BookService } from './book.service';
import { AuthService } from '../authentication/authentication.service';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { OpenLibraryCoverService } from './open-library-cover.service';

describe('Progress tracking persistence',()=>{
  it('saves the selected unit alongside synchronized pages and percentage',async()=>{
    const updateDocument=vi.fn();
    const service=runInInjectionContext(Injector.create({providers:[{provide:AuthService,useValue:{getSession:async()=>({uid:'me',token:'token'})}},{provide:FirestoreService,useValue:{updateDocument}},{provide:OpenLibraryCoverService,useValue:{}}]}),()=>new BookService());
    await service.setReadingProgress('mixed',50,657);
    expect(updateDocument).toHaveBeenLastCalledWith('users/me/books/mixed',{progress:{integerValue:'50'},progressMode:{stringValue:'percent'},pageProgress:{integerValue:'329'}},'token');
    await service.setReadingPosition('mixed',300,657);
    expect(updateDocument).toHaveBeenLastCalledWith('users/me/books/mixed',{progress:{integerValue:'46'},progressMode:{stringValue:'pages'},pageProgress:{integerValue:'300'}},'token');
  });
});

describe('Kindle reading sessions', () => {
  it('preserves raw locations and avoids a duplicate entry for an unchanged position', async () => {
    let book = {id: 'kindle', progressMode: 'locations', currentLocation: 900, totalLocations: 4500, locationEntries: []} as unknown as BookRecord;
    const store = Object.create(BookStore.prototype) as BookStore;
    store.getBook = async () => book;
    store.saveBook = async (input, id) => { book = {...input, id: id!}; return book; };
    await store.setReadingLocation('kindle', 1000);
    expect(book.locationEntries).toHaveLength(1);
    expect(book.locationEntries![0]).toMatchObject({fromLocation: 900, toLocation: 1000});
    await store.setReadingLocation('kindle', 1000);
    expect(book.locationEntries).toHaveLength(1);
  });
});
