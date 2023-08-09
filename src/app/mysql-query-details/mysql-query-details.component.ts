import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Instance, InstanceService } from '../core/instance.service';
import { CoreComponent, QueryParams } from '../core/core.component';
import { MySQLQueryDetailsService, QueryDetails, ServerSummary, Table, DBObjectType, QueryInfo, QueryInfoResult } from './mysql-query-details.service';
import * as hljs from 'highlight.js';
import * as vkbeautify from 'vkbeautify';
import * as moment from 'moment';
import {NgbAccordion, NgbAccordionConfig, NgbPanelChangeEvent} from '@ng-bootstrap/ng-bootstrap';
import { stringify } from 'querystring';

@Component({
  moduleId: module.id,
  selector: 'app-query-details',
  templateUrl: './mysql-query-details.component.html',
  styleUrls: ['./mysql-query-details.component.scss'],
})
export class MySQLQueryDetailsComponent extends CoreComponent implements OnInit {

  protected queryID: string;
  public queryDetails: QueryDetails;
  public tables: Array<Table> = [];
  public views: Array<Table> = [];
  public queryInfo;
  public tableInfo;
  public procedureInfo;
  public viewInfo;
  public createTable: string;
  public statusTable;
  public indexTable;
  public createProcedure: string;
  public createView: string;
  public fingerprint: string;
  public queryExample: string;
  public classicExplain;
  public jsonExplain;
  public jsonExplainString;
  public visualExplain;
  public dataExplain;
  public dbName: string;
  public dbTblNames: string;
  public dbProcedureNames: string;
  public dbViewNames: string;
  public isDBGuessed: boolean;
  protected newDBTblNames: string;
  protected newDBProcedureNames: string;
  protected newDBViewNames: string;
  isSummary: boolean;
  isLoading: boolean;
  isExplainLoading: boolean;
  isCopied = {
    visualExplain: false,
    queryExample: false,
    fingerprint: false,
    createTable: false,
    jsonExplain: false,
    createProcedure: false,
    createView: false
  };
  isQueryInfoLoading: boolean;
  isFirstSeen: boolean;
  firstSeen: string;
  lastSeen: string;
  accordionIds = {
    serverSummary: ['metrics-table'],
    querySection: ['query-fingerprint'],
    explainSection: ['classic-explain'],
    tableSection: ['table-create'],
    procedureSection: ['procedure-create'],
    viewSection: ['view-create']
  };

  createTableError: string;
  statusTableError: string;
  indexTableError: string;
  jsonExplainError: string;
  classicExplainError: string;
  visualExplainError: string;
  createProcedureError: string;
  createViewError: string;
  event = new Event('showSuccessNotification');

  constructor(protected route: ActivatedRoute,
              protected router: Router,
              protected instanceService: InstanceService,
              protected queryDetailsService: MySQLQueryDetailsService) {
    super(route, router, instanceService);
  }

  ngOnInit() {
    this.queryParams = this.route.snapshot.queryParams as QueryParams;
    this.parseParams();
    this.onChangeParams(this.queryParams);
  }

  showSuccessNotification(key) {
    this.isCopied[key] = true;
    setTimeout( () => { this.isCopied[key] = false }, 3000);
    window.parent.document.dispatchEvent(this.event);
  }

  onChangeParams(params) {
    if (!this.dbServer) { return; }
    if (['TOTAL', undefined].indexOf(this.queryParams.queryID) !== -1) {
      this.isSummary = true;
      this.getServerSummary(this.dbServer.UUID, this.fromUTCDate, this.toUTCDate);
    } else {
      this.isSummary = false;
      this.accordionIds = {
        serverSummary: ['metrics-table'],
        querySection: ['query-fingerprint'],
        explainSection: ['classic-explain'],
        tableSection: ['table-create'],
        procedureSection: ['procedure-create'],
        viewSection: ['view-create']
      };
      this.getQueryDetails(this.dbServer.UUID, this.queryParams.queryID, this.fromUTCDate, this.toUTCDate);
    }
  }

