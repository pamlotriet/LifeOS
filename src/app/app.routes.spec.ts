import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '@app/app.routes';

@Component({ imports: [RouterOutlet], template: '<router-outlet />' })
class RouteTarget {}

// Exercise the real lazy route files without bootstrapping page services or Firebase.
async function navigationRoutes(config: Routes): Promise<Routes> {
  return Promise.all(
    config.map(async (route) => {
      const result = { ...route };
      if (result.canActivate) result.canActivate = [() => true];
      if (result.loadComponent) result.loadComponent = () => Promise.resolve(RouteTarget);
      if (result.children) result.children = await navigationRoutes(result.children);
      if (result.loadChildren) {
        const load = result.loadChildren;
        result.loadChildren = async () => navigationRoutes((await load()) as Routes);
      }
      return result;
    }),
  );
}

describe('Lazy feature routes', () => {
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter(await navigationRoutes(routes))] });
  });

  it.each([
    ['/home', '/home'],
    ['/stats', '/stats'],
    ['/more', '/more'],
    ['/today/customise', '/planning'],
    ['/planning/meals', '/planning'],
    ['/nutrition/ingredients', '/planning/ingredients'],
    ['/search', '/wheel'],
    ['/nutrition/profile', '/nutrition/profile'],
    ['/gym', '/gym'],
    ['/budget/month', '/budget/month'],
    ['/budget/transactions/123/edit', '/budget/transactions/123/edit'],
    ['/fuel/refuels/car/123/edit', '/fuel/refuels/car/123/edit'],
    ['/add/car', '/fuel/add-car'],
    ['/vehicles', '/fuel/vehicles'],
    ['/books/123/edit', '/books/123/edit'],
    ['/books/scan', '/books/scan'],
    ['/recipes/add', '/recipes/add'],
    ['/recipes/123/edit', '/recipes/123/edit'],
    ['/recipes/123', '/recipes/123'],
    ['/passwords/settings', '/passwords/settings'],
    ['/settings', '/settings'],
    ['/unknown', '/home'],
  ])('navigates from %s to %s', async (url, expected) => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    expect(TestBed.inject(Router).url).toBe(expected);
  });

  it('preserves route data and parameters', async () => {
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    const leaf = () => {
      let snapshot = router.routerState.snapshot.root;
      while (snapshot.firstChild) snapshot = snapshot.firstChild;
      return snapshot;
    };
    await harness.navigateByUrl('/budget/month');
    expect(leaf().data['monthly']).toBe(true);
    await harness.navigateByUrl('/books/scan');
    expect(leaf().data['scan']).toBe(true);
    await harness.navigateByUrl('/fuel/refuels/car/123/edit');
    expect(leaf().params).toEqual({ vehicleId: 'car', id: '123' });
  });
});
