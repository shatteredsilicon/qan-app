import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { InstanceService } from '../../core/services/instance.service';
import { QueryProfileService } from './query-profile.service';
import { Router, ActivatedRoute } from '@angular/router';
import { MetricsNamesService } from '../../inventory-api/services/metrics-names.service';
const queryProfileError = 'No data. Please check pmm-client and database configurations on selected instance.';

@Component({
  moduleId: module.id,
  templateUrl: 'query-profile.component.html',
  styleUrls: ['./query-profile.component.scss'],
})
export class QueryProfileComponent implements OnInit {
  @ViewChild('qanTable') table: ElementRef;

  objectKeys = Object.keys;
  public queryProfile: Array<{}>;
  public profileTotal;
  public offset: number;
  public isAdditionalColumn = false;
  public totalAmountOfQueries: number;
  public leftInDbQueries: number;
  public searchValue: string;
  public fromDate: string;
  public toDate: string;
  public quantityDbQueriesMessage: string;
  public isLoading: boolean;
  public isQueryLoading: boolean;
  public noQueryError: string;
  public isFirstSeen: boolean;
  public isFirstSeenChecked = false;
  public testingVariable: boolean;
  public isSearchQuery = false;
  public measurement: string;
  public mockQueryProfile = {};
  private metrics$;

  constructor(protected route: ActivatedRoute,
    protected router: Router,
    protected instanceService: InstanceService,
    public queryProfileService: QueryProfileService,
    private metricsNamesService: MetricsNamesService
  ) {
  }

  ngOnInit() {
    console.log('Component init');
  }

  // /**
  //  * Load query if params have been changed
  //  * @param params - current link params
  //  */
  // onChangeParams(params) {
  //   // checks changing tz
  //   this.fromDate = moment(this.from).format('llll');
  //   this.toDate = moment(this.to).format('llll');
  //
  //   // only if host, from and to are different from prev router - load queries.
  //   if (!this.previousQueryParams ||
  //     this.previousQueryParams['var-host'] !== this.queryParams['var-host'] ||
  //     this.previousQueryParams.from !== this.queryParams.from ||
  //     this.previousQueryParams.to !== this.queryParams.to ||
  //     this.previousQueryParams.search !== this.queryParams.search ||
  //     this.previousQueryParams.first_seen !== this.queryParams.first_seen ||
  //     this.previousQueryParams.tz !== this.queryParams.tz) {
  //     this.loadQueries();
  //   }
  // }

  // navigateToDetails(subsystem, id) {
  //   const params = this.composeQueryParamsForGrid(id);
  //   this.router.navigate(['./', 'report', subsystem], {queryParams: params, relativeTo: this.route})
  // }

  // /**
  //  * Check if current query is first seen for current date
  //  * @param currentQuery - query in main qan-table
  //  */
  // checkFirstSeen(currentQuery) {
  //   this.isFirstSeen = moment.utc(currentQuery['FirstSeen']).valueOf() > moment.utc(this.fromUTCDate).valueOf();
  //   return this.isFirstSeen;
  // }

  /**
   * Load first 10 queries for main qan-table
   */
  // public async loadQueries() {
  //   this.isQueryLoading = true;
  //
  //   // clear after error
  //   this.noQueryError = '';
  //   this.totalAmountOfQueries = this.leftInDbQueries = 0;
  //   this.queryProfile = [];
  //   this.searchValue = this.queryParams.search === 'null' ? '' : this.queryParams.search;
  //   const search = this.queryParams.search === 'null' && this.searchValue !== 'NULL' ? '' : this.queryParams.search;
  //   const firstSeen = this.queryParams.first_seen;
  //   this.offset = 0;
  //   try {
  //     const data = await this.queryProfileService
  //       .getQueryProfile(this.dbServer.UUID, this.fromUTCDate, this.toUTCDate, this.offset, search, firstSeen);
  //     if (data.hasOwnProperty('Error') && data['Error'] !== '') {
  //       this.testingVariable = true;
  //       throw new QanError('Queries are not available.');
  //     }
  //     this.totalAmountOfQueries = data['TotalQueries'];
  //     if (this.totalAmountOfQueries > 0) {
  //       this.queryProfile = data['Query'];
  //       this.countDbQueries();
  //       this.profileTotal = this.queryProfile[0];
  //     }
  //   } catch (err) {
  //     this.noQueryError = err.name === QanError.errType ? err.message : queryProfileError;
  //   } finally {
  //     this.isQueryLoading = false;
  //   }
  //   // console.log(JSON.stringify(this.queryProfile[1]['Log']));
  // }

  /**
   * Load next 10 queries for main qan-table
   */
  // public async loadMoreQueries() {
  //   this.isLoading = true;
  //   this.offset = this.offset + 10;
  //   const dbServerUUID = this.dbServer.UUID;
  //   const search =
  //     this.queryParams.search === 'null' &&
  //     this.searchValue !== 'NULL' && this.searchValue !== 'null' ? '' : this.queryParams.search;
  //   const firstSeen = this.queryParams.first_seen;
  //   const data = await this.queryProfileService
  //     .getQueryProfile(dbServerUUID, this.fromUTCDate, this.toUTCDate, this.offset, search, firstSeen);
  //
  //   const _ = data['Query'].shift();
  //   for (const q of data['Query']) {
  //     this.queryProfile.push(q);
  //   }
  //   this.countDbQueries();
  //   this.isLoading = false;
  // }

  /**
   * Count how queries left in main qan-table
   */
  countDbQueries() {
    this.leftInDbQueries = this.totalAmountOfQueries - (this.queryProfile.length - 1);
    this.quantityDbQueriesMessage = this.leftInDbQueries > 0 ?
      `Load next ${this.leftInDbQueries > 10 ? 10 : this.leftInDbQueries} queries` :
      'No more queries for selected time range';
  }

  // /**
  //  * Set router parameters if query is checked in main qan-table
  //  * @param queryID - checked queries' id
  //  * @return query params of current query
  //  */
  // composeQueryParamsForGrid(queryID: string | null): QueryParams {
  //   const queryParams: QueryParams = Object.assign({}, this.queryParams);
  //   queryParams.queryID = queryID || 'TOTAL';
  //   return queryParams;
  // }

  // /**
  //  * Show search queries result for main qan-table
  //  */
  // search() {
  //   this.isSearchQuery = true;
  //   const params: QueryParams = Object.assign({}, this.queryParams);
  //   if (!!this.searchValue) {
  //     params.search = this.searchValue === 'null' ? 'NULL' : this.searchValue;
  //     this.testingVariable = true;
  //   } else {
  //     this.testingVariable = false;
  //     delete params.search;
  //   }
  //   delete params.queryID;
  //   this.router.navigate(['profile'], {queryParams: params});
  // }

  // /**
  //  * Show first-seen queries or restore default state of main qan-table queries
  //  * if isFirstSeenChecked is false
  //  * @param isFirstSeenChecked - state for checked switcher for first-seen
  //  */
  // toggleFirstSeen(isFirstSeenChecked = false) {
  //   this.isQueryLoading = true;
  //   this.isFirstSeenChecked = isFirstSeenChecked;
  //   const params: QueryParams = Object.assign({}, this.queryParams);
  //   if (isFirstSeenChecked) {
  //     this.testingVariable = true;
  //     params.first_seen = this.isFirstSeenChecked;
  //   } else {
  //     this.testingVariable = false;
  //     delete params.first_seen;
  //   }
  //   delete params.queryID;
  //   this.router.navigate(['profile'], {queryParams: params});
  //   this.isQueryLoading = false;
  // }
}