  /**
   * Fix beautify dispalying text, will be delete after approve https://github.com/vkiryukhin/vkBeautify/pull/25
   * @param {string} text
   * @returns {string}
   */
  fixBeautifyText(text: string): string {
      return vkbeautify.sql(text.replace(/^EXPLAIN /i, "explain ")).replace('explain', 'EXPLAIN ').replace('  ', ' ');
  }

  async getQueryDetails(dbServerUUID, queryID, from, to: string) {
    this.isLoading = true;
    this.dbName = this.dbTblNames = '';
    this.dbProcedureNames = '';
    this.dbViewNames = '';
    this.tables = [];
    this.views = [];
    this.statusTable = this.indexTable = this.createTable = this.createProcedure = this.createView = '';
    this.statusTableError = this.indexTableError = this.createTableError = this.createProcedureError = this.createViewError = '';
    this.queryExample = '';
    this.isDBGuessed = false;
    this.jsonExplainError = this.classicExplainError = this.visualExplainError = '';
    this.jsonExplain = this.jsonExplainString = this.classicExplain = this.visualExplain = '';
    try {
      this.queryDetails = await this.queryDetailsService.getQueryDetails(dbServerUUID, queryID, from, to);
      this.firstSeen = moment(this.queryDetails.Query.FirstSeen).calendar(null, {sameElse: 'lll'});
      this.lastSeen = moment(this.queryDetails.Query.LastSeen).calendar(null, {sameElse: 'lll'});
      this.fingerprint = hljs.highlight('sql', this.fixBeautifyText(this.queryDetails.Query.Fingerprint)).value;
      if (this.queryDetails !== null && this.queryDetails.Example !== null && this.queryDetails.Example.Query !== '') {
        this.queryExample = hljs.highlight('sql', this.fixBeautifyText(this.queryDetails.Example.Query)).value;
      }
      this.isFirstSeen = moment.utc(this.queryDetails.Query.FirstSeen).valueOf() > moment.utc(this.fromUTCDate).valueOf();
      this.isLoading = false;

      this.setDefaultDB();
      this.getQueryInfo();
    } catch (err) {
      console.error(err);
    }
  }

  async getServerSummary(dbServerUUID: string, from: string, to: string) {
    this.dbName = this.dbTblNames = '';
    try {
      this.queryDetails = await this.queryDetailsService.getSummary(dbServerUUID, from, to) as QueryDetails;
    } catch (err) {
      console.error(err);
    }
  }

  async getExplain() {
    if (!this.dbServer || !this.dbServer.Agent) { return; }
    this.isExplainLoading = true;
    this.isCopied.visualExplain = false;
    const agentUUID = this.dbServer.Agent.UUID;
    const dbServerUUID = this.dbServer.UUID;
    this.classicExplainError = '';
    this.jsonExplainError = '';
    this.visualExplainError = '';
    const query = this.queryDetails.Example.Query;
    // https://github.com/percona/go-mysql/blob/master/event/class.go#L25
    const maxExampleBytes = 10240;
    if (query.length >= maxExampleBytes) {
      this.jsonExplainError = `
        Cannot explain truncated query.
        This query was truncated to maximum size of ${maxExampleBytes} bytes.
      `;
      this.classicExplainError = this.jsonExplainError;
      this.visualExplainError = this.jsonExplainError;
      this.isExplainLoading = false;
      return
    }

    try {
      // let data = await this.queryDetailsService.getExplain(agentUUID, dbServerUUID, this.dbName, query);
      this.dataExplain = await this.queryDetailsService.getExplain(agentUUID, dbServerUUID, this.dbName, query, typeof this.queryDetails.Example.Explain === 'string' ? this.queryDetails.Example.Explain : this.queryDetails.Example.Explain.String);
      if (this.dataExplain.hasOwnProperty('Error') && this.dataExplain['Error'] !== '') {
        throw new Error(this.dataExplain['Error']);
      }
      this.dataExplain = JSON.parse(atob(this.dataExplain.Data));
      this.classicExplain = this.dataExplain.Classic;
      this.visualExplain = this.dataExplain.Visual;
      try {
        this.jsonExplain = JSON.parse(this.dataExplain.JSON);
        this.jsonExplainString = JSON.stringify(this.jsonExplain);
      } catch (err) {
        this.jsonExplainError = err.message;
      }
    } catch (err) {
      this.classicExplainError = this.jsonExplainError = this.visualExplainError = 'This type of query is not supported for EXPLAIN';
    }

    this.isExplainLoading = false;
  }

