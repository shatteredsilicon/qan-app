import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { InstanceService } from '../core/instance.service';
import { CoreComponent, QueryParams } from '../core/core.component';
import { PostgreSQLQueryDetailsService, QueryDetails, Table, Procedure, DBObjectType, QueryInfo, QueryInfoResult } from './postgresql-query-details.service';
import * as hljs from 'highlight.js';
import * as beautify from 'beautify';
import moment from 'moment';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { HumanizePipe } from '../shared/humanize.pipe';
import { FormsModule } from '@angular/forms';
import { MapToIterablePipe } from '../shared/map-to-iterable.pipe';
import { JSONTreeComponent } from '../core/json-tree/json-tree.component';
import { ClipboardModule } from 'ngx-clipboard';

@Component({
  selector: 'app-query-details',
  templateUrl: './postgresql-query-details.component.html',
  styleUrls: ['./postgresql-query-details.component.scss'],
  imports: [NgbModule, NgIf, NgFor, NgClass, HumanizePipe, FormsModule, MapToIterablePipe, JSONTreeComponent, ClipboardModule]
})
export class PostgreSQLQueryDetailsComponent extends CoreComponent implements OnInit {

  protected queryID: string;
  public queryDetails: QueryDetails;
  public tables: Array<Table> = [];
  public views: Array<Table> = [];
  public procedures: Array<Procedure> = [];
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
  public textExplain;
  public jsonExplain;
  public jsonExplainString;
  public dataExplain;
  public dbName: string;
  public dbTblNames: string;
  public dbProcedureNames: string;
  public dbViewNames: string;
  public isTableSchemaGuessed: boolean;
  public isViewSchemaGuessed: boolean;
  public isProcedureSchemaGuessed: boolean;
  public isExplainSchemaGuessed: boolean;
  protected newDBTblNames: string;
  protected newDBProcedureNames: string;
  protected newDBViewNames: string;
  isSummary: boolean;
  isLoading: boolean;
  isExplainLoading: boolean;
  isCopied = {
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
    explainSection: ['text-explain'],
    tableSection: ['table-create'],
    procedureSection: ['procedure-create'],
    viewSection: ['view-create'],
  };

  createTableError: string;
  statusTableError: string;
  indexTableError: string;
  jsonExplainError: string;
  textExplainError: string;
  createProcedureError: string;
  createViewError: string;
  event = new Event('showSuccessNotification');

