import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    controller = app.get(AppController);
  });

  it('should return health status', () => {
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