  getQueryInfo() {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.isQueryInfoLoading = true;
    const agentUUID = this.dbServer.Agent.UUID;
    const dbServerUUID = this.dbServer.UUID;

    this.queryDetailsService.getQueryInfo(
      agentUUID,
      dbServerUUID,
      this.queryDetails.Query.Tables ? this.queryDetails.Query.Tables : [],
      this.queryDetails.Query.Procedures ? this.queryDetails.Query.Procedures : []
    )
      .then(data => {
        if (!this.dbName && data.GuessDB?.DB) {
          this.dbName = data.GuessDB.DB;
          this.isDBGuessed = data.GuessDB.IsAmbiguous;

          for (var i = 0; i < this.queryDetails.Query.Tables?.length; i++) {
            if (!this.queryDetails.Query.Tables[i].Db) this.queryDetails.Query.Tables[i].Db = this.dbName;
          }
          for (var i = 0; i < this.queryDetails.Query.Procedures?.length; i++) {
            if (!this.queryDetails.Query.Procedures[i].DB) this.queryDetails.Query.Procedures[i].DB = this.dbName;
          }
        }

        if (this.queryExample) {
          this.getExplain();
        }

        this.queryInfo = data.Info;
        this.tables = this.queryDetails.Query.Tables?.filter(t => this.queryInfo[`${t.Db}.${t.Table}`] && this.queryInfo[`${t.Db}.${t.Table}`].Type === DBObjectType.TypeDBTable);
        this.views = this.queryDetails.Query.Tables?.filter(t => this.queryInfo[`${t.Db}.${t.Table}`] && this.queryInfo[`${t.Db}.${t.Table}`].Type === DBObjectType.TypeDBView);

        this.selectTableInfo('', '');
        this.selectProcedureInfo('', '');
        this.selectViewInfo('', '');
      })
      .finally(() => {
        this.isQueryInfoLoading = false
      })
  }

  selectTableInfo(dbName: string, tblName: string) {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.statusTableError = '';
    this.indexTableError = '';
    this.createTableError = '';

    if (dbName === '' && this.tables?.length > 0) {
      dbName = this.tables[0].Db;
    }
    if (tblName === '') {
      tblName = this.defaultTable();
    }
    this.dbTblNames = `\`${dbName}\`.\`${tblName}\``;

    const info = this.queryInfo && (this.queryInfo[`${dbName}.${tblName}`] as QueryInfo);
    if (!info) return;

    this.tableInfo = info;
    this.statusTable = info.Status;
    this.indexTable = info.Index;
    try {
      this.createTable = hljs.highlight('sql', info.Create).value;
    } catch (e) { }

    if (info.hasOwnProperty('Errors') && info['Errors'].length > 0) {
      for (const err of info['Errors']) {
        if (err.startsWith('SHOW TABLE STATUS')) {
          this.statusTableError = err;
        }
        if (err.startsWith('SHOW INDEX FROM')) {
          this.indexTableError = err;
        }
        if (err.startsWith('SHOW CREATE TABLE')) {
          this.createTableError = err;
        }
      }
    }
  }

  selectProcedureInfo(dbName: string, procedureName: string) {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.createProcedureError = '';

    let [defaultDB, defaultProcedure] = this.defaultProcedure();
    if (dbName === '') {
      dbName = defaultDB;
    }
    if (procedureName === '') {
      procedureName = defaultProcedure;
    }
    this.dbProcedureNames = `\`${dbName}\`.\`${procedureName}\``;

    const info = this.queryInfo && (this.queryInfo[`${dbName}.${procedureName}`] as QueryInfo);
    if (!info) return;
    this.procedureInfo = info;
    try {
      this.createProcedure = hljs.highlight('sql', info.Create).value;
    } catch (e) { }

    if (info.hasOwnProperty('Errors') && info['Errors'].length > 0) {
      for (const err of info['Errors']) {
        if (err.startsWith('SHOW CREATE PROCEDURE')) {
          this.createProcedureError = err;
        }
      }
    }
  }

