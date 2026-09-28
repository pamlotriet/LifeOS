import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FirestoreService } from '../../../core/firebase/firestore.service';
import { AuthService } from '../authentication/authentication.service';
import { FamilyService } from './family.service';

describe('FamilyService', () => {
  const getSession=vi.fn(); const getDocument=vi.fn(); const tryGetDocument=vi.fn(); const listDocuments=vi.fn(); const queryDocuments=vi.fn(); const createDocument=vi.fn(); const updateDocument=vi.fn(); const deleteDocument=vi.fn(); const commitWrites=vi.fn();
  const service=()=>runInInjectionContext(Injector.create({providers:[{provide:AuthService,useValue:{getSession}},{provide:FirestoreService,useValue:{getDocument,tryGetDocument,listDocuments,queryDocuments,createDocument,updateDocument,deleteDocument,commitWrites,documentName:(path:string)=>`projects/p/databases/(default)/documents/${path}`}}]}),()=>new FamilyService());
  beforeEach(()=>{vi.clearAllMocks();getSession.mockResolvedValue({uid:'owner-1',token:'token'});createDocument.mockResolvedValue(undefined);updateDocument.mockResolvedValue(undefined);commitWrites.mockResolvedValue(undefined);});

  it('creates an owner-backed family and links the profile',async()=>{
    getDocument.mockResolvedValue({name:'users/owner-1',fields:{displayName:{stringValue:'Pam'},email:{stringValue:'pam@example.com'}}});
    await service().create('Lotriet Family');
    expect(createDocument).toHaveBeenCalledWith('families',expect.any(String),expect.objectContaining({ownerId:{stringValue:'owner-1'},memberIds:{arrayValue:{values:[{stringValue:'owner-1'}]}}}),'token');
    expect(updateDocument).toHaveBeenCalledWith('users/owner-1',expect.objectContaining({familyOwnerId:{stringValue:'owner-1'}}),'token');
  });

  it('creates an unguessable family invite linked to the owner',async()=>{
    tryGetDocument.mockResolvedValue({fields:{familyId:{stringValue:'family-1'},familyOwnerId:{stringValue:'owner-1'}}});
    getDocument.mockResolvedValue({fields:{name:{stringValue:'Lotriet Family'}}});
    const code=await service().invite('member@example.com');
    expect(code).toHaveLength(36);
    expect(createDocument).toHaveBeenCalledWith('familyInvites',code,expect.objectContaining({familyId:{stringValue:'family-1'},familyName:{stringValue:'Lotriet Family'},email:{stringValue:'member@example.com'},active:{booleanValue:true}}),'token');
  });

  it('loads pending invitations for the signed-in Google email',async()=>{
    getDocument.mockResolvedValue({fields:{email:{stringValue:'member@example.com'}}});
    queryDocuments.mockResolvedValue([{name:'projects/p/databases/(default)/documents/familyInvites/code-1',fields:{familyId:{stringValue:'family-1'},familyName:{stringValue:'Lotriet Family'},ownerId:{stringValue:'owner-1'},email:{stringValue:'member@example.com'},active:{booleanValue:true}}}]);
    await expect(service().pendingInvites()).resolves.toEqual([expect.objectContaining({id:'code-1',familyName:'Lotriet Family',active:true})]);
    expect(queryDocuments).toHaveBeenCalledWith('familyInvites','email',{stringValue:'member@example.com'},'token');
  });

  it('joins with an atomic member array transform without reading the protected family',async()=>{
    getSession.mockResolvedValue({uid:'member-1',token:'token'});
    getDocument.mockResolvedValueOnce({fields:{active:{booleanValue:true},familyId:{stringValue:'family-1'},ownerId:{stringValue:'owner-1'}}}).mockResolvedValueOnce({name:'users/member-1',fields:{displayName:{stringValue:'Member'},email:{stringValue:'member@example.com'}}});
    await service().join('invite-code');
    expect(commitWrites).toHaveBeenCalledWith([expect.objectContaining({updateTransforms:[{fieldPath:'memberIds',appendMissingElements:{values:[{stringValue:'member-1'}]}}]})],'token');
    expect(getDocument).not.toHaveBeenCalledWith('families/family-1','token');
    expect(updateDocument).toHaveBeenCalledWith('familyInvites/invite-code',{active:{booleanValue:false}},'token');
  });
});
