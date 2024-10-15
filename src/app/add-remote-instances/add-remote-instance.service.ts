import {Injectable} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';

export interface RemoteInstanceCredentials {
  address: string;
  name: string;
  port: string;
  username: string;
  password: string;
  snmpVersion: string;
  snmpSecurityLevel: string;
  snmpAuthProtocol: string;
  snmpPrivProtocol: string;
  snmpPrivPassword: string;
  snmpContext: string;
  snmpCommunity: string;
}

export interface NodeInstanceService {
  id: number
  type: string;
  region: string;
  address: string;
  port: number;
  engine: string;
  engine_version: string;
}

export interface NodeInstance {
  name: string;
  services: NodeInstanceService[];
  collapsed: boolean;
  health_alerts_enabled: boolean;
}

const urlInstanceMap = {
  '/add-remote-mysql': 'mysql',
  '/add-remote-postgres': 'postgresql',
  '/add-remote-snmp': 'snmp'
}

@Injectable()
export class AddRemoteInstanceService {

  private headers = new HttpHeaders({'Content-Type': 'application/json'});
  instanceUrlPart: string;

  constructor(private http: HttpClient) {
  }

  async enable(remoteInstanceCredentials: RemoteInstanceCredentials, currentUrl: string): Promise<{}> {
    this.instanceUrlPart = this.checkInstanceType(currentUrl);

    const url = `/managed/v0/${this.instanceUrlPart}`;
    const data = {
      address: remoteInstanceCredentials.address,
      name: remoteInstanceCredentials.name,
      port: remoteInstanceCredentials.port,
      username: remoteInstanceCredentials.username,
      password: remoteInstanceCredentials.password,
    };
    if (this.instanceUrlPart === 'snmp') {
      data["version"] = remoteInstanceCredentials.snmpVersion;
      data["community"] = remoteInstanceCredentials.snmpCommunity;
      data["security_level"] = remoteInstanceCredentials.snmpSecurityLevel;
      data["auth_protocol"] = remoteInstanceCredentials.snmpAuthProtocol;
      data["priv_protocol"] = remoteInstanceCredentials.snmpPrivProtocol;
      data["priv_password"] = remoteInstanceCredentials.snmpPrivPassword;
      data["context_name"] = remoteInstanceCredentials.snmpContext;
    }
    return await this.http
      .post(url, data, {headers: this.headers})
      .toPromise();
  }

  /**
   * Returns type of remote instance
   * @param currentUrl current page url
   */
  checkInstanceType(currentUrl: string) {
    return urlInstanceMap[currentUrl];
  }
}