  selectViewInfo(dbName: string, viewName: string) {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.createViewError = '';

    if (dbName === '' && this.views?.length > 0) {
      dbName = this.views[0].Db;
    }
    if (viewName === '') {
      viewName = this.defaultView();
    }
    this.dbViewNames = `\`${dbName}\`.\`${viewName}\``;

    const info = this.queryInfo && (this.queryInfo[`${dbName}.${viewName}`] as QueryInfo);
    if (!info) return;

    this.viewInfo = info;
    try {
      this.createView = hljs.highlight('sql', info.Create).value;
    } catch (e) { }

    if (info.Errors?.length > 0) {
      for (const err of info.Errors) {
        if (err.startsWith('SHOW CREATE TABLE')) {
          this.createViewError = err;
        }
      }
    }
  }

  addDBTable() {
    if (this.newDBTblNames.length > 6) {
      const part = this.newDBTblNames.split('.');
      const db = part[0].replace(/`/g, '');
      const tbl = part[1].replace(/`/g, '');
      if (this.queryDetails.Query.Tables === null) {
        this.queryDetails.Query.Tables = [];
      }
      if (this.queryDetails.Query.Tables.some((t) => t.Db === db && t.Table === tbl)) {
        return false
      }
      this.queryDetails.Query.Tables.push({Db: db, Table: tbl});
      this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
      this.dbTblNames = this.newDBTblNames;
      this.queryDetailsService.getQueryInfo(
        this.dbServer.Agent.UUID,
        this.dbServer.UUID,
        [{ Db: db, Table: tbl }],
        []
      )
        .then(data => {
          this.appendQueryInfo(data);
          this.tables = this.queryDetails.Query.Tables?.filter(t => this.queryInfo[`${t.Db}.${t.Table}`] && this.queryInfo[`${t.Db}.${t.Table}`].Type === DBObjectType.TypeDBTable);
          this.selectTableInfo(db, tbl);
        })
      this.newDBTblNames = '';
    }
    return false;
  }

  addDBProcedure() {
    if (this.newDBProcedureNames.length > 6) {
      const part = this.newDBProcedureNames.split('.');
      const db = part[0].replace(/`/g, '');
      const name = part[1].replace(/`/g, '');
      if (this.queryDetails.Query.Procedures === null) {
        this.queryDetails.Query.Procedures = [];
      }
      if (this.queryDetails.Query.Procedures.some((t) => t.DB === db && t.Name === name)) {
        return false
      }
      this.queryDetails.Query.Procedures.push({ DB: db, Name: name });
      this.queryDetailsService.updateProcedures(this.queryDetails.Query.Id, this.queryDetails.Query.Procedures);
      this.dbProcedureNames = this.newDBProcedureNames;
      this.queryDetailsService.getQueryInfo(
        this.dbServer.Agent.UUID,
        this.dbServer.UUID,
        [],
        [{ DB: db, Name: name }]
      )
        .then(data => {
          this.appendQueryInfo(data);
          this.selectProcedureInfo(db, name);
        })
      this.newDBProcedureNames = '';
    }
    return false;
  }

  addDBView() {
    if (this.newDBViewNames.length > 6) {
      const part = this.newDBViewNames.split('.');
      const db = part[0].replace(/`/g, '');
      const name = part[1].replace(/`/g, '');
      if (this.queryDetails.Query.Tables === null) {
        this.queryDetails.Query.Tables = [];
      }
      if (this.queryDetails.Query.Tables.some((t) => t.Db === db && t.Table === name)) {
        return false
      }
      this.queryDetails.Query.Tables.push({ Db: db, Table: name });
      this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
      this.dbViewNames = this.newDBViewNames;
      this.queryDetailsService.getQueryInfo(
        this.dbServer.Agent.UUID,
        this.dbServer.UUID,
        [{ Db: db, Table: name }],
        []
      )
        .then(data => {
          this.appendQueryInfo(data);
          this.views = this.queryDetails.Query.Tables?.filter(t => this.queryInfo[`${t.Db}.${t.Table}`] && this.queryInfo[`${t.Db}.${t.Table}`].Type === DBObjectType.TypeDBView);
          this.selectViewInfo(db, name);
        })
      this.newDBViewNames = '';
    }
    return false;
  }

