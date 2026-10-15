import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
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
