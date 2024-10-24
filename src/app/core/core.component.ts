import {OnDestroy, Component} from '@angular/core';
import {ParseQueryParamDatePipe} from '../shared/parse-query-param-date.pipe';
import {Event, Router, ActivatedRoute, NavigationEnd} from '@angular/router';
import * as moment from 'moment';

import {environment} from '../environment';
import {Subscription} from 'rxjs';
import {Instance, InstanceService} from './instance.service';
import {filter} from 'rxjs/operators';
import { RDSInstance, RDSService } from './rds.service';

export interface QueryParams {
  from?: string;
  to?: string;
  'var-host'?: string;
  search?: string;
  queryID?: string;
  tz?: string;
  theme?: string;
  first_seen?: boolean;
  sort_by?: string;
}

/**
 * Base class for all components.
 */
@Component({
  template: ''
})
export abstract class CoreComponent implements OnDestroy {

  protected routerSubscription: Subscription;
  public queryParams: QueryParams;
  public previousQueryParams: QueryParams;
  public dbServer: Instance | null = null; // for components that care current database server only
  public dbServers: Array<Instance> = []; // for components that care all selected database servers
  public dbServerMap: { [key: string]: Instance } = {};
  public rdsInstances: Array<RDSInstance> = [];
  public from: any;
  public to: any;
  public isAllSelected: boolean;
  public isNotExistSelected: boolean;
  public isQueryDataAbsent: boolean;

  public fromUTCDate: string;
  public toUTCDate: string;
  parseQueryParamDatePipe = new ParseQueryParamDatePipe();

  constructor(protected route: ActivatedRoute, protected router: Router,
              protected instanceService: InstanceService,
              protected rdsService: RDSService = null) {
    this.dbServer = instanceService.dbServers[0];
    this.dbServers = instanceService.dbServers;
    this.dbServerMap = instanceService.dbServerMap;
    if (rdsService !== null)
      this.rdsInstances = rdsService.rdsInstances;
    this.subscribeToRouter();
  }

  /**
   * Extract and convert query parameters.
   * Trigger onChangeParams method (must be overridden) on route change.
   */
  subscribeToRouter() {

    this.routerSubscription = this.router.events.pipe(
      filter((e: any) => e instanceof NavigationEnd)
    )
      .subscribe((event: Event) => {
        this.queryParams = this.route.snapshot.queryParams as QueryParams;
        this.parseParams();

        // trigger overriden method in child component
        this.onChangeParams(this.queryParams);

        this.previousQueryParams = Object.assign({}, this.queryParams);
      });
  }

  parseParams() {
    this.isAllSelected = this.queryParams['var-host']?.split(',').includes('All');
    this.isQueryDataAbsent = (!this.dbServers?.length) && (!this.isAllSelected) && (!this.isNotExistSelected);
    try {
      this.dbServers = this.queryParams['var-host']?.split(',').map(host => this.dbServerMap[host]);
      this.dbServer = this.dbServers[0];
    } catch (err) {
      if (this.queryParams.hasOwnProperty('var-host')) {
        this.dbServer = null;
        this.dbServers = [];
        this.isNotExistSelected = !this.isAllSelected;
      } else {
        this.dbServers = this.instanceService.dbServers;
        this.dbServer = this.instanceService.dbServers[0];
      }
    }
    this.setTimeZoneFromParams();
    this.setThemeFromParams();
    this.from = this.parseQueryParamDatePipe.transform(this.queryParams.from, 'from');
    this.to = this.parseQueryParamDatePipe.transform(this.queryParams.to, 'to');
    this.fromUTCDate = this.from.utc().format('YYYY-MM-DDTHH:mm:ss');
    this.toUTCDate = this.to.utc().format('YYYY-MM-DDTHH:mm:ss');
  }

  /**
   * onChangeParams is invoked every time when route changes
   * @param params optional
   */
  abstract onChangeParams(params): void;

  /**
   * set timezone based on given query parameter.
   */
  setTimeZoneFromParams() {
    const tz = this.queryParams.tz || 'browser';
    const expireDays = moment().utc().add(7, 'y').toString();
    document.cookie = `timezone=${tz}; expires=${expireDays}; path=/`;
  }

  setThemeFromParams() {
    const theme = this.queryParams.theme || '';
    if (theme) {
      const expireDays = moment().utc().add(7, 'y').toString();
      document.cookie = `theme=app-theme-${theme}; expires=${expireDays}; path=/`;
    }
  }

  /**
   * Destroys route subscription on component unload.
   */
  ngOnDestroy() {
    this.routerSubscription.unsubscribe();
  }
}


export class QanError extends Error {
  static errType = 'QanError';
  name = 'QanError';
}
