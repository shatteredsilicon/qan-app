import { TestBed, inject } from '@angular/core/testing';

import { RDSService } from './rds.service';

describe('RDSService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RDSService]
    });
  });

  it('should ...', inject([RDSService], (service: RDSService) => {
    expect(service).toBeTruthy();
  }));
});
