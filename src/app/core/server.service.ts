import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';

export interface ServerInfo {
  version: string;
  release_date: string | null;
}

@Injectable()
export class ServerService {
  private versionURL = '/configurator/v1/version';
  public serverInfo: ServerInfo;
  public init: boolean = false;
  constructor(private httpClient: HttpClient) { }

  public getServerInfo(): Promise<void | ServerInfo> {
    return this.httpClient.get(this.versionURL)
      .toPromise()
      .then((response: ServerInfo) => {
        this.serverInfo = response;
        this.init = true;
        return response;
      })
      .catch(err => console.log(err));
  }
}
