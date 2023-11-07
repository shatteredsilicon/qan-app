import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';

export enum DBObjectType {
  TypeDBTable = 0,
  TypeDBProcedure,
  TypeDBView
}

export interface Table {
  Db: string
  Table: string
}

export interface Procedure {
  DB: string
  Name: string
}

export interface QueryInfo {
  Type: DBObjectType
  Create: string
  Status: any
  Index: any
  Errors: Array<string>
}

export interface QueryInfoResult {
  GuessDB: GuessDB | null;
  Info: { [k: string]: QueryInfo } | null;
}

export interface QueryClass {
  Id: string;
  Abstract: string;
  Fingerprint: string;
  Tables: Array<Table> | null;
  Procedures: Array<Procedure> | null;
  FirstSeen: string;
  LastSeen: string;
  Status: string;
};

export interface ExplainRow {
  Id:           number | null;
  SelectType:   string | null;
  Table:        string | null;
  Partitions:   string | null;
  CreateTable:  string | null;
  Type:         string | null;
  PossibleKeys: string | null;
  Key:          string | null;
  KeyLen:       string | null;
  Ref:          string | null;
  Rows:         number | null;
  Filtered:     number | null;
  Extra:        string | null;
}

export interface QueryExample {
  QueryId: string;
  InstanceUUID: string;
  Period: string;
  Ts: string;
  Db: string;
  QueryTime: number;
  Query: string;
  Explain: { String: string } | string;
};

export interface GuessDB {
  DB: string;
  IsAmbiguous: boolean;
}

export interface QueryDetails {
  InstanceId: string;
  Begin: string;
  End: string;
  Query: QueryClass;
  Example: QueryExample;
  Metrics2: {};
  Sparks2: Array<{}>;
};

export interface ServerSummary {
  InstanceId: string;
  Begin: string;
  End: string;
  Metrics2: {};
  Sparks2: Array<{}>;
};

@Injectable()
export class MySQLQueryDetailsService {

  private headers = new HttpHeaders({'Content-Type': 'application/json'});

  constructor(private httpClient: HttpClient) {
  }

  public async getQueryDetails(dbServerUUID, queryUUID, begin, end: string): Promise<QueryDetails> {
    const url = `/qan-api/qan/report/${dbServerUUID}/query/${queryUUID}`;
    const params = new HttpParams()
      .set('begin', begin)
      .set('end', end);

    const response = await this.httpClient
      .get(url, {headers: this.headers, params: params})
      .toPromise();
    return response as QueryDetails;
  }

  public async getSummary(dbServerUUID: string, begin: string, end: string): Promise<ServerSummary> {
    const url = `/qan-api/qan/report/${dbServerUUID}/server-summary`;

    const params = new HttpParams()
      .set('begin', begin)
      .set('end', end);

    const response = await this.httpClient
      .get(url, {headers: this.headers, params: params})
      .toPromise();
    return response as ServerSummary;
  }

  getQueryInfo(agentUUID: string, dbServerUUID: string, tables: Array<Table>, procedures: Array<Procedure>) {
    const url = `/qan-api/agents/${agentUUID}/cmd`;

    const data = {
      UUID: dbServerUUID,
      Table: tables,
      Index: tables,
      Status: tables,
      Procedure: procedures,
    };

    const params = {
      AgentUUID: agentUUID,
      Service: 'query',
      Cmd: 'QueryInfo',
      Data: btoa(JSON.stringify(data))
    };

    return this.httpClient
      .put(url, params)
      .toPromise()
      .then(response => JSON.parse(atob(response['Data'])) as QueryInfoResult);
  }

  getExplain(agentUUID: string, dbServerUUID: string, dbName: string, query: string, withExplain: string) {
    const url = `/qan-api/agents/${agentUUID}/cmd`;
    const data = {
      UUID: dbServerUUID,
      Db: dbName,
      Query: query,
      Convert: true,  // agent will convert if not SELECT and MySQL <= 5.5 or >= 5.6 but no privs
      WithExplainRows: withExplain ? JSON.parse(withExplain) as ExplainRow[] : []
    };

    const params = {
      AgentUUID: agentUUID,
      Service: 'query',
      Cmd: 'Explain',
      Data: btoa(JSON.stringify(data))
    };

    return this.httpClient
      .put(url, params)
      .toPromise()
      .then(response => response);
  }

  updateTables(queryID: string, dbTables: Array<{}>) {
    const url = `/qan-api/queries/${queryID}/tables`;
    return this.httpClient
      .put(url, dbTables)
      .toPromise()
      .then(resp => console.log(resp));
  }

  updateProcedures(queryID: string, dbProcedures: Array<Procedure>) {
    const url = `/qan-api/queries/${queryID}/procedures`;
    return this.httpClient
      .put(url, dbProcedures)
      .toPromise()
      .then(resp => console.log(resp));
  }
}
