import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonContent, IonIcon } from '@ionic/angular';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { AuthService } from '../../shared/state/authentication/authentication.service';
import { FamilyInvite } from '../../shared/state/family/family.model';
import { FamilyStore } from '../../shared/state/family/family-store';
import { PlanningStore } from '../../shared/state/planning/planning-store';
import { RecipeStore } from '../../shared/state/recipes/recipe-store';

@Component({ selector: 'app-family-settings', imports: [IonContent, IonIcon, FormsModule, PageHeader], templateUrl: './family-settings.html', styleUrl: './family-settings.css' })
export class FamilySettings {
  readonly store = inject(FamilyStore); private readonly planning = inject(PlanningStore); private readonly recipes = inject(RecipeStore);
  readonly uid = inject(AuthService).userId; readonly familyName = signal(''); readonly inviteEmail = signal(''); readonly joinCode = signal('');
  readonly busy = signal(false); readonly action = signal(''); readonly message = signal(''); readonly sentCount = signal(0);
  constructor() { void this.store.reload(); }
  async create() { await this.run('Creating family', async () => { await this.store.create(this.familyName()); await this.refreshShared(); this.message.set('Family created.'); }); }
  async invite() { await this.run('Sending invitation', async () => { const code = await this.store.invite(this.inviteEmail()); this.sentCount.update(x => x + 1); this.inviteEmail.set(''); this.message.set(`Invitation sent in LifeOS. Code: ${code}`); }); }
  async join() { await this.run('Joining family', async () => { await this.store.join(this.joinCode()); await this.refreshShared(); this.joinCode.set(''); this.message.set('You joined the family.'); }); }
  async accept(invite: FamilyInvite) { await this.run('Accepting invitation', async () => { await this.store.accept(invite); await this.refreshShared(); this.message.set(`You joined ${invite.familyName}.`); }); }
  async leave() { await this.run('Leaving family', async () => { await this.store.leave(); await this.refreshShared(); this.message.set('You left the family.'); }); }
  async copy() { await this.run('Copying code', async () => { const code = this.store.inviteCode(); if (!code) throw new Error('Create an invitation first.'); await navigator.clipboard.writeText(code); this.message.set('Invite code copied.'); }); }
  async refresh() { await this.run('Checking invitations', async () => { await this.store.reload(); this.message.set('Invitations refreshed.'); }); }
  async toggle(field: 'sharePlanning' | 'shareRecipes', event: Event) { await this.run('Updating sharing', () => this.store.toggle(field, (event.target as HTMLInputElement).checked)); }
  private async refreshShared() { await Promise.all([this.planning.reload(), this.recipes.reload()]); }
  private async run(label: string, task: () => Promise<void>) { if (this.busy()) return; this.busy.set(true); this.action.set(label); this.message.set(''); try { await task(); } catch (error) { this.message.set(error instanceof Error ? error.message : 'Could not update family.'); } finally { this.busy.set(false); this.action.set(''); } }
}
