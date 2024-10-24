import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { InstanceService } from '../core/instance.service';
import { CoreComponent, QueryParams } from '../core/core.component';
import { MySQLQueryDetailsService, QueryDetails, UserSource, Table, DBObjectType, QueryInfo, QueryInfoResult } from './mysql-query-details.service';
import * as hljs from 'highlight.js';
import * as vkbeautify from 'vkbeautify';
import * as moment from 'moment';
import { MomentFormatPipe } from '../shared/moment-format.pipe';

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
  public userSources: Array<UserSource> = [];
  public queryInfo: { [k: string]: QueryInfo } | null;
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
  isUserSourceLoading: boolean;
  isFirstSeen: boolean;
  firstSeen: string;
  lastSeen: string;
  accordionIds = {
    serverSummary: ['metrics-table'],
    querySection: ['query-fingerprint'],
    explainSection: ['classic-explain'],
    tableSection: ['table-create'],
    procedureSection: ['procedure-create'],
    viewSection: ['view-create'],
    userSourceSection: ['user-source-list']
  };

  createTableError: string;
  statusTableError: string;
  indexTableError: string;
  jsonExplainError: string;
  classicExplainError: string;
  visualExplainError: string;
  createProcedureError: string;
  createViewError: string;
  userSourceError: string;
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
    const dbServerIDs = this.dbServers.map(s => s.UUID);
    if (['TOTAL', undefined].indexOf(this.queryParams.queryID) !== -1) {
      this.isSummary = true;
      this.getServerSummary(dbServerIDs, this.fromUTCDate, this.toUTCDate);
    } else {
      this.isSummary = false;
      this.accordionIds = {
        serverSummary: ['metrics-table'],
        querySection: ['query-fingerprint'],
        explainSection: ['classic-explain'],
        tableSection: ['table-create'],
        procedureSection: ['procedure-create'],
        viewSection: ['view-create'],
        userSourceSection: ['user-source-list']
      };
      this.getQueryDetails(dbServerIDs, this.queryParams.queryID, this.fromUTCDate, this.toUTCDate);
    }
  }

  /**
   * Fix beautify dispalying text, will be delete after approve https://github.com/vkiryukhin/vkBeautify/pull/25
   * @param {string} text
   * @returns {string}
   */
  fixBeautifyText(text: string): string {
      return vkbeautify.sql(
        text
          .replace(/^EXPLAIN /i, "explain ")
          .replace(/(['"])(?:\1|.*?[^\\]\1)|(\W)?(UNION(\W+)((?:ALL|DISTINCT)\W+)?SELECT)(\W)?/ig, (str, _, g2, g3, g4, g5, g6) => {
            return g3 ? ((g2 ? g2.trim() : '') + `~::~UNION ${g4.trim()}${ g5 ? g5.toUpperCase().trim() : '' }~::~SELECT ` + ( g6 ? g6.trim() : '')) : str;
          })
      )
        .replace('explain', 'EXPLAIN ')
        .replace('  ', ' ');
  }

  async getQueryDetails(dbServerUUIDs: string[], queryID, from, to: string) {
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
      this.queryDetails = await this.queryDetailsService.getQueryDetails(dbServerUUIDs, queryID, from, to);
      this.dbServer = this.dbServers.find(dbServer => dbServer.UUID === this.queryDetails.InstanceId);
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
      this.getUserSources(dbServerUUIDs, queryID, from, to);
    } catch (err) {
      console.error(err);
    }
  }

  async getServerSummary(dbServerUUIDs: string[], from: string, to: string) {
    this.dbName = this.dbTblNames = '';
    try {
      this.queryDetails = await this.queryDetailsService.getSummary(dbServerUUIDs, from, to) as QueryDetails;
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
    const maxExampleBytes = 20480;
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
        const explainError = JSON.parse(this.dataExplain['Error'])
        if (explainError && typeof explainError === 'object' && 'Type' in explainError && explainError['Type'] === 'visual') {
          this.visualExplainError = 'This type of query is not supported for VISUAL EXPLAIN';
        } else {
          throw new Error(this.dataExplain['Error']);
        }
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

        // append underlying tables/views
        Object.entries(this.queryInfo).forEach(([key, item]) => {
          if (this.queryDetails.Query.Tables?.some(t => `${t.Db}.${t.Table}` === key)) {
            return;
          }

          const dbTable = key.split('.');
          const db = dbTable.length > 1 ? dbTable[0] : this.dbName;
          const table = dbTable.length > 1 ? dbTable[1] : dbTable[0];
          item.Type === DBObjectType.TypeDBTable && this.tables.push({ Db: db, Table: table })
          item.Type === DBObjectType.TypeDBView && this.views.push({ Db: db, Table: table })
        })

        this.selectTableInfo('', '');
        this.selectProcedureInfo('', '');
        this.selectViewInfo('', '');
      })
      .finally(() => {
        this.isQueryInfoLoading = false
      })
  }

  getUserSources(dbServerUUIDs: string[], queryID, from, to: string) {
    if (!this.dbServer) { return; }

    this.isUserSourceLoading = true;

    this.queryDetailsService.getUserSources(
      dbServerUUIDs,
      queryID,
      from,
      to
    )
      .then(data => {
        this.userSources = data;
      })
      .catch(() => {
        this.userSourceError = "Can't get list of user sources";
      })
      .finally(() => {
        this.isUserSourceLoading = false
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

  downloadReport() {
    const momentFormatPipe = new MomentFormatPipe();
    const date = momentFormatPipe.transform(moment.utc(), 'YYYY-MM-DDTHH:mm:ss');
    const filename = `ssm-${this.dbServer.Name}-${date}-query-${this.queryParams.queryID}-report.json`;
    const data = {
      'Query': this.queryDetails?.Example?.Query,
      'Explain': this.classicExplain,
      'Tables': this.tables?.map(table => {
        return {
          'Db': table.Db,
          'Table': table.Table,
          'Create': this.queryInfo[`${table.Db}.${table.Table}`]?.Create,
          'Index': this.queryInfo[`${table.Db}.${table.Table}`]?.Index
        };
      }),
      'Views': this.views?.map(view => {
        return {
          'Db': view.Db,
          'Name': view.Table,
          'Create': this.queryInfo[`${view.Db}.${view.Table}`]?.Create,
          'Index': this.queryInfo[`${view.Db}.${view.Table}`]?.Index
        }
      }),
      'Prodecures': this.queryDetails.Query.Procedures?.map(procedure => {
        return {
          'Db': procedure.DB,
          'Name': procedure.Name,
          'Create': this.queryInfo[`${procedure.DB}.${procedure.Name}`]?.Create,
          'Index': this.queryInfo[`${procedure.DB}.${procedure.Name}`]?.Index
        }
      })
    };
    const blob = new Blob([JSON.stringify(data, null, 4)], {type: "application/json"});
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
