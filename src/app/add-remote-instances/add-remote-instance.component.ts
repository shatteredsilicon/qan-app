import {Component, OnInit} from '@angular/core';
import {AddRemoteInstanceService, RemoteInstanceCredentials} from './add-remote-instance.service'
import {environment} from '../environment';
import {Router} from '@angular/router';

const instanceMap: {
  [key: string]: {
    name: string
    port: number
  }
} = {
  postgresql: {
    name: 'PostgreSQL',
    port: 5432
  },
  mysql: {
    name: 'MySQL',
    port: 3306
  },
  snmp: {
    name: 'SNMP',
    port: 161
  }
}

@Component({
  selector: 'app-add-remote-postgres',
  templateUrl: './add-remote-instance.component.html',
  styleUrls: ['./add-remote-instance.component.scss']
})
export class AddRemoteInstanceComponent implements OnInit {

  remoteInstanceCredentials = {
    snmpVersion: "",
    snmpAuthProtocol: "",
    snmpPrivProtocol: "",
    snmpSecurityLevel: ""
  } as RemoteInstanceCredentials;
  snmpVersion: string = '';
  snmpSecurityLevel: string = '';
  snmpCommunity: string;
  errorMessage: string;
  isLoading = false;
  isSubmitted = false;
  instance: { name: string, port: number };
  currentUrl: string;

  private snmpDefaultCommunity: 'public';

  constructor(public addRemoteInstanceService: AddRemoteInstanceService, private router: Router) {
    this.currentUrl = this.router.url;
  }

  async ngOnInit() {
    this.errorMessage = '';
    this.isLoading = false;
    this.instance = instanceMap[this.addRemoteInstanceService.checkInstanceType(this.currentUrl)]
  }

  async onSubmit(form) {
    const currentUrl = `${window.parent.location}`;
    const newURL = currentUrl.split('/graph/d/').shift() + '/graph/d/ssm-list/';

    this.errorMessage = '';
    this.isSubmitted = true;
    if (!form.valid) { return; }
    this.isLoading = true;

    if (this.remoteInstanceCredentials.name === undefined || this.remoteInstanceCredentials.name === '') {
      this.remoteInstanceCredentials.name = this.remoteInstanceCredentials.address; // set default value for name (like address)
    }

    if (this.remoteInstanceCredentials.port === undefined || this.remoteInstanceCredentials.port === '') {
      this.remoteInstanceCredentials.port = this.instance.port.toString(); // set default value for port
    }

    if (this.instance.name === 'SNMP' && !this.remoteInstanceCredentials.snmpCommunity) {
      this.remoteInstanceCredentials.snmpCommunity = this.snmpDefaultCommunity;
    }

    try {
      const res = await this.addRemoteInstanceService.enable(this.remoteInstanceCredentials, this.currentUrl)
        .then(() => {
          window.parent.location.assign(newURL);
        });

    } catch (err) {
      if ('status' in err && err.status >= 400 && err.status < 500 && 'error' in err && ('message' in err.error || 'msg' in err.error)) {
        this.errorMessage = err.error.message || err.error.msg;
      } else {
        this.errorMessage = "Server can't fulfill this request";
      }
    }
    this.isLoading = false;
  }
}