  constructor(protected route: ActivatedRoute,
              protected router: Router,
              protected instanceService: InstanceService,
              protected queryDetailsService: PostgreSQLQueryDetailsService) {
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
        explainSection: ['text-explain'],
        tableSection: ['table-create'],
        procedureSection: ['procedure-create'],
        viewSection: ['view-create']
      };
      this.getQueryDetails(dbServerIDs, this.queryParams.queryID, this.fromUTCDate, this.toUTCDate);
    }
  }

  async getQueryDetails(dbServerUUIDs: string[], queryID, from, to: string) {
    this.isLoading = true;
    this.dbName = this.dbTblNames = '';
    this.dbProcedureNames = '';
    this.dbViewNames = '';
    this.tables = [];
    this.views = [];
    this.procedures = [];
    this.statusTable = this.indexTable = this.createTable = this.createProcedure = this.createView = '';
    this.statusTableError = this.indexTableError = this.createTableError = this.createProcedureError = this.createViewError = '';
    this.queryExample = '';
    this.isTableSchemaGuessed = false;
    this.isViewSchemaGuessed = false;
    this.isProcedureSchemaGuessed = false;
    this.jsonExplainError = this.textExplainError = '';
    this.jsonExplain = this.jsonExplainString = this.textExplain = '';
    try {
      this.queryDetails = await this.queryDetailsService.getQueryDetails(dbServerUUIDs, queryID, from, to);
      this.dbServer = this.dbServers.find(dbServer => dbServer.UUID === this.queryDetails.InstanceId);
      this.firstSeen = moment(this.queryDetails.Query.FirstSeen).calendar(null, {sameElse: 'lll'});
      this.lastSeen = moment(this.queryDetails.Query.LastSeen).calendar(null, {sameElse: 'lll'});
      this.fingerprint = hljs.highlight('sql', beautify.sql(this.queryDetails.Query.Fingerprint)).value;
      if (this.queryDetails !== null && this.queryDetails.Example !== null && this.queryDetails.Example.Query !== '') {
        this.queryExample = hljs.highlight('sql', beautify.sql(this.queryDetails.Example.Query)).value;
      }
      this.isFirstSeen = moment.utc(this.queryDetails.Query.FirstSeen).valueOf() > moment.utc(this.fromUTCDate).valueOf();
      this.isLoading = false;

      this.setDefaultDB();
      this.getQueryInfo();
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
    const agentUUID = this.dbServer.Agent.UUID;
    const dbServerUUID = this.dbServer.UUID;
    this.isExplainSchemaGuessed = false;
    this.textExplainError = '';
    this.jsonExplainError = '';
    const query = this.queryDetails.Example.Query;
    const maxExampleBytes = 20480;
    if (query.length >= maxExampleBytes) {
      this.jsonExplainError = `
        Cannot explain truncated query.
        This query was truncated to maximum size of ${maxExampleBytes} bytes.
      `;
      this.textExplainError = this.jsonExplainError;
      this.isExplainLoading = false;
      return
    }

    let hasAmbiguousSchema: boolean = false;
    const guessedSchemas: { [k: string]: string } = {};
    Object.entries(this.queryInfo).forEach(([key, item]) => {
      if (item.Type === DBObjectType.TypeDBProcedure) return;
        const names = key.split('.');
        const schema = names.length > 1 ? names[0] : '';
        const name = names.length > 1 ? names[1] : names[0];
        if (schema && item.GuessSchema) {
          guessedSchemas[name] = schema;
          if (item.GuessSchema.IsAmbiguous) hasAmbiguousSchema = true;
        }
    });

    try {
      this.dataExplain = await this.queryDetailsService.getExplain(agentUUID, dbServerUUID, this.dbName, query, guessedSchemas);
      if (this.dataExplain.hasOwnProperty('Error') && this.dataExplain['Error'] !== '') {
        const explainError = JSON.parse(this.dataExplain['Error'])
        throw new Error(this.dataExplain['Error']);
      }
      this.dataExplain = JSON.parse(atob(this.dataExplain.Data));
      this.textExplain = this.dataExplain.TEXT;
      try {
        this.jsonExplain = JSON.parse(this.dataExplain.JSON);
        this.jsonExplainString = JSON.stringify(this.jsonExplain);
      } catch (err) {
        this.jsonExplainError = err.message;
      }
      if (this.dataExplain.hasOwnProperty('IsSchemaGuessed') && this.dataExplain['IsSchemaGuessed'] && hasAmbiguousSchema) {
        this.isExplainSchemaGuessed = true;
      }
    } catch (err) {
      this.textExplainError = this.jsonExplainError = 'This type of query is not supported for EXPLAIN';
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
      this.dbName,
      this.queryDetails.Query.Tables ? this.queryDetails.Query.Tables : [],
      this.queryDetails.Query.Procedures ? this.queryDetails.Query.Procedures : [],
      this.queryDetails?.Example?.Query || ''
    )
      .then(data => {
        this.queryInfo = data.Info;

        if (this.queryExample && !data.SkipExplain) {
          this.getExplain();
        }

        const tables = [];
        const views = [];
        const procedures = [];

        // append underlying tables/views
        Object.entries(this.queryInfo).forEach(([key, item]) => {
          const names = key.split('.');
          const schema = names.length > 1 ? names[0] : '';
          const name = names.length > 1 ? names[1] : names[0];
          item.Type === DBObjectType.TypeDBTable && tables.push({ Db: schema, Table: name });
          item.Type === DBObjectType.TypeDBView && views.push({ Db: schema, Table: name });
          item.Type === DBObjectType.TypeDBProcedure && procedures.push({ DB: schema, Name: name })
        });

        this.tables = tables;
        this.views = views;
        this.procedures = procedures;
        this.queryDetails.Query.Procedures = [...procedures];
        this.queryDetails.Query.Tables = [...tables, ...views];

        this.selectTableInfo('', '');
        this.selectProcedureInfo('', '');
        this.selectViewInfo('', '');
      })
      .finally(() => {
        this.isQueryInfoLoading = false
      })
  }

  selectTableInfo(schema: string, table: string) {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.statusTableError = '';
    this.indexTableError = '';
    this.createTableError = '';

    if (!schema && !table && this.tables.length > 0) {
      schema = this.tables[0].Db;
      table = this.tables[0].Table;
    }
    this.dbTblNames = `\`${schema}\`.\`${table}\``;

    const info = this.queryInfo && (this.queryInfo[`${schema}.${table}`] as QueryInfo);
    if (!info) return;
    this.isTableSchemaGuessed = info.GuessSchema?.IsAmbiguous
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

  selectProcedureInfo(schema: string, procedure: string) {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.createProcedureError = '';

    if (!schema && !procedure && this.procedures.length > 0) {
      schema = this.procedures[0].DB;
      procedure = this.procedures[0].Name;
    }
    this.dbProcedureNames = `\`${schema}\`.\`${procedure}\``;

    const info = this.queryInfo && (this.queryInfo[`${schema}.${procedure}`] as QueryInfo);
    if (!info) return;
    this.isProcedureSchemaGuessed = info.GuessSchema?.IsAmbiguous;
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

  selectViewInfo(schema: string, view: string) {
    if (!this.dbServer || !this.dbServer.Agent) { return; }

    this.createViewError = '';

    if (!schema && !view && this.views.length > 0) {
      schema = this.views[0].Db;
      view = this.views[0].Table;
    }
    this.dbViewNames = `\`${schema}\`.\`${view}\``;

    const info = this.queryInfo && (this.queryInfo[`${schema}.${view}`] as QueryInfo);
    if (!info) return;
    this.isViewSchemaGuessed = info.GuessSchema?.IsAmbiguous;
    this.viewInfo = info;
    try {
      this.createView = hljs.highlight('sql', beautify.sql(info.Create)).value;
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
      const schema = part[0].replace(/`/g, '');
      const tbl = part[1].replace(/`/g, '');
      if (this.queryDetails.Query.Tables === null) {
        this.queryDetails.Query.Tables = [];
      }
      if (this.queryDetails.Query.Tables.some((t) => t.Db === schema && t.Table === tbl)) {
        return false
      }
      this.queryDetails.Query.Tables.push({Db: schema, Table: tbl});
      this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
      this.dbTblNames = this.newDBTblNames;
      this.queryDetailsService.getQueryInfo(
        this.dbServer.Agent.UUID,
        this.dbServer.UUID,
        this.dbName,
        [{ Db: schema, Table: tbl }],
        [],
        ''
      )
        .then(data => {
          this.appendQueryInfo(data);
          this.tables.push({ Db: schema, Table: tbl });
          this.selectTableInfo(schema, tbl);
        })
      this.newDBTblNames = '';
    }
    return false;
  }

  addDBProcedure() {
    if (this.newDBProcedureNames.length > 6) {
      const part = this.newDBProcedureNames.split('.');
      const schema = part[0].replace(/`/g, '');
      const name = part[1].replace(/`/g, '');
      if (this.queryDetails.Query.Procedures === null) {
        this.queryDetails.Query.Procedures = [];
      }
      if (this.queryDetails.Query.Procedures.some((t) => t.DB === schema && t.Name === name)) {
        return false
      }
      this.queryDetails.Query.Procedures.push({ DB: schema, Name: name });
      this.queryDetailsService.updateProcedures(this.queryDetails.Query.Id, this.queryDetails.Query.Procedures);
      this.dbProcedureNames = this.newDBProcedureNames;
      this.queryDetailsService.getQueryInfo(
        this.dbServer.Agent.UUID,
        this.dbServer.UUID,
        this.dbName,
        [],
        [{ DB: schema, Name: name }],
        ''
      )
        .then(data => {
          this.appendQueryInfo(data);
          this.procedures.push({ DB: schema, Name: name });
          this.selectProcedureInfo(schema, name);
        })
      this.newDBProcedureNames = '';
    }
    return false;
  }

  addDBView() {
    if (this.newDBViewNames.length > 6) {
      const part = this.newDBViewNames.split('.');
      const schema = part[0].replace(/`/g, '');
      const name = part[1].replace(/`/g, '');
      if (this.queryDetails.Query.Tables === null) {
        this.queryDetails.Query.Tables = [];
      }
      if (this.queryDetails.Query.Tables.some((t) => t.Db === schema && t.Table === name)) {
        return false
      }
      this.queryDetails.Query.Tables.push({ Db: schema, Table: name });
      this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
      this.dbViewNames = this.newDBViewNames;
      this.queryDetailsService.getQueryInfo(
        this.dbServer.Agent.UUID,
        this.dbServer.UUID,
        this.dbName,
        [{ Db: schema, Table: name }],
        [],
        ''
      )
        .then(data => {
          this.appendQueryInfo(data);
          this.views.push({ Db: schema, Table: name });
          this.selectViewInfo(schema, name);
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
    try {
      this.queryDetails.Query.Tables = this.queryDetails.Query.Tables.filter((t => t.Db !== dbTableItem.Db || t.Table !== dbTableItem.Table));
      this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
      this.tables = this.tables.filter((t => t.Db !== dbTableItem.Db || t.Table !== dbTableItem.Table));
      delete this.queryInfo[`${dbTableItem.Db}.${dbTableItem.Table}`];
    } catch (e) {
      console.error(e);
    }
  }

  removeDBProcedure(dbProcedureItem) {
    try {
      this.queryDetails.Query.Procedures = this.queryDetails.Query.Procedures.filter((t => t.DB !== dbProcedureItem.DB || t.Name !== dbProcedureItem.Name));
      this.queryDetailsService.updateProcedures(this.queryDetails.Query.Id, this.queryDetails.Query.Procedures);
      this.procedures = this.procedures.filter((t => t.DB !== dbProcedureItem.DB || t.Name !== dbProcedureItem.Name));
      delete this.queryInfo[`${dbProcedureItem.DB}.${dbProcedureItem.Name}`];
    } catch (e) {
      console.error(e);
    }
  }

  removeDBView(dbTableItem) {
    try {
      this.queryDetails.Query.Tables = this.queryDetails.Query.Tables.filter((t => t.Db !== dbTableItem.Db || t.Table !== dbTableItem.Table));
      this.queryDetailsService.updateTables(this.queryDetails.Query.Id, this.queryDetails.Query.Tables);
      this.views = this.views.filter((t => t.Db !== dbTableItem.Db || t.Table !== dbTableItem.Table));
      delete this.queryInfo[`${dbTableItem.Db}.${dbTableItem.Table}`];
    } catch (e) {
      console.error(e);
    }
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
  }
}
