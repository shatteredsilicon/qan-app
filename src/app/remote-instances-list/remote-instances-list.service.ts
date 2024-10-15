import {Injectable} from '@angular/core';
import {NodeInstance, NodeInstanceService} from '../add-remote-instances/add-remote-instance.service';
import {HttpClient, HttpHeaders} from '@angular/common/http';

export const ClientRegion = "client"

@Injectable()
export class RemoteInstancesListService {
  private headers = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {
  }

  async getList(): Promise<NodeInstance[]> {
    const url = `/managed/v0/nodes`;
    const response = await this.http
      .get(url, { headers: this.headers })
      .toPromise();
    return response['instances'] as NodeInstance[];
  }

  async disable(node: NodeInstance): Promise<{}> {
    const url = `/managed/v0/nodes/${node.name}`;
    return await this.http
      .delete(url, {headers: this.headers})
      .toPromise();
  }

  async disableService(node: string, service: NodeInstanceService): Promise<{}> {
    const url = `/managed/v0/nodes/${node}/services`
    return await this.http
      .delete(url, { headers: this.headers, body: { id: service.id, type: service.type } })
      .toPromise();
  }

  async disableHealthAlerts(node: NodeInstance): Promise<{}> {
    const url = `/managed/v0/nodes/${node.name}/health-alerts`;
    return await this.http
      .put(url, { enabled: false }, {headers: this.headers})
      .toPromise();
  }

  async putHealthAlerts(node: NodeInstance, enabled: boolean): Promise<{}> {
    const url = `/managed/v0/nodes/${node.name}/health-alerts`;
    return await this.http
      .put(url, { enabled: enabled }, {headers: this.headers})
      .toPromise();
  }
}
