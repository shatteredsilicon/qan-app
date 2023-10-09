import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';

export interface QanMessage {
  Content: string;
};

@Injectable()
export class QueryProfileService {

  private headers = new HttpHeaders({'Content-Type': 'application/json'});

  constructor(private httpClient: HttpClient) {
  }

  public async getQueryProfile(dbServerUUID, begin, end: string,
                               offset = 0, search = '', first_seen, sortBy = ''): Promise<{}> {
    const url = `/qan-api/qan/profile/${dbServerUUID}`;
    const searchValue = btoa(
      search.replace(/%([0-9A-F]{2})/g,
        (match, p1) => String.fromCharCode(Number('0x' + p1)))
    );
    const params = new HttpParams()
      .set('begin', begin)
      .set('end', end)
      .set('offset', String(offset))
      .set('first_seen', String(!!first_seen))
      .set('search', searchValue)
      .set('sort_by', sortBy);

    return await this.httpClient
      .get(url, {headers: this.headers, params: params})
      .toPromise();
  }

  public async getQanMessages(agentUUID, dbServerUUID: string): Promise<any> {
      const url = `/qan-api/agents/${agentUUID}/cmd`;

      const params = {
        AgentUUID: agentUUID,
        Service: 'qan',
        Cmd: 'GetMessages',
        Data: btoa(dbServerUUID)
      };

      return this.httpClient
        .put(url, params)
        .toPromise()
        .then(response => JSON.parse(atob(response['Data'])) as QanMessage[]);
  }
}
