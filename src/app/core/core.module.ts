import {
    NgModule,
    Optional, SkipSelf
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { SharedModule } from '../shared/shared.module';
import { JSONTreeComponent } from './json-tree/json-tree.component';
import { PageNotFoundComponent } from './page-not-found/page-not-found.component';
import { InstanceService } from './instance.service';

import { QueryProfileComponent } from '../query-profile/query-profile.component';
import { QueryProfileService } from '../query-profile/query-profile.service';
import { MySQLQueryDetailsComponent } from '../mysql-query-details/mysql-query-details.component';
import { MySQLQueryDetailsService } from '../mysql-query-details/mysql-query-details.service';
import { MongoQueryDetailsComponent } from '../mongo-query-details/mongo-query-details.component';
import { MongoQueryDetailsService } from '../mongo-query-details/mongo-query-details.service';
import { PostgreSQLQueryDetailsComponent } from '../postgresql-query-details/postgresql-query-details.component';
import { PostgreSQLQueryDetailsService } from '../postgresql-query-details/postgresql-query-details.service';
import { SummaryComponent } from '../summary/summary.component';
import { SummaryService } from '../summary/summary.service';
import { SettingsComponent } from '../settings/settings.component';
import { SettingsService } from '../settings/settings.service';
import { AddAmazonRDSService } from '../add-amazon-rds/add-amazon-rds.service';
import { AddRemoteInstanceService } from '../add-remote-instances/add-remote-instance.service';
import { RemoteInstancesListService } from '../remote-instances-list/remote-instances-list.service';
import { ClipboardModule } from 'ngx-clipboard';
import { RemoteInstancesListComponent } from '../remote-instances-list/remote-instances-list.component';

@NgModule({
    imports: [CommonModule, SharedModule, ClipboardModule, SummaryComponent, SettingsComponent,
        JSONTreeComponent, PostgreSQLQueryDetailsComponent, MongoQueryDetailsComponent, MySQLQueryDetailsComponent,
        QueryProfileComponent, PageNotFoundComponent, RemoteInstancesListComponent],
    providers: [InstanceService, QueryProfileService, MySQLQueryDetailsService,
        MongoQueryDetailsService, PostgreSQLQueryDetailsService, SummaryService, SettingsService,
      AddAmazonRDSService, AddRemoteInstanceService, RemoteInstancesListService]
})
export class CoreModule {

    constructor( @Optional() @SkipSelf() parentModule: CoreModule) {
        if (parentModule) {
            throw new Error(
                'CoreModule is already loaded. Import it in the AppModule only');
        }
    }
}
