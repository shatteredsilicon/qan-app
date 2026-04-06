import { enableProdMode, provideZoneChangeDetection } from '@angular/core';
import { environment } from './environments/environment';
import { AppModule } from './app/app.module';
import { platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamicTesting().bootstrapModule(AppModule);
