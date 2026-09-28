export interface FamilyRecord { id: string; name: string; ownerId: string; memberIds: string[]; sharePlanning: boolean; shareRecipes: boolean; createdAt: string; }
export interface FamilyMember { id: string; displayName: string; email: string; photoUrl: string; role: 'Owner' | 'Member'; }
export interface FamilyContext { familyId: string; ownerId: string; }
