import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER, provideZonelessChangeDetection, provideZoneChangeDetection } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';

import { InstanceService } from './core/instance.service';
import { AddAmazonRDSComponent } from './add-amazon-rds/add-amazon-rds.component';
import { AddRemoteInstanceComponent } from './add-remote-instances/add-remote-instance.component';
import { AddInstanceComponent } from './add-instance/add-instance.component';
import {HttpClientModule} from '@angular/common/http';
import { RDSService } from './core/rds.service';
import { ServerService } from './core/server.service';

export function getInstances(instanceService: InstanceService) {
  return function () { return instanceService.getDBServers(); };
}
export function getRDS(rdsService: RDSService) {
  return function () { return rdsService.getRDSInstances(); };
}
export function getServer(serverService: ServerService) {
  return function() { return serverService.getServerInfo(); };
}

@NgModule({
  imports: [
    AppRoutingModule,
    BrowserModule,
    CoreModule,
    FormsModule,
    HttpClientModule,
    NgbModule,
    SharedModule,
    AppComponent,
    AddAmazonRDSComponent,
    AddRemoteInstanceComponent,
    AddInstanceComponent,
  ],
  providers: [
    provideZoneChangeDetection(),
    InstanceService,
    {
      provide: APP_INITIALIZER,
      useFactory: getInstances,
      deps: [InstanceService],
      multi: true
    },
    RDSService,
    {
      provide: APP_INITIALIZER,
      useFactory: getRDS,
      deps: [RDSService],
      multi: true
    },
    ServerService,
    {
      provide: APP_INITIALIZER,
      useFactory: getServer,
      deps: [ServerService],
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
