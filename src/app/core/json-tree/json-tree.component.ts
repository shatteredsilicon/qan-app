import {Component, Input, OnChanges, ElementRef} from '@angular/core';

declare var renderjson: any;

@Component({
  selector: 'app-json-tree',
  templateUrl: './json-tree.component.html',
  styleUrls: ['./json-tree.component.scss']
})

export class JSONTreeComponent implements OnChanges {
  public element: ElementRef;
  public isCollapsed = true;

  @Input() public json: any;

  constructor(element: ElementRef) {
    this.element = element;
    renderjson.set_icons('+', '-');
  }

  ngOnChanges() {
    this.isCollapsed = true;
    this.resetJson();
  }

  public toggleAll() {
    this.isCollapsed = !this.isCollapsed;
    this.resetJson();
  }

  public resetJson() {
    renderjson.set_show_to_level(this.isCollapsed ? '' : 'all');

    this.element.nativeElement.querySelector('#json-viewer').innerHTML = '';
    this.element.nativeElement.querySelector('#json-viewer').appendChild(renderjson(this.json));
  }
}


