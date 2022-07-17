import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';

export interface RDSNode {
  name: string;
  region: string;
}

export interface RDSService {
  address: string;
  port: number;
  engine: string;
  engine_version: string;
}

export interface RDSAgent {
  qan_db_instance_uuid: string;
}

export interface RDSInstance {
  node: RDSNode;
  service: RDSService;
  agent: RDSAgent;
}

@Injectable()
export class RDSService {
  private instancesUrl = '/managed/v0/rds';
  public rdsInstances: Array<RDSInstance> = [];
  public init: boolean = false;
  constructor(private httpClient: HttpClient) { }

  public getRDSInstances(): Promise<void | RDSInstance[]> {
    return this.httpClient.get(this.instancesUrl)
      .toPromise()
      .then((response: any) => {
        this.rdsInstances = response['instances'] as RDSInstance[];
        this.init = true;
        return this.rdsInstances;
      })
      .catch(err => console.log(err));
  }
}
