import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { FamilyService } from './family.service';

describe('FamilyService', () => {
  const getSession=vi.fn(); const getDocument=vi.fn(); const tryGetDocument=vi.fn(); const listDocuments=vi.fn(); const createDocument=vi.fn(); const updateDocument=vi.fn(); const deleteDocument=vi.fn();
  const service=()=>runInInjectionContext(Injector.create({providers:[{provide:AuthService,useValue:{getSession}},{provide:FirestoreService,useValue:{getDocument,tryGetDocument,listDocuments,createDocument,updateDocument,deleteDocument}}]}),()=>new FamilyService());
  beforeEach(()=>{vi.clearAllMocks();getSession.mockResolvedValue({uid:'owner-1',token:'token'});});

  it('creates an owner-backed family and links the profile',async()=>{
    getDocument.mockResolvedValue({name:'users/owner-1',fields:{displayName:{stringValue:'Pam'},email:{stringValue:'pam@example.com'}}});
    await service().create('Lotriet Family');
    expect(createDocument).toHaveBeenCalledWith('families',expect.any(String),expect.objectContaining({ownerId:{stringValue:'owner-1'},memberIds:{arrayValue:{values:[{stringValue:'owner-1'}]}}}),'token');
    expect(updateDocument).toHaveBeenCalledWith('users/owner-1',expect.objectContaining({familyOwnerId:{stringValue:'owner-1'}}),'token');
  });

  it('creates an unguessable family invite linked to the owner',async()=>{
    tryGetDocument.mockResolvedValue({fields:{familyId:{stringValue:'family-1'},familyOwnerId:{stringValue:'owner-1'}}});
    const code=await service().invite('member@example.com');
    expect(code).toHaveLength(36);
    expect(createDocument).toHaveBeenCalledWith('familyInvites',code,expect.objectContaining({familyId:{stringValue:'family-1'},email:{stringValue:'member@example.com'},active:{booleanValue:true}}),'token');
  });
});
