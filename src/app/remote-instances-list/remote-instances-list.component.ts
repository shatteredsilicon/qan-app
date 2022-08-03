import {Component, OnInit} from '@angular/core';
import {RemoteInstancesListService, ClientRegion} from './remote-instances-list.service';
import {NodeInstance, NodeInstanceService} from '../add-remote-instances/add-remote-instance.service';
import {environment} from '../environment';
import {AddAmazonRDSService} from '../add-amazon-rds/add-amazon-rds.service';

@Component({
  selector: 'app-remote-instances-list',
  templateUrl: './remote-instances-list.component.html',
  styleUrls: ['./remote-instances-list.component.scss']
})
export class RemoteInstancesListComponent implements OnInit {
  public allInstances: NodeInstance[] = [];
  public path: string[] = ['instance']; // same variable as for the loop that generates the table rows
  order = 1;
  isSorted = false;
  isRegion = false;
  isDemo = false;
  isLoading: boolean;
  errorMessage: string;

  constructor(private remoteInstancesListService: RemoteInstancesListService, private awsService: AddAmazonRDSService) {
    this.isDemo = environment.demoHosts.includes(location.hostname);
  }

  async ngOnInit() {
    this.errorMessage = '';
    this.isLoading = true;
    try {
      this.allInstances = await this.remoteInstancesListService.getList();
      this.allInstances?.forEach(instance => instance.collapsed = true);
    } catch (err) {
      this.errorMessage = err.json().error;
      this.isLoading = false;
      return;
    }
    this.errorMessage = this.allInstances === undefined ? 'The list of instances is empty' : '';
    this.isLoading = false;
  }

  async disableInstance(index: number, node: NodeInstance) {
    if (this.isDemo) {
      return false;
    }
    this.isLoading = false;
    const text = `Are you sure you want to delete ${node.name}? This will delete all services and data of ${node.name}`;
    if (confirm(text)) {
      try {
        const res = await this.remoteInstancesListService.disable(node);
        this.allInstances.splice(index, 1);
      } catch (err) {
        this.errorMessage = err.json().error;
        this.isLoading = false;
        return;
      }
      this.errorMessage = !this.allInstances?.length ? 'The list of instances is empty' : '';
      this.isLoading = false;
    }
  }

  async disableService(node: string, service: NodeInstanceService, serviceIndex: number) {
    if (this.isDemo) {
      return false;
    }

    this.isLoading = false;
    const text = `Are you sure you want to delete ${service.type} of ${node}?`;
    if (confirm(text)) {
      try {
        const res = await this.remoteInstancesListService.disableService(node, service);
        for (var i = 0; i < this.allInstances?.length; i++) {
          if (this.allInstances[i].name != node) continue;

          if (this.allInstances[i]?.services?.length > 1) {
            this.allInstances[i].services.splice(serviceIndex, 1);
          } else {
           this.allInstances.splice(i, 1);
          }

          break
        }
      } catch (err) {
        this.errorMessage = err.json().error;
        this.isLoading = false;
        return;
      }
      this.errorMessage = this.allInstances === undefined ? 'The list of instances is empty' : '';
      this.isLoading = false;
    }
  }

  sortInstances(prop: string) {
    this.path = prop.split('.');
    this.order = this.order * (-1); // change order
    this.isSorted = true;
    this.isRegion = prop === 'node.region';
  }

  public toggleCollapse(index: number) {
    this.allInstances[index].collapsed = !this.allInstances[index].collapsed;
  }
}