  appendQueryInfo(data: QueryInfoResult) {
    data && data.Info && Object.keys(data.Info).forEach(k => {
      this.queryInfo[k] = data.Info[k];
    })
  }

  removeDBTable(dbTableItem) {
    const len = this.queryDetails.Query.Tables?.length;
    for (let i = 0; i < len; i++) {
      try {
        if (this.queryDetails.Query.Tables[i].Db === dbTableItem.Db
          && this.queryDetails.Query.Tables[i].Table === dbTableItem.Table) {
          this.queryDetails.Query.Tables.splice(i, 1);
        }
      } catch (e) {
        console.error(e);
      }
    }
    this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
    this.tables = this.queryDetails.Query.Tables?.filter(t => this.queryInfo[`${t.Db}.${t.Table}`] && this.queryInfo[`${t.Db}.${t.Table}`].Type === DBObjectType.TypeDBTable);
  }

  removeDBProcedure(dbProcedureItem) {
    const len = this.queryDetails.Query.Procedures?.length;
    for (let i = 0; i < len; i++) {
      try {
        if (this.queryDetails.Query.Procedures[i].DB === dbProcedureItem.DB
          && this.queryDetails.Query.Procedures[i].Name === dbProcedureItem.Name) {
          this.queryDetails.Query.Procedures.splice(i, 1);
        }
      } catch (e) {
        console.error(e);
      }
    }
    this.queryDetailsService.updateProcedures(this.queryDetails.Query.Id, this.queryDetails.Query.Procedures);
  }

  removeDBView(dbTableItem) {
    const len = this.queryDetails.Query.Tables?.length;
    for (let i = 0; i < len; i++) {
      try {
        if (this.queryDetails.Query.Tables[i].Db === dbTableItem.Db
          && this.queryDetails.Query.Tables[i].Table === dbTableItem.Table) {
          this.queryDetails.Query.Tables.splice(i, 1);
        }
      } catch (e) {
        console.error(e);
      }
    }
    this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
    this.views = this.queryDetails.Query.Tables?.filter(t => this.queryInfo[`${t.Db}.${t.Table}`] && this.queryInfo[`${t.Db}.${t.Table}`].Type === DBObjectType.TypeDBView);
  }

  isSelectedDbTbl(item): boolean {
    return `\`${item.Db}\`.\`${item.Table}\`` === this.dbTblNames;
  }

  isSelectedDbProcedure(item): boolean {
    return `\`${item.DB}\`.\`${item.Name}\`` === this.dbProcedureNames;
  }

  isSelectedDbView(item): boolean {
    return `\`${item.Db}\`.\`${item.Table}\`` === this.dbViewNames;
  }

  private setDefaultDB() {
    if (this.queryDetails.Example.Db) this.dbName = this.queryDetails.Example.Db;

    for (var i = 0; this.dbName && i < this.queryDetails.Query.Tables?.length; i++) {
      if (!this.queryDetails.Query.Tables[i].Db) this.queryDetails.Query.Tables[i].Db = this.dbName
    }

    for (var i = 0; this.dbName && i < this.queryDetails.Query.Procedures?.length; i++) {
      if (!this.queryDetails.Query.Procedures[i].DB) this.queryDetails.Query.Procedures[i].DB = this.dbName
    }
  }

  private defaultTable(): string {
    if (this.tables?.length > 0) {
      return this.tables[0].Table;
    }

    return '';
  }

  private defaultProcedure(): [string, string] {
    if (this.queryDetails.hasOwnProperty('Query')
      && this.queryDetails.Query.hasOwnProperty('Procedures')
      && this.queryDetails.Query.Procedures !== null
      && this.queryDetails.Query.Procedures.length > 0) {
      return [this.queryDetails.Query.Procedures[0].DB, this.queryDetails.Query.Procedures[0].Name];
    }

    return ['', ''];
  }

  private defaultView(): string {
    if (this.views?.length > 0) {
      return this.views[0].Table;
    }

    return '';
  }
}